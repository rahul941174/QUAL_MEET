import http from "http";
import {Server} from "socket.io";
import  jwt from "jsonwebtoken";
import {env} from "./config/env";
import { JwtPayload } from "@qualmeet/shared";

export function createServer(){
    const httpServer=http.createServer();

    const io=new Server(httpServer,{
        cors:{
            origin:'*'
        }
    });


    //verifying jwt for webscoket connection
    io.use((socket,next)=>{
        try{
            const token = socket.handshake.auth?.token;

            if (!token || typeof token !== "string") {
                return next(new Error("UNAUTHORIZED"));
            }

            const decoded = jwt.verify(token, env.JWT_PUBLIC_KEY, {
                algorithms: ["RS256"]
            }) as JwtPayload;

            socket.data.user = {
                userId: decoded.userId,
                email: decoded.email,
                fullName: decoded.fullName
            };

            return next();
        }
        catch(err){
            return next(new Error("UNAUTHORIZED"));
        }
    });


    //connection guards
    const ipConnections=new Map<string,number>();
    const userConnections=new Map<string,number>();

    const MAX_IP_CONNECTIONS=20;
    const MAX_USER_SOCKETS=3;

    function getClientIp(socket:any):string{
        return socket.handshake.address || "unknown";
    }

    io.use((socket,next)=>{
        const ip=getClientIp(socket);
        const userId=socket.data.user?.userId;

        if(!userId){
            return next(new Error("UNAUTHORIZED"));
        }

        const ipCount=ipConnections.get(ip) ?? 0;
        if(ipCount >= MAX_IP_CONNECTIONS){
            return next(new Error("RATE_LIMITED"));
        }

        const userCount=userConnections.get(userId) ?? 0;
        if(userCount>= MAX_USER_SOCKETS){
            return next(new Error("TOO_MANY_CONNECTIONS"));
        }

        //increment counts
        ipConnections.set(ip,ipCount+1);
        userConnections.set(userId,userCount+1);

        //storing for cleaning up 
        socket.data._ip=ip;
        socket.data._userId=userId;

        next();
    })


    //helper function for wertc signaling event 
    function ensureInRoom(socket:any):string|null{
        return socket.data.roomId ?? null;
    }



    io.on("connection",(socket)=>{
        const userId=socket.data._userId;
        const ip=socket.data._ip;
        console.log("[auth] socket connected: ", socket.id,"user: ",userId);


        //===============Authorization check first============//
        //checking first if user is allowed to join room by calling room service authorize
        socket.on("join_room",async({roomId})=>{
            try{
                if(!roomId || typeof roomId !== "string"){
                    socket.emit("join_error",{message:"INVALID_ROOM_ID"});
                    return;
                }

                const userId=socket.data.user.userId;

                const response=await fetch(
                    `${process.env.ROOM_SERVICE_URL}/rooms/${roomId}/authorize`,
                    {
                        method:"POST",
                        headers:{
                            "x-user-id":userId
                        }
                    }
                );

                if(!response.ok){
                    socket.emit("join_error",{message:"NOT_AUTHORIZED"});
                    return;
                }

                const result=await response.json();


                //if Authorized then
                socket.join(roomId);
                socket.data.roomId=roomId;
                socket.data.role=result.role;


                socket.emit("join_success",{
                    roomId,
                    role:result.role
                });


                console.log("[room] joined: ", roomId,"user: ",userId,"role: ",result.role);
            }
            catch(error){
                console.error("[join room] error: ",error);
                socket.emit("join_error",{message:"INTERNAL_ERROR"});
            }
        })




        //================= WEBRTC SIGNALING EVENTS =========================//
       
        socket.on("webrtc-offer",(payload)=>{
            const roomId=ensureInRoom(socket);

            if(!roomId){
                socket.emit("signal_error",{message:"NOT_IN_ROOM"});
                return;
            }

            socket.to(roomId).emit("webrtc_offer",{
                from:socket.data.user.userId,
                sdp:payload.sdp
            });
        });


        socket.on("webrtc_answer",(payload)=>{
            const roomId=ensureInRoom(socket);

            if(!roomId){
                socket.emit("signal_error",{message:"NOT_IN_ROOM"});
                return;
            }

            socket.to(roomId).emit("webrtc_answer",{
                from:socket.data.user.userId,
                sdp:payload.sdp
            });
        });

        socket.on("webrtc_ice_candidate",(payload)=>{
            const roomId=ensureInRoom(socket);

            if(!roomId){
                socket.emit("signal_error",{message:"NOT_IN_ROOM"});
                return;
            }

            socket.to(roomId).emit("webrtc_ice_candidate",{
                from:socket.data.user.userId,
                candidate:payload.candidate
            });
        })







        socket.on("disconnect",(reason)=>{

            if(ip){
                const ipCount=ipConnections.get(ip) ?? 1;
                ipCount<=1 ? ipConnections.delete(ip) : ipConnections.set(ip,ipCount-1);
            }

            if(userId){
                const userCount=userConnections.get(userId) ?? 1;
                userCount<=1 
                    ? userConnections.delete(userId)
                    : userConnections.set(userId,userCount-1);
            }

            console.log("[socket] disconnected: ",
                    socket.id,
                    "user: ",
                    socket.data.user?.userId,
                    "reason: ",
                    reason
            );
        });
    });

    return {httpServer,io};
}
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./config/env";
import { JwtPayload } from "@qualmeet/shared";

export function createServer() {
    const httpServer = http.createServer();

    const io = new Server(httpServer, {
        cors: {
            origin: '*'
        }
    });

    //connection guards
    const ipConnections = new Map<string, number>();  //1 ip => max 20sockets (as in company multiple people can have same ip)
    const userConnections = new Map<string, number>();  //1 userId =>max 3 sockets

    const MAX_IP_CONNECTIONS = 20;
    const MAX_USER_SOCKETS = 3;


    //users in a room map for signaling
    const roomUsers=new Map<
        string,         //roomId
        Map<
            string, //socket.id
            {   
                socketId:string;
                userId:string;
                role:"HOST" | "GUEST";
                fullName:string;
                micEnabled:boolean;
                camEnabled:boolean;
                isScreenSharing:boolean;
            }
        >
    >();


    //verifying jwt for webscoket connection
    io.use((socket, next) => {
        try {
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
        catch (err) {
            return next(new Error("UNAUTHORIZED"));
        }
    });



    function getClientIp(socket: any): string {
        return socket.handshake.address || "unknown";
    }

    io.use((socket, next) => {
        const ip = getClientIp(socket);
        const userId = socket.data.user?.userId;

        if (!userId) {
            return next(new Error("UNAUTHORIZED"));
        }

        const ipCount = ipConnections.get(ip) ?? 0;
        if (ipCount >= MAX_IP_CONNECTIONS) {
            return next(new Error("RATE_LIMITED"));
        }

        const userCount = userConnections.get(userId) ?? 0;
        if (userCount >= MAX_USER_SOCKETS) {
            return next(new Error("TOO_MANY_CONNECTIONS"));
        }

        //increment counts
        ipConnections.set(ip, ipCount + 1);
        userConnections.set(userId, userCount + 1);

        //storing for cleaning up 
        socket.data._ip = ip;
        socket.data._userId = userId;

        next();
    })


    //helper function for wertc signaling event 
    function ensureInRoom(socket: any): string | null {
        return socket.data.roomId ?? null;
    }



    io.on("connection", (socket) => {
        const userId = socket.data._userId;
        const ip = socket.data._ip;
        console.log("[auth] socket connected: ", socket.id, "user: ", userId);


        //===============Authorization check first============//
        //checking first if user is allowed to join room by calling room service authorize
        socket.on("join_room", async ({ roomId }) => {
            try {

                console.log("Socket requesting to connect");

                if (!roomId || typeof roomId !== "string") {
                    socket.emit("join_error", { message: "INVALID_ROOM_ID" });
                    return;
                }

                const userId = socket.data.user.userId;

                const response = await fetch(
                    `${process.env.ROOM_SERVICE_URL}/rooms/${roomId}/authorize`,
                    {
                        method: "POST",
                        headers: {
                            "x-user-id": userId
                        }
                    }
                );

                if (!response.ok) {
                    socket.emit("join_error", { message: "NOT_AUTHORIZED" });
                    return;
                }

                const result = await response.json();

                let usersInRoom=roomUsers.get(roomId);
                if(!usersInRoom){
                    usersInRoom=new Map();
                    roomUsers.set(roomId,usersInRoom);
                }

                //adding current users to the roomId in usersMap
                usersInRoom.set(socket.id,{
                    socketId:socket.id,
                    userId,
                    role:result.role,
                    fullName:socket.data.user.fullName,
                    micEnabled:true,
                    camEnabled:true,
                    isScreenSharing:false,
                });


                //if Authorized then
                socket.join(roomId);
                socket.data.roomId = roomId;
                socket.data.role = result.role;

                socket.emit("join_success", {
                    roomId,
                    role: result.role,
                });


                //sending full user list to this user (to only one newly joined peer)
                socket.emit("room_users", Array.from(usersInRoom.values()));

                //notifying others that a a new user joined (to all the peers in the room except the new one)
                socket.to(roomId).emit("user_joined",{
                    socketId:socket.id,
                    userId,
                    role:result.role,
                    fullName:socket.data.user.fullName,
                });

                console.log("[room] joined: ", roomId, "user: ", userId, "role: ", result.role);
            }
            catch (error) {
                console.error("[join room] error: ", error);
                socket.emit("join_error", { message: "INTERNAL_ERROR" });
            }
        })


        socket.on("peer_ready",({roomId})=>{
             socket.to(roomId).emit("peer_ready",{
                socketId:socket.id
             });
        });

        //when a camera or mic state chnages (disable/enable)
        socket.on("media_state_changed",({micEnabled,camEnabled})=>{
            const roomId=socket.data.roomId;

            if(!roomId)
                return;

            const users=roomUsers.get(roomId);
            const user=users?.get(socket.id);

            if(user){
                user.micEnabled=micEnabled;
                user.camEnabled=camEnabled;
            }

            socket.to(roomId).emit("media_state_changed",{
                socketId:socket.id,
                micEnabled,
                camEnabled,
            });
        });


        socket.on("screen_share_start",()=>{
            const roomId=socket.data.roomId;

            if(!roomId)
                return;

            const usersInRoom=roomUsers.get(roomId);

            if(!usersInRoom)
                return;

            //Enforcing single presenter
            const someoneElseSharing=[...usersInRoom.values()].some(u=>u.isScreenSharing);

            if(someoneElseSharing){
                socket.emit("screen_share_denied");
                return;
            }

            const user=usersInRoom.get(socket.id);
            if(!user)
                return;

            user.isScreenSharing=true;

            io.to(roomId).emit("screen_share_started",{
                socketId:socket.id,
            });

            console.log("[screen] share started by ", socket.id);
        });

        socket.on("screen_share_stop",()=>{
            const roomId=socket.data.roomId;

            if(!roomId)
                return;

            const usersInRoom=roomUsers.get(roomId);

            if(!usersInRoom)
                return;

            const user=usersInRoom.get(socket.id);
            if(!user || !user.isScreenSharing)
                return;

            user.isScreenSharing=false;

            io.to(roomId).emit("screen_share_stopped",{
                socketId:socket.id,
            });

            console.log("[screen] share stopped by ",  socket.id);

        })



        //================= WEBRTC SIGNALING EVENTS =========================//

        socket.on("webrtc_offer", ({to,sdp}) => {
            const roomId = ensureInRoom(socket);

            console.log("Offer received from ",socket.id);

            if (!roomId) {
                socket.emit("signal_error", { message: "NOT_IN_ROOM" });
                return;
            }

            io.to(to).emit("webrtc_offer", {
                from: socket.id,
                sdp,
            });
        });


        socket.on("webrtc_answer", ({to,sdp}) => {
            const roomId = ensureInRoom(socket);

            console.log("Answer received from ",socket.id);

            if (!roomId) {
                socket.emit("signal_error", { message: "NOT_IN_ROOM" });
                return;
            }

            io.to(to).emit("webrtc_answer", {
                from: socket.id,
                sdp,
            });
        });

        socket.on("webrtc_ice_candidate", ({to,candidate}) => {
            const roomId = ensureInRoom(socket);

            console.log("ICE CANDIDATE received from ",socket.id);

            if (!roomId) {
                socket.emit("signal_error", { message: "NOT_IN_ROOM" });
                return;
            }

            io.to(to).emit("webrtc_ice_candidate", {
                from: socket.id,
                candidate,
            });
        })



        socket.on("leave_room",()=>{
            const roomId=socket.data.roomId;

            if(!roomId)
                return;

            const usersInRoom=roomUsers.get(roomId);

            if(!usersInRoom)
                return;

            const role=socket.data.role;

            //HOST leaves -> closing room for everyone
            if(role==="HOST"){
                io.to(roomId).emit("room_closed",{
                    roomId,
                    reason:"HOST_LEFT",
                });


                //disconnectiong everyone in the room
                for(const {socketId} of usersInRoom.values()){
                    io.sockets.sockets.get(socketId)?.disconnect(true);
                }

                roomUsers.delete(roomId);
                return;
            }


            //GUEST leaves 
            usersInRoom?.delete(socket.id);

            socket.leave(roomId);

            socket.to(roomId).emit("user_left",{
                socketId:socket.id,
            });

            if(usersInRoom?.size ===0){
                roomUsers.delete(roomId);
            }

            console.log("[leave room] socket left: ",socket.id);
        });



        socket.on("disconnect", (reason) => {

            if (ip) {
                const ipCount = ipConnections.get(ip) ?? 1;
                ipCount <= 1 ? ipConnections.delete(ip) : ipConnections.set(ip, ipCount - 1);
            }

            if (userId) {
                const userCount = userConnections.get(userId) ?? 1;
                userCount <= 1
                    ? userConnections.delete(userId)
                    : userConnections.set(userId, userCount - 1);
            }


            const roomId=socket.data.roomId;

            //if user is still sharing screen
            if(roomId && roomUsers.has(roomId)){
                const usersInRoom=roomUsers.get(roomId);

                const user=usersInRoom?.get(socket.id);

                if(user?.isScreenSharing){
                    socket.to(roomId).emit("screen_share_stopped",{
                        socketId:socket.id,
                    });
                }
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

    return { httpServer, io };
}
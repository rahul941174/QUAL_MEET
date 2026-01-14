import { useEffect,useState,useRef,Dispatch,SetStateAction } from "react";
import {io,Socket} from "socket.io-client";
import { RoomRole,JoinSuccessPayload, RoomParticipant } from "../types";

type AuthState="PENDING" | "AUTHORIZED" | "REJECTED";

const SIGNALING_URL=import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4003";

interface UseRoomSocketResult {
  authState: AuthState;
  role: RoomRole | null;
  socket: Socket | null;
}


export function useRoomSocket(
roomId: string | null, 
setParticipants:Dispatch<SetStateAction<RoomParticipant[]>>
):UseRoomSocketResult{

    const socketRef=useRef<Socket | null>(null);
    const [authState,setAuthState]=useState<AuthState>("PENDING");
    const [role,setRole]=useState<RoomRole | null>(null);

    useEffect(()=>{
        if(!roomId)
            return;

        const token=localStorage.getItem("auth_token");
        if(!token){
            setAuthState("REJECTED");
            return;
        }

        const socket=io(SIGNALING_URL || "", {
            auth: { token },
        });

        socketRef.current=socket;

        socket.emit("join_room",{roomId});

        socket.on("join_success",(payload:JoinSuccessPayload)=>{
            if(payload.role==="HOST" || payload.role==="GUEST"){
                setRole(payload.role);
                setAuthState("AUTHORIZED");
            }
            else{
                //defensive fallaback
                setAuthState("REJECTED");
            }
        });

        socket.on("room_users",(users:RoomParticipant[])=>{
            setParticipants(users);
        });

        socket.on("user_joined",(user:RoomParticipant)=>{
            setParticipants((prev)=>[...prev,user]);
        });


        socket.on("media_state_changed",({socketId,micEnabled,camEnabled})=>{
            setParticipants(prev=>
                prev.map(p=>
                    p.socketId===socketId
                    ? {...p, micEnabled,camEnabled}
                    : p
                )
            );
        });

        socket.on("screen_share_started",({socketId})=>{
            setParticipants(prev=>
                prev.map(p=>
                    p.socketId===socketId
                    ? {...p,isScreenSharing:true}
                    : {...p,isScreenSharing:false}
                )
            );
        });

        socket.on("screen_share_stopped",({socketId})=>{
            setParticipants(prev=>
                prev.map(p=>
                    p.socketId===socketId
                    ? {...p,isScreenSharing:false}
                    :p
                )
            );
        });

        socket.on("screen_share_denied",()=>{
            alert("Someone else is already sharing their screen");
        })

        socket.on("user_left",({socketId})=>{
            setParticipants((prev)=>
                prev.filter((p)=>p.socketId !== socketId)
            );
        });

        socket.on("room_closed",({reason})=>{
            console.warn("Room closed : ",reason);

            setAuthState("REJECTED");

            socket.disconnect();
        })

        socket.on("join_error",()=>{
            setAuthState("REJECTED");
        });

        socket.on("disconnect",()=>{
            console.log("[socket] disconnected");
        });

        return ()=>{
            socket.disconnect();
            socketRef.current=null;
        }
    },[roomId]);

    return {
        authState,
        role,
        socket: socketRef.current
    };
}
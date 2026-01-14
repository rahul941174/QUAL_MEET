import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import { useRoomSocket } from "./hooks/useRoomSocket";
import { useLocalMedia } from "./hooks/useLocalMedia";
import { usePeerConnection } from "./hooks/usePeerConnections";

import { RoomParticipant, VideoTileModel } from "./types";
import { RoomHeader } from "./components/RoomHeader";
import { VideoGrid } from "./components/VideoGrid";
import { ParticipantsList } from "./components/ParticipantsList";
import { ControleBar } from "./components/ControlBar";
import { leaveRoom } from "../../../api/rooms";

export default function RoomPage(){

    const {roomId}=useParams<{roomId:string}>();
    const navigate=useNavigate();

    const normalizedRoomId = roomId ?? null;

    const [participants,setParticipants]=useState<RoomParticipant[]>([]);

    //1.signaling and authorization
    const {authState,role,socket}=useRoomSocket(normalizedRoomId,setParticipants);

    //2.Local Media lifecycle
    const {cameraStream,
        activeVideoTrack,
        ready,
        error,
        micEnabled,
        camEnabled,
        isScreenSharing,
        toggleMic,
        toggleCamera,
        startScreenShare,
        stopScreenShare,
    }=useLocalMedia(socket);

    //3. creating RTC peer connection
    const {remotePeers,replaceVideoTrack}=usePeerConnection(socket, normalizedRoomId,cameraStream);

    const remoteTiles:VideoTileModel[]=remotePeers.map(peer=>{
        const participant=participants.find(p=>p.socketId===peer.socketId);

        return{
            socketId:peer.socketId,
            stream:peer.stream,
            label:participant?.fullName ?? participant?.userId ?? peer.socketId.substring(0,8),
            micEnabled:participant?.micEnabled ?? true,
            camEnabled:participant?.camEnabled ?? true,
            isScreen:participant?.isScreenSharing ?? false,
        }
    });


    //REJECT IF NOT AUTHORIZED
    useEffect(()=>{

        console.log("authState : ",authState);
        if(authState==="REJECTED"){
            navigate("/app",{replace:true});
        }
    },[authState,navigate]);




    useEffect(()=>{
        if(!socket)
            return;

        setParticipants(prev=>
            prev.map(p=>
                p.socketId==socket.id
                ? {...p,micEnabled,camEnabled}
                : p
            )
        );

        socket.emit("media_state_changed",{
            micEnabled,
            camEnabled,
        });
    },[micEnabled,camEnabled,socket]);


    //replacing video track
    useEffect(()=>{
        if(!activeVideoTrack)
            return;

        replaceVideoTrack(activeVideoTrack);
    },[activeVideoTrack,replaceVideoTrack]);


    const handleLeave=async()=>{
        if(!normalizedRoomId)
            return;

        try{

            //REST API (LEAVE ROOM => ROOM SERVICE)
            const result=await leaveRoom(normalizedRoomId);

            if("closed" in result ){
                console.log("Room closed by host");
            }
            else{
                console.log("User left: ",result.userId);
            }
            //websocket event
            socket?.emit("leave_room");

            //disconnect
            socket?.disconnect();

            //navigate
            navigate("/app");
        }
        catch(error){
            console.error("Failed to leave room ",error);
            navigate("/app");  //fail safe
        }
    }

    const handleToggleScreenShare=()=>{
        if(isScreenSharing){
            stopScreenShare();
        }
        else{
            startScreenShare();
        }
    };

    if (authState === "PENDING") {
        return (
        <div className="flex items-center justify-center h-full text-gray-400">
            Connecting to meeting…
        </div>
        );
    }

    if(error){
        return (
            <div className="flex items-center justify-center h-full text-gray-400">
                {error}
            </div>
        );
    }

    if(!ready || !cameraStream){
        return (
            <div className="flex items-center justify-center h-full text-gray-400">
                Connecting to camera & microphone…
            </div>
        );
    }


    return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      {/* Background Spotlight - Updated to canonical /3 (3% opacity) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-125 bg-gradient-radial from-white/3 to-transparent pointer-events-none" />

      <RoomHeader roomId={normalizedRoomId} role={role} />

      {/* Main Content Area */}
      <div className="flex flex-1 w-full overflow-hidden p-4 gap-4">
        <div className="flex-1 flex flex-col min-h-0">
          <VideoGrid
            localStream={cameraStream}
            localMicEnabled={micEnabled}
            localCamEnabled={camEnabled}
            remoteTiles={remoteTiles}
          />
        </div>

        {/* Sidebar hides on mobile to save space */}
        <aside className="hidden lg:block">
          <ParticipantsList participants={participants} />
        </aside>
      </div>

      <ControleBar
        micEnabled={micEnabled}
        camEnabled={camEnabled}
        onToggleMic={toggleMic}
        onToggleCam={toggleCamera}
        onLeave={handleLeave}

        isScreenSharing={isScreenSharing}
        onToggleScreenShare= {handleToggleScreenShare}
      />
    </div>
  );
}
import { useEffect,useRef,useState } from "react";
import { Socket } from "socket.io-client";
import { RoomParticipant } from "../types";


interface peerInfo{
    socketId:string;
    stream:MediaStream;
}


export function usePeerConnection(
    socket:Socket | null,
    roomId: string | null,
    localStream: MediaStream | null,
){

    const peersRef=useRef<Map<string,RTCPeerConnection>>(new Map());  //socketId
    const [remotePeers,setRemotePeers]=useState<peerInfo[]>([]);
    
    const pendingIceRef=useRef<Map<string,RTCIceCandidate[]>>(new Map());

    const replaceVideoTrack=(newTrack:MediaStreamTrack | null )=>{
        peersRef.current.forEach((pc)=>{
            const sender=pc.getSenders().find(s=>s.track?.kind==="video");

            if(!sender)
                return;

            sender.replaceTrack(newTrack);
        })
    }

    
    
    
    useEffect(()=>{
        if(!socket || !roomId || !localStream)
            return;


        const RTC_CONFIG:RTCConfiguration={
            iceServers:[
                {
                    urls:[
                        "stun:stun.l.google.com:19302",
                        "stun:stun.12connect.com:3478",
                        "stun:stun.12voip.com:3478",
                        "stun:stun.2talk.co.nz:3478",
                    ]
                }
            ]
        };

        //creating RTCPeerConnection
        //userId->peer id with whom we want to make the peer connection
        function createPeer(remoteSocketId:string,isInitiator:boolean){
            
            const pc=new RTCPeerConnection(RTC_CONFIG);

            console.log("Peer connection object created ",pc);

            //attaching local stream to peer connection object
            localStream?.getTracks().forEach(track=>
                pc.addTrack(track,localStream)
            );

            //receiving remote stream here(event listeners)
            pc.ontrack=(event)=>{
                setRemotePeers(prev=>{
                    if(prev.find(p=>p.socketId===remoteSocketId))
                        return prev;
                    return [...prev,{socketId:remoteSocketId,stream:event.streams[0]}];
                });
            };

            //exchanging ICE CANDIDATES(event listeners)
            pc.onicecandidate=(event)=>{
                if(event.candidate){
                    socket?.emit("webrtc_ice_candidate",{
                        roomId,
                        to:remoteSocketId,
                        candidate:event.candidate,
                    });
                }

                console.log("ICE CANDIDATE sent ", event.candidate);
            };

            pc.onconnectionstatechange = () => {
                console.log(`🔌 [peer] connection state:`, pc.connectionState, "→", remoteSocketId);
            };

            pc.oniceconnectionstatechange = () => {
                console.log(`❄️ [peer] ICE state:`, pc.iceConnectionState, "→", remoteSocketId);
                
                if (pc.iceConnectionState === 'failed') {
                    console.error("❌ [peer] ICE connection FAILED for:", remoteSocketId);
                }
            };

            pc.onsignalingstatechange = () => {
                console.log(`📶 [peer] signaling state:`, pc.signalingState, "→", remoteSocketId);
            };

            peersRef.current.set(remoteSocketId,pc);


            //this is for non initator peer(not sending offer,but receivng the offer from other peer) if ice candidates reach it before it create peer connection object so we store them in queue and later add it to peer connection object 
            const queued=pendingIceRef.current.get(remoteSocketId);
            if(queued){
                console.log("Applying queued Ice Candidates : ",queued.length);
                queued.forEach(c=>pc.addIceCandidate(new RTCIceCandidate(c)));
                pendingIceRef.current.delete(remoteSocketId);
            }


            if(isInitiator){
                (async()=>{
                    const offer=await pc.createOffer();

                    await pc.setLocalDescription(offer)

                    socket?.emit("webrtc_offer",{
                        roomId,
                        to:remoteSocketId,
                        sdp:offer,
                    });

                    console.log("Offer sent ",offer);
                })();
            }

            return pc;
        }


        //when a new user joined server broadcast this event to all the peers except the newly joined one all the info of new joined peer
        socket.on("peer_ready",({socketId})=>{
            if(!peersRef.current.has(socketId)){
                createPeer(socketId,true);
            }
        });

        //sent by server to only a newly joined socket the list of all the participants in the meeting
        socket.on("room_users", (users:RoomParticipant[]) => {
            users.forEach(({ socketId }) => {

                if(socketId===socket.id) //skips itself from participants list
                    return;

                if (!peersRef.current.has(socketId)) {
                    createPeer(socketId, false);
                }
            });
        });


        socket.on("webrtc_offer",async({from,sdp})=>{

            console.log(`Offer received from=> ${from} sdp =>${sdp}`)

            let pc=peersRef.current.get(from);

            if(!pc){
                console.error("Peer Connection Object not found for offer from ", from);
                pc=createPeer(from,false);
            }

            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer=await pc.createAnswer();
            await pc.setLocalDescription(answer);


            socket.emit("webrtc_answer",{
                roomId,
                to:from,
                sdp:pc.localDescription,
            });

            console.log("Answer sent ",answer);
        });

        socket.on("webrtc_answer",async({from,sdp})=>{
            const pc=peersRef.current.get(from);

            if(!pc)
                return;

            await pc.setRemoteDescription(new RTCSessionDescription(sdp));


            console.log("Answer received  ",sdp);
        });

        socket.on("webrtc_ice_candidate",({from,candidate})=>{


            console.log("ICE CANDIDATE received ", candidate);
            const pc=peersRef.current.get(from);

            if(!pc){
                const queue=pendingIceRef.current.get(from) ?? [];
                queue.push(candidate);
                pendingIceRef.current.set(from,queue);
                return;
            }
            pc.addIceCandidate(new RTCIceCandidate(candidate));
        });

        socket.on("user_left",({socketId})=>{
            const pc=peersRef.current.get(socketId);

            pc?.close();
            peersRef.current.delete(socketId);

            setRemotePeers(prev=> prev.filter(p=>p.socketId !== socketId));
        });


        socket.emit("peer_ready", { roomId });


        return ()=>{
            peersRef.current.forEach(pc=>pc.close());
            peersRef.current.clear();
            setRemotePeers([]);
        };

    },[socket,roomId,localStream]);


    return {remotePeers,replaceVideoTrack};
}
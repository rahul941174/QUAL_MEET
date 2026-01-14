import { useEffect,useRef } from "react";
import { PiMicrophoneSlashFill } from "react-icons/pi";

interface VideoTileProps{
    stream:MediaStream;
    muted?:boolean;
    micEnabled?:boolean;
    camEnabled?:boolean;
    label?:string;
}


export function VideoTile({
    stream,
    muted=false,
    micEnabled=true,
    camEnabled=true,
    label,
}:VideoTileProps){
    const videoRef=useRef<HTMLVideoElement | null>(null);

    useEffect(()=>{

        if(!videoRef.current) return;

        if(camEnabled){
            videoRef.current.srcObject=stream;
            videoRef.current.play().catch(()=>{});
        }else{
            videoRef.current.srcObject=null;
        }
    },[stream,camEnabled]);

    return (
        <div className="relative w-full h-full"> 
            {camEnabled ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={muted}
                    // object-cover is crucial here for the dynamic layout
                    className="w-full h-full object-cover"   
                />
            ):(
                <div className="w-full h-full flex items-center justify-center bg-black text-white text-3xl font-bold">
                    {label?.substring(0,3).toUpperCase()}
                </div>
            )}

            {/* Overlay */}
            <div className="absolute inset-0 pointer-events-none">
                {/* NAME */}
                {label && (
                    <div className="absolute bottom-3 left-3 text-xs font-semibold text-white bg-black/50 px-2 py-1 rounded">
                        {label}
                    </div>
                )}
            </div>

            {/* Mic muted indicator */}
            {!micEnabled && (
                <div className="absolute top-3 right-3 bg-black/60 p-1.5 rounded-full text-red-500 text-xs">
                    <PiMicrophoneSlashFill/>
                </div>
            )}
        </div>
    );
}
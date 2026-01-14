interface ControleBarProps{
    micEnabled:boolean;
    camEnabled:boolean;
    onToggleMic:()=>void;
    onToggleCam:()=>void;
    onLeave:()=>void;
    isScreenSharing:boolean;
    onToggleScreenShare:()=>void;
}


export function ControleBar({
    micEnabled,
    camEnabled,
    onToggleMic,
    onToggleCam,
    onLeave,
    isScreenSharing,
    onToggleScreenShare
}:ControleBarProps){

    return(
        <footer className="h-24 w-full border-t border-white/5 bg-[#0a0a0a]/60 backdrop-blur-xl flex items-center justify-center">
            <div className="flex items-center gap-6">
                <button
                onClick={onToggleMic}
                className={`w-12 h-12 rounded-full border flex items-center justify-center text-xs ${
                    micEnabled
                    ? "bg-white/5 border-white/10"
                    : "bg-red-500/20 border-red-500 text-red-400"
                }`}
                >
                Mic
                </button>

                <button
                onClick={onToggleCam}
                className={`w-12 h-12 rounded-full border flex items-center justify-center text-xs ${
                    camEnabled
                    ? "bg-white/5 border-white/10"
                    : "bg-red-500/20 border-red-500 text-red-400"
                }`}
                >
                Cam
                </button>

                <button
                    onClick={onToggleScreenShare}
                    className={`px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-widest ${
                    isScreenSharing
                    ? "bg-blue-500/20 border-blue-500 text-blue-400"
                    : "bg-white/5 border-white/10 text-gray-300"
                }`}
                >
                    {isScreenSharing ? "Stop Share" : "Share Screen"}
                </button>

                <button
                onClick={onLeave}
                className="px-6 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold text-xs uppercase tracking-widest"
                >
                End Call
                </button>
            </div>
        </footer>
    );
}
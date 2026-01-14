import { RoomParticipant } from "../types";

interface ParticipantListProps{
    participants:RoomParticipant[];
}


export function ParticipantsList({participants}:ParticipantListProps){

    return (
    <div className="w-80 h-full bg-[#0a0a0a] border border-white/5 rounded-3xl flex flex-col overflow-hidden shadow-inner">
        <div className="p-6 border-b border-white/5">
            <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Atmosphere</h3>
                <span className="text-[10px] font-mono text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    {participants.length} ONLINE
                </span>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {participants.map((p) => (
            <div key={p.socketId} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/5">
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-white/10 to-transparent flex items-center justify-center text-[10px] font-bold border border-white/5">
                {p.userId.substring(0, 3).toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">{p.fullName}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest">{p.role}</p>
                </div>
            </div>
            ))}
        </div>
    </div>
  );
}
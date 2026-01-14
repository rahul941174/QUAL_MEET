interface RoomHeaderProps{
    roomId: string | null;
    role: string | null;
}


export function RoomHeader({roomId,role}:RoomHeaderProps){

   return (
    <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a0a]/40 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-500 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Live
        </div>
        <div className="text-sm font-medium tracking-tight">
          <span className="text-gray-500">Room:</span> <span className="text-white ml-1 font-mono">{roomId}</span>
        </div>
      </div>

      <div className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
        Access level: <span className="text-white">{role}</span>
      </div>
    </div>
  );
}
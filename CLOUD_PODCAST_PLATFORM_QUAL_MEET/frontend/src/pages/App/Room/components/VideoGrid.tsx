import { VideoTile } from "./VideoTile";
import { VideoTileModel } from "../types";

interface VideoGridProps{
    localStream:MediaStream;
    localMicEnabled:boolean;
    localCamEnabled:boolean;
    remoteTiles:VideoTileModel[];
}


export function VideoGrid({
    localStream,
    localMicEnabled,
    localCamEnabled,
    remoteTiles,
}:VideoGridProps){



  const screenTile = remoteTiles.find(t => t.isScreen);

  const showScreenLayout = Boolean(screenTile);

  if (showScreenLayout) {
    return (
      <div className="h-full w-full flex gap-4 p-4">
        
        {/* MAIN STAGE */}
        <div className="flex-1 rounded-3xl overflow-hidden border border-white/10">
          <VideoTile
            stream={screenTile!.stream}
            micEnabled={screenTile!.micEnabled}
            camEnabled={true}
            label={screenTile!.label + " (Screen)"}
          />
        </div>

        {/* SIDE STRIP */}
        <div className="w-64 flex flex-col gap-3 overflow-y-auto">
          
          {/* Local camera */}
          <div className="aspect-video rounded-xl overflow-hidden border border-white/10">
            <VideoTile
              stream={localStream}
              muted
              micEnabled={localMicEnabled}
              camEnabled={localCamEnabled}
              label="YOU"
            />
          </div>

          {/* Other participants */}
          {remoteTiles
            .filter(t => !t.isScreen)
            .map(p => (
              <div
                key={p.socketId}
                className="aspect-video rounded-xl overflow-hidden border border-white/10"
              >
                <VideoTile
                  stream={p.stream}
                  micEnabled={p.micEnabled}
                  camEnabled={p.camEnabled}
                  label={p.label}
                />
              </div>
            ))}
        </div>
      </div>
    );
  }

  

    const participantsCount = 1 + remoteTiles.length;

  /**
   * Enterprise Logic: Determine column count based on count
   * 1-2 people: 1 or 2 columns
   * 3-4 people: 2 columns (creates a nice 2x2 for 4, or 2+1 for 3)
   * 5-6 people: 3 columns
   * 7+ people: 4 columns
   */
  const getGridCols = () => {
    if (participantsCount === 1) return "grid-cols-1";
    if (participantsCount <= 4) return "grid-cols-2";
    if (participantsCount <= 9) return "grid-cols-3";
    return "grid-cols-4";
  };

  // We use a helper to maintain the shared styles for tiles
  const tileWrapperClass = "relative aspect-video rounded-3xl overflow-hidden bg-[#0a0a0a] border border-white/5 hover:border-white/20 transition-all duration-500 shadow-xl w-full";

  return (
    <div className="h-full w-full flex items-center justify-center p-2">
      <div className={`grid ${getGridCols()} gap-4 w-full max-w-7xl mx-auto overflow-y-auto custom-scrollbar p-2 items-center justify-items-center`}>
        
        {/* Local Video Tile */}
        <div className={tileWrapperClass}>
          <VideoTile 
            stream={localStream}
            muted 
            micEnabled={localMicEnabled}
            camEnabled={localCamEnabled}
            label="YOU"
        />
        </div>

        {/* Remote Video Tiles */}
        {remoteTiles.map((p) => (
          <div key={p.socketId} className={tileWrapperClass}>
            <VideoTile 
                stream={p.stream}
                micEnabled={p.micEnabled}
                camEnabled={p.camEnabled}
                label={p.label}    
            />
          </div>
        ))}
      </div>
    </div>
  );
}
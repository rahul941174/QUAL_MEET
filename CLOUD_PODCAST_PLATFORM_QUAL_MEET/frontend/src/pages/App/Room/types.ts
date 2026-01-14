export type RoomRole="HOST" |"GUEST";

export interface RoomParticipant{
    socketId:string;
    userId:string;
    role:RoomRole;
    fullName?:string;

    micEnabled:boolean;
    camEnabled:boolean;
    isScreenSharing:boolean;
}

export interface JoinSuccessPayload{
    roomId:string;
    role:string;
}

export interface VideoTileModel {
  socketId: string;
  stream: MediaStream;
  label: string;
  micEnabled:boolean;
  camEnabled:boolean;
  isScreen?:boolean;
}

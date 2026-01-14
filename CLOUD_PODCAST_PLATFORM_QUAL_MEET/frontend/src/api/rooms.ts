import { apiRequest } from "./client";

interface CreateRoomResponse{
    roomId:string;
}

interface RoomInfo{
    roomId: string;
    hostId: string;
    isActive: boolean;
    maxParticipants: number;
    participantCount: number;
    createdAt: string;
}


interface JoinRoomResponse {
    roomId:string;
    userId:string;
    role:"HOST" | "GUEST";
    joinedAt:string;
}

interface HostLeftResponse{
    roomId:string;
    closed:true;
    reason:"HOST_LEFT";
}
interface GuestLeftResponse{
    roomId:string;
    userId:string;
    leftAt:string;
}

type LeaveRoomResponse=HostLeftResponse | GuestLeftResponse;

export async function createRoom(): Promise<CreateRoomResponse>{
    return apiRequest<CreateRoomResponse>("/api/rooms",{
        method:"POST",
        auth:true
    });
}

export async function getRoom(roomId:string):Promise<RoomInfo>{
    return apiRequest<RoomInfo>(`/api/rooms/${roomId}`,{
        method:"GET",
        auth:true,
    });
}

export async function joinRoom(roomId: string): Promise<JoinRoomResponse> {
  return apiRequest<JoinRoomResponse>(`/api/rooms/${roomId}/join`, {
    method: "POST",
    auth: true,
  });
}

export async function leaveRoom(roomId: string): Promise<LeaveRoomResponse> {
  return apiRequest<LeaveRoomResponse>(`/api/rooms/${roomId}/leave`, {
    method: "POST",
    auth: true,
  });
}
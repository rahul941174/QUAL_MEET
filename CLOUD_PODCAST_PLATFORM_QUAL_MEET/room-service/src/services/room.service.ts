import {prisma} from "../db/prisma";
import { randomUUID } from "crypto";

interface CreateRoomInput {
  hostId: string;
  maxParticipants?: unknown;
}


interface JoinRoomInput{
  roomId:string;
  userId:string;
}


interface LeaveRoomInput{
  roomId:string;
  userId:string;
}

export async function createRoom(input: CreateRoomInput) {
  const { hostId, maxParticipants } = input;

  const capacity =
    typeof maxParticipants === "number" ? maxParticipants : 4;

  const roomId=randomUUID();

  const [room] = await prisma.$transaction([
    prisma.meeting.create({
      data: {
        roomId,
        hostId,
        maxParticipants: capacity,
        isActive: true,
      },
    }),

    //adding host to room_participant table as soon as he creates a meeting
    prisma.roomParticipant.create({
      data:{
        roomId,
        userId:hostId,
        role:'HOST',
      }
    })
  ]);

  return {
    id: room.id,
    roomId: room.roomId,
    hostId: room.hostId,
    maxParticipants: room.maxParticipants,
    isActive: room.isActive,
    createdAt: room.createdAt,
  };
}




export async function joinRoom(input:JoinRoomInput){

  const {roomId,userId}=input;

  return prisma.$transaction(async(tx)=>{

    //1. check if meeting exist and then get meeting details
    const room=await tx.meeting.findUnique({
      where:{roomId},
    });

    if(!room){
      throw new Error("ROOM_NOT_FOUND");
    }

    if(!room.isActive){
      throw new Error("ROOM_INACTIVE");
    }


    //2. checking if user is not already joined in the room (checking unique abse on both room id and userid because @@unique([roomId,userId]))
    const existing=await tx.roomParticipant.findUnique({
      where:{
        roomId_userId:{
          roomId,
          userId,
        },
      },
    });


    if(existing){
      return {
        roomId: existing.roomId,
        userId: existing.userId,
        role: existing.role,
        joinedAt: existing.joinedAt,
      };
    }


    //3.capacity check of room (if more particpant allowed)
    const currentCount=await tx.roomParticipant.count({
      where:{roomId},
    })

    if(currentCount >= room.maxParticipants){
      throw new Error("ROOM_FULL");
    }

    //4.Add particpant in the room
    const participant=await tx.roomParticipant.create({
      data:{
        roomId,
        userId,
        role:'GUEST',
      },
    });


    return {
      roomId:participant.roomId,
      userId:participant.userId,
      role:participant.role,
      joinedAt:participant.joinedAt,
    };
  });
}



export async function leaveRoom(input:LeaveRoomInput){

  const {roomId,userId}=input;

  return await prisma.$transaction(async(tx)=>{


    const room =await tx.meeting.findUnique({
      where:{roomId},
    });

    if(!room){
      throw new Error("ROOM_NOT_FOUND");
    }

    const participant=await tx.roomParticipant.findUnique({
      where:{
        roomId_userId:{
          roomId,
          userId,
        }
      }
    });

    if(!participant){
      throw new Error("NOT_IN_ROOM");
    }


    //if HOST leaves we close the meeting (phase 1)
    if(participant.role==='HOST'){
        await tx.roomParticipant.deleteMany({
          where:{roomId},
        });

        await tx.meeting.update({
          where:{roomId},
          data:{
            isActive:false,
          }
        });

        return {
          roomId,
          closed:true,
          reason:"HOST_LEFT"
        };
    }

  // if guest leaves 
    await tx.roomParticipant.delete({
      where:{
        roomId_userId:{
          roomId,
          userId,
        }
      }
    });


    return {
      roomId,
      userId,
      leftAt:new Date(),
    };
  });
}



export async function getRoomById(roomId:string){
  const room=await prisma.meeting.findUnique({
    where:{roomId},
  });

  if(!room){
    throw new Error("ROOM_NOT_FOUND");
  }


  const participantCount=await prisma.roomParticipant.count({
    where:{roomId},
  });


  return {
    roomId:room.roomId,
    hostId:room.hostId,
    isActive:room.isActive,
    maxParticipants:room.maxParticipants,
    participantCount,
    createdAt:room.createdAt,
  };
}




//called from signaling service to verify room exists,isactive,user a particpant before opening a websocket conenction
export async function authorizeRoomAccess(roomId:string,userId:string){

  const room=await prisma.meeting.findUnique({
    where:{roomId},
  });

  if( !room){
      throw new Error("ROOM_NOT_EXIST");
  }
  if( !room.isActive){
      throw new Error("ROOM_NOT_ACTIVE");
  }

  const participant =await prisma.roomParticipant.findUnique({
    where:{
      roomId_userId:{
        roomId,
        userId,
      }
    }
  });


  if(!participant){
    throw new Error("NOT_A_PARTICIPANT");
  }


  return{
    roomId,
    userId,
    role:participant.role,
  }
}

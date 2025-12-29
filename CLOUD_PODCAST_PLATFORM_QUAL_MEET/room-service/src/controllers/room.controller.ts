import { Request, Response } from "express";
import { createRoom, joinRoom, leaveRoom,getRoomById,authorizeRoomAccess } from "../services/room.service";
import { CreateRoomRequestDTO } from "../dto/room.dto";

export async function createRoomController(
  req: Request,
  res: Response
) {
  try {
    const hostId = req.header("x-user-id");

    if (!hostId) {
      return res.status(401).json({ error: "Missing user identity" });
    }

    const body = req.body as CreateRoomRequestDTO;

    const room = await createRoom({
      hostId,
      maxParticipants: body.maxParticipants,
    });

    return res.status(201).json(room);

  } 
  catch (err) {
    console.error(err);
    return res.status(500).json(
        { 
            error: "Internal server error hello" 
        }
    );
  }
}


export async function joinRoomController(
  req:Request<{roomId:string}>,
  res:Response
){
  try{
    
    //not applied dot schema because they are not coming in req body
    const userId=req.header("x-user-id");
    const {roomId}=req.params;

    if(!userId){
      return res.status(401).json(
        {
          error:"Missing user identity",
        }
      );
    }


    const result=await joinRoom({
      roomId,
      userId,
    });


    return res.status(200).json(result);


  }catch(error){  
      if(error instanceof Error){
        switch(error.message){

          case "ROOM_NOT_FOUND":
            return res.status(404).json({
              error:"Room not found",
            });
          
          case "ROOM_INACTIVE":
            return res.status(403).json({
              error:"Room is inactive",
            });
          

          case "ALREADY_JOINED":
            return res.status(409).json({
              error:"user already joined room",
            });

          case "ROOM_FULL":
            return res.status(409).json({
              error:"Room is full",
            });

        }
      }
      console.error("Join room error: ",error);

      return res.status(500).json({
        error:"Internal server error",
      });
  }
}





export async function leaveRoomController(req:Request,res:Response) {
  try{

    const userId=req.header("x-user-id");
    const roomId=req.params.roomId;


    if(!userId){
      return res.status(401).json({error:"Missing user identity"});
    }

    const result = await leaveRoom({roomId,userId});

    if("closed" in result && result.closed){
       return res.status(200).json(
        {
          message:"Room closed because host left",
          result,
        }
       );
    }

    return res.status(200).json(result);
  }
  catch(error){
      if(error instanceof Error){
        switch(error.message){

            case "ROOM_NOT_FOUND":
              return res.status(404).json(
                {
                  error:"Room not found"
                }
              );

            case "NOT_IN_ROOM":
              return res.status(403).json(
                {
                  error:"User is not in the room"
                }
              );

        }
      }

      console.error("Leave room error: ",error);
      return res.status(500).json({
        error:"Internal server error",
      })
  }

}


export async function getRoomController(req:Request,res:Response){
  try{
    const roomId=req.params.roomId;

    const room=await getRoomById(roomId);

    return res.status(200).json(room);
  }
  catch(error){
    if(error instanceof Error && error.message==="ROOM_NOT_FOUND"){
        return res.status(404).json(
          {
            error:"Room not found"
          }
        );
    }

    console.error("Get room error: ",error);
    return res.status(500).json({
        error:"Internal server error",
    });
  }
}



export async function authorizeRoomController(req:Request,res:Response){

  try{
    const userId=req.header("x-user-id");
    const roomId=req.params.roomId;


    if(!userId){
      return res.status(401).json({
          error:"Missing user identity",
      })
    }



    const result=await authorizeRoomAccess(roomId,userId);
    return res.status(200).json(result);
  }
  catch(error){
    if(error instanceof Error){
        if(error.message==="ROOM_NOT_EXIST"){
          return res.status(404).json({
              error:"Room don't exist",
            });
        }
        if(error.message==="ROOM_NOT_ACTIVE"){
            return res.status(409).json({
              error:"Room is inactive",
            });
        }

        if(error.message==="NOT_A_PARTICIPANT"){
          return res.status(403).json({
              error:"Not a participant",
          });
        }
    }

    console.error("Authorise room access error: ",error);
    return res.status(500).json({
      error:"Internal server error"
    });
  }
}
import { Request,Response } from "express";
import { IceServerQuerySchema } from "../dto/ice.dto";
import { getIceServerForUser } from "../services/ice.service";
import { TurnServiceError } from "../errors/TurnServiceError";

export async function getIceServerController(
    req:Request,
    res:Response
){
    try{
        const userId=req.header("x-user-id");

        if(!userId){
            return res.status(401).json({
                error:"Missing user identity",
            });
        }

        const parseResult=IceServerQuerySchema.safeParse(req.query);
        if(!parseResult.success){
            return res.status(400).json({
                error:parseResult.error.issues[0].message,
            });
        }

        const {roomId}=parseResult.data;

        const result=await getIceServerForUser(roomId,userId);

        return res.status(200).json(result);
    }
    catch(error:unknown){
        if(error instanceof TurnServiceError){
            console.warn(`[TURN] ${error.code} | status=${error.statusCode} | ${error.message}`);

            return res.sendStatus(error.statusCode);
        }

        console.error("[TURN] unexpected error:", error);

        return res.status(500).json({
            error:"Internal server error",
        });
    }
}
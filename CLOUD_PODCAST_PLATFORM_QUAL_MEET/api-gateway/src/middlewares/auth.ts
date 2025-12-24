import {Request,Response,NextFunction} from "express";
import jwt from "jsonwebtoken";
import { JWT_PUBLIC_KEY } from "../config/env";
import { JwtPayload } from "@qualmeet/shared";

export function authenticate(req:Request,res:Response,next:NextFunction){

    //Authorization:Bearer <token>
    const authHeader=req.headers.authorization;

    if(!authHeader){
        return res.status(401).json({
            error:"Authorization header missing",
        });
    }

    const [scheme,token]=authHeader.split(" ");

    if(scheme!=="Bearer" || !token){
        return res.status(401).json(
            {
                error:"Invalid Authorization header format",
            }
        )
    }

    try{
        //decodes the payload (id,email,fullName)
        const decoded=jwt.verify(token,JWT_PUBLIC_KEY,{
            algorithms:["RS256"],
        })as JwtPayload;


        //attach verified identity to request
        (req as any).user=decoded;
        //req.user.userId
        //req.user.email
        //req.user.fullName

        req.headers["x-user-id"]=decoded.userId;
        req.headers["x-user-email"]=decoded.email;
        req.headers["x-user-name"]=decoded.fullName;

        next();
    }
    catch(error:unknown){
        return res.status(401).json({
            error:"Invalid or expired token",
        });
    }

}
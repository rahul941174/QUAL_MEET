import crypto from "crypto";
import { TURN_SECRET,TURN_TTL_SECONDS } from "../config/env";

export function generateTurnCredentials(userId:string){
    const expiresAt=Math.floor(Date.now() /1000)+TURN_TTL_SECONDS;

    const username=`${expiresAt}:${userId}`;

    const password=crypto.createHmac("sha1",TURN_SECRET)
                         .update(username)
                         .digest("base64");

    return {
        username,
        credential:password,
        ttl:TURN_TTL_SECONDS,
    };
}
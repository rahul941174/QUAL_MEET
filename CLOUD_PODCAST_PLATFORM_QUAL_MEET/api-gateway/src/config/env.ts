import dotenv from "dotenv";
dotenv.config();


export function requireEnv(name:string):string{
    const value=process.env[name];
    if(!value){
        throw new Error(` Missing required env variable: ${name}`);
    }

    return value;
}

export const PORT=Number(process.env.PORT) || 4000;

export const JWT_PUBLIC_KEY = requireEnv("JWT_PUBLIC_KEY").replace(/\\n/g, "\n");
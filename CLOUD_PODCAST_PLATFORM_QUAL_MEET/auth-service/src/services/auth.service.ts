import brcypt from "bcrypt";
import jwt from "jsonwebtoken";
import {prisma} from "../db/prisma";
import { SignupRequestDTO,LoginRequestDTO } from "../dto/auth.dto";
import { UserAlreadyExistsError } from "../errors/AuthErrors";
import { getPrivateKey } from "../utils/jwt";
import { AppError } from "../errors/AppError";

const SALT_ROUNDS=10;
const JWT_EXPIRES_IN="24h";


//signup business logic
export async function signupUser(data:SignupRequestDTO){
    const {email,password,fullName}=data;

    //checking if user exists (same email)
    const existingUser= await prisma.user.findUnique({
        where:{email},
    });

    if(existingUser){
        throw new UserAlreadyExistsError();
    }

    //hash the passowrd to store in db
    const passwordHash=await brcypt.hash(password,SALT_ROUNDS);

    //create user in db
    const user=await prisma.user.create({
        data:{
            email,
            passwordHash,
            fullName,
        },
    });


    return {
        id:user.id,
        email:user.email,
        fullName:user.fullName,
        createdAt:user.createdAt,
    };
}


export async function loginUser(data:LoginRequestDTO){

    const {email,password}=data;

    //find user in the database
    const user=await prisma.user.findUnique({
        where:{email},
    });

    if(!user){
        throw new AppError("Invalid email or password",401);
    }


    //compare password
    const isValid=await brcypt.compare(password,user.passwordHash);

    if(!isValid){
        throw new AppError("Invalid email or password",401);
    }


    //create jwt payload
    const payload={
        userId:user.id,
        email:user.email,
        fullName:user.fullName,
    };

    //sign jwt (RS256)
    const token=jwt.sign(payload,getPrivateKey(),{
        algorithm:"RS256",
        expiresIn:JWT_EXPIRES_IN,
    });

    return {token};
}
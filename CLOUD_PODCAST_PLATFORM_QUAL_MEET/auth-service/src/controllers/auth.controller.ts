import {Request,Response} from "express";
import { SignupRequestDTO,LoginRequestDTO } from "../dto/auth.dto";
import {signupUser,loginUser} from "../services/auth.service";
import { AppError } from "../errors/AppError";
import {SignupResponse,LoginResponse} from "@shared/types/auth"

// POST /auth/signup
export async function signup(req:Request,res:Response){

    try{
        //verifying req body data at compile time using dto, will not work at run time 
        const data=req.body as SignupRequestDTO;

        const user=await signupUser(data);

        const response={
            user,
        }satisfies SignupResponse;

        return res.status(201).json(response);
    }
    catch(error:unknown){
        if(error instanceof AppError){
            return res.status(error.statusCode).json(
                {
                    error:"User with this email already exists",
                }
            )
        }

        console.error("Unexpected Sign up error: ",error);

        return res.status(500).json({
            error:"Internal server error",
        })
    }
}


export async function login(req:Request,res:Response){

    try{
        //verifying req body data at compile time using dto, will not work at run time
        const data=req.body as LoginRequestDTO;

        const {token,user}=await loginUser(data);

        const response={
            token,
            user,
        }satisfies LoginResponse;

        return res.status(200).json(response);
    }
    catch(error:unknown){
        if(error instanceof AppError){
            return res.status(error.statusCode).json(
                {
                    error:error.message,
                }
            );
        }

        console.error("Unexpected Login error",error);
        return res.status(500).json({
            error:"Internal server error",
        });
    }
}
import { apiRequest,setAuthToken,clearAuthToken } from "./client";
import type { LoginResponse,SignupResponse } from "@qualmeet/shared";


interface SignupInput{
    email:string;
    password:string;
    fullName:string;
}

interface LoginInput{
    email:string;
    password:string;
}


export async function signup(input:SignupInput):Promise<SignupResponse>{
    return apiRequest<SignupResponse>("/api/auth/signup",{
        method:"POST",
        body:JSON.stringify(input)
    });
}

export async function login(input:LoginInput):Promise<LoginResponse>{
    const res=await apiRequest<LoginResponse>("/api/auth/login",{
        method:"POST",
        body:JSON.stringify(input)
    });

    setAuthToken(res.token);
    return res;
}

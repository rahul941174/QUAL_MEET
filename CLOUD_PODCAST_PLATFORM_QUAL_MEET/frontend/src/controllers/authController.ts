import {login,signup} from "../api/auth";
import {setUser,clearUser} from "../store/authSlice";
import {setPhase} from "../store/appSlice";
import { setBanner,clearBanner } from "../store/uiSlice";
import type {AppDispatch} from "../store";


export async function signupUser(
    dispatch:AppDispatch,
    email:string,
    password:string,
    fullName:string
):Promise<boolean>{
    try{
        await signup({email,password,fullName});

        //signup suucessfull banner-guiding user
        dispatch(setBanner("Signup successfull.Please log in."));

        //stay in IDLE phase not authenticated yet
        dispatch(setPhase("IDLE"));

        return true; // sucess
    }
    catch(error){
        dispatch(setBanner("Signup failed."));

        return false;  //fail
    }
}


export async function loginAndIntializeApp(
    dispatch:AppDispatch,
    email:string,
    password:string
):Promise<boolean>{


    try{
        //1. calling backend login API
        const res=await login({email,password});

        //2. clearing existing UI banner
        dispatch(clearBanner());

        //3. storing user in redux
        dispatch(setUser(res.user));

        //4. Moving phase to Authenticated 
        dispatch(setPhase("AUTHENTICATED"));

        return true;
    }
    catch(error){

        //5.on failing reset auth related state
        dispatch(clearUser());
        dispatch(setPhase("IDLE"));

        //6. showing user-facing error
         dispatch(setBanner("Invalid email or password"));

         return false;
    }
}
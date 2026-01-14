import {createSlice,PayloadAction } from "@reduxjs/toolkit";

export type AppPhase=
    | "IDLE"
    | "AUTHENTICATED"
    | "LOBBY"
    | "CONNECTING"
    | "IN_MEETING"
    | "RECONNECTING";

interface AppState{
    phase:AppPhase;
}

const initialState:AppState={
    phase:"IDLE"
};

const appSlice=createSlice({
    name:"app",
    initialState,
    reducers:{
        setPhase(state,action:PayloadAction<AppPhase>){
            state.phase=action.payload;
        }
    }
});

export const {setPhase}=appSlice.actions;
export default appSlice.reducer;
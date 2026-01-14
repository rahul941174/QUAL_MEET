import {createSlice,PayloadAction} from "@reduxjs/toolkit";
interface UIState{
    micMuted:boolean;
    camOff:boolean;
    banner:string | null;
}

const initialState:UIState={
    micMuted:false,
    camOff:false,
    banner:null          //A temporary message shown prominently in the UI
};


const uiSlice=createSlice({
    name:"ui",
    initialState,
    reducers:{
        setMicMuted(state,action:PayloadAction<boolean>){
            state.micMuted=action.payload;
        },
        setCamOff(state,action:PayloadAction<boolean>){
            state.camOff=action.payload;
        },
        setBanner(state,action:PayloadAction<string>){
            state.banner=action.payload;
        },
        clearBanner(state){
            state.banner=null;
        }
    }
});

export const {setMicMuted,setCamOff,setBanner,clearBanner}=uiSlice.actions;
export default uiSlice.reducer;
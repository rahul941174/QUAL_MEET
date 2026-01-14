import {createSlice,PayloadAction} from "@reduxjs/toolkit";

interface RoomState{
    roomId:string | null;
    participants:string[];
}

const initialState:RoomState={
    roomId:null,
    participants:[]
};


const roomSlice=createSlice({
    name:"room",
    initialState,
    reducers:{
        setRoomId(state,action:PayloadAction<string>){
            state.roomId=action.payload;
        },
        setParticipants(state, action: PayloadAction<string[]>) {
            state.participants = action.payload;
        },
        clearRoom(state){
            state.roomId=null;
            state.participants=[];
        }
    }
});

export const {setRoomId,clearRoom}=roomSlice.actions;
export default roomSlice.reducer;
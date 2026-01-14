import { configureStore } from "@reduxjs/toolkit";
import appReducer from "./appSlice";
import authReducer from "./authSlice";
import roomReducer from "./roomSlice";
import uiReducer from "./uiSlice";

export const store=configureStore({
    reducer:{
        app:appReducer,
        auth:authReducer,
        room:roomReducer,
        ui:uiReducer
    }
});

export type RootState=ReturnType<typeof store.getState>;
export type AppDispatch=typeof store.dispatch;

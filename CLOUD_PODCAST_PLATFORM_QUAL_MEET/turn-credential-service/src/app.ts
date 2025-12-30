import express from "express";
import iceRoutes from "./routes/ice.routes"

export function createApp(){
    const app=express();

    app.use(express.json());

    app.get("/health",(_req,res)=>{
        res.status(200).json({
            service:"turn-credential-service",
            status:"ok",
        });
    });

    app.use("/", iceRoutes);


    return app;
}
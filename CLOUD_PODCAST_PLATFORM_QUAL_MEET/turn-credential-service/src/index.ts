import "dotenv/config";
import { createApp } from "./app";

const PORT=process.env.PORT || 4004;

const app=createApp();

app.listen(PORT,()=>{
    console.log(`TURN crendential service running on port ${PORT}`);
});


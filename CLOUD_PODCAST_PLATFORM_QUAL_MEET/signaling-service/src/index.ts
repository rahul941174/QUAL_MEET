import {createServer} from "./server";
import {env} from "./config/env";

const {httpServer}=createServer();

httpServer.listen(env.PORT,()=>{
    console.log(`signaling service listening on port ${env.PORT}`);
})
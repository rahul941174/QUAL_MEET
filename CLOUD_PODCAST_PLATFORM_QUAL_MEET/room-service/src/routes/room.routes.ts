import {Router} from "express";
import { authorizeRoomController, createRoomController, getRoomController, joinRoomController, leaveRoomController } from "../controllers/room.controller";
import { CreateRoomSchema } from "../dto/room.dto";

const router=Router();


router.post(
    "/",
    //validate(CreateRoomSchema).
    createRoomController,
);

router.post(
    "/:roomId/join",
    joinRoomController,
);


router.post(
    "/:roomId/leave",
    leaveRoomController,
)

router.get(
    "/:roomId",
    getRoomController,
)

router.post(
    "/:roomId/authorize",
    authorizeRoomController,
)

export default router;
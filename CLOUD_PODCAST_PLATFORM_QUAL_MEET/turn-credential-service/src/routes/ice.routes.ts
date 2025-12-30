import {Router} from "express";
import { getIceServerController } from "../controllers/ice.controller";

const router=Router();

router.get(
    "/ice-servers",
    getIceServerController
);

export default router;
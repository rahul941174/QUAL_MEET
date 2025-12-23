import {Router} from "express";
import { signup, login } from "../controllers/auth.controller";
import { validate } from "../middlewares/validate";
import { SignupSchema,LoginSchema } from "../dto/auth.dto";

const router=Router();

router.post("/signup",validate(SignupSchema),signup);
router.post("/login",validate(LoginSchema),login);

export default router;
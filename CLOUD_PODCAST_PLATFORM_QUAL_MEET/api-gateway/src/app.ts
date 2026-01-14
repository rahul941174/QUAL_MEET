import express from "express";
import { authenticate } from "./middlewares/auth";
import { authProxy,roomProxy,turnProxy} from "./routes/proxy";
import cors from "cors";
//import cookieParser from "cookie-parser";


const app = express();

app.use(express.json());
//app.use(cookieParser());


app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.get("/health", (_req, res) => {
  res.status(200).json({
    service: "api-gateway",
    status: "ok",
  });
});


/**
 * Public routes
 * Auth service is reachable without JWT
 */
app.use("/api/auth",authProxy);


/**
 * Protected routes
 * JWT required before forwarding
 */
app.use("/api/rooms",authenticate,roomProxy);

app.use("/api/turn", authenticate, turnProxy);


export default app;
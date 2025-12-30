import express from "express";
import { authenticate } from "./middlewares/auth";
import { authProxy,roomProxy,turnProxy} from "./routes/proxy";

const app = express();

app.use(express.json());

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
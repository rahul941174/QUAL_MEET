import express from "express";
import authRoutes from "./routes/auth.routes";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    service: "auth-service",
    status: "ok",
  });
});


//auth routes
app.use("/auth",authRoutes);

export default app;

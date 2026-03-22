import express, { type Express } from "express";
import { healthRouter } from "./routes/health.js";
import { authMiddleware } from "./middleware/auth.js";

const app: Express = express();
app.use(express.json());
app.use((_req, res, next) => {
  res.set("Connection", "close");
  next();
});

app.use("/api/health", healthRouter);

app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

export default app;

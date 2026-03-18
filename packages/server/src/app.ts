import express, { type Express } from "express";
import { healthRouter } from "./routes/health.js";

const app: Express = express();
app.use(express.json());
app.use((_req, res, next) => {
  res.set("Connection", "close");
  next();
});

// TODO: PocketBase auth middleware

app.use("/api/health", healthRouter);

export default app;

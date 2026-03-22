import type { Request, Response, NextFunction } from "express";
import PocketBase from "pocketbase";

declare global {
  namespace Express {
    interface Request {
      user?: Record<string, unknown>;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const token = header.slice(7);
  const pbUrl = process.env.POCKETBASE_URL || "http://127.0.0.1:8090";
  const pb = new PocketBase(pbUrl);

  try {
    const result = await pb.collection("users").authRefresh({
      headers: { Authorization: `Bearer ${token}` },
    });
    req.user = result.record as unknown as Record<string, unknown>;
    next();
  } catch {
    res.status(401).json({ error: "invalid_token" });
  }
}

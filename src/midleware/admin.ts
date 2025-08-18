import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

export const authorizeAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Akses ditolak, hanya untuk admin" });
  }
  next();
};

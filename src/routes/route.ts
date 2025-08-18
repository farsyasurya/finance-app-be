import { Router } from "express";
import {
  register,
  login,
  getMyProfile,
  getAllUsersWithTransactions,
} from "../controllers/auth";
import { authenticate } from "../midleware/auth";
import { authorizeAdmin } from "../midleware/admin";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, getMyProfile);
router.get(
  "/admin/users",
  authenticate,
  authorizeAdmin,
  getAllUsersWithTransactions
);

export default router;

import { Router } from "express";
import {
  addTransaction,
  downloadReport,
  listTransactions,
  summary,
} from "../controllers/transaction";
import { authenticate } from "../midleware/auth";

const router = Router();

router.post("/", authenticate, addTransaction);
router.get("/", authenticate, listTransactions);
router.get("/summary", authenticate, summary);
router.get("/report", authenticate, downloadReport);

export default router;

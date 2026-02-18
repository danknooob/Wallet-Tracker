/**
 * Wallet API routes. POST /api/wallet/fetch derives addresses for a given currency and input.
 */
import { Router } from "express";
import { fetchData } from "../controllers/walletController.js";

const router = Router();

router.post("/fetch", fetchData);

export default router;

import express from "express"
import { authenticate, requireAdmin, requireOwnerOrAdmin } from "../middleware/authMiddleware"
import { progressRateLimiter } from "../middleware/rateLimit"
import { getProgress, createProgress, updateProgress, deleteProgress, getLeaderBoard, getSimilarProgress } from "../controllers/progressController"

const router = express.Router()

// Public routes
router.get("/leaderboard", progressRateLimiter, getLeaderBoard)

// Protected routes
router.use(authenticate)
router.get("/:userId", progressRateLimiter, requireOwnerOrAdmin("userId"), getProgress)
router.post("/:userId", progressRateLimiter, requireOwnerOrAdmin("userId"), createProgress)
router.put("/:userId", progressRateLimiter, requireAdmin, updateProgress)
router.delete("/:userId", progressRateLimiter, requireAdmin, deleteProgress)
router.get("/similar/:userId", progressRateLimiter, requireOwnerOrAdmin("userId"), getSimilarProgress)

export default router
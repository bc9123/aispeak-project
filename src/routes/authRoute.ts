import express from "express";
import { authenticate, requireAdmin, requireOwnerOrAdmin } from '../middleware/authMiddleware';
import { authRateLimiter } from '../middleware/rateLimit';
import { register, login, deleteUser, logout, refreshToken, getUsers, getUser, deleteCurrentUser } from '../controllers/authController';

const router = express.Router();

// Public routes
router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);

// Protected routes
router.use(authenticate);
router.get('/user/:userId', requireOwnerOrAdmin("userId"), getUser);
router.get('/refresh-token', refreshToken);
router.get('/users', requireAdmin, getUsers);
router.delete('/user/:userId', requireAdmin, deleteUser);
router.delete('/user', deleteCurrentUser);
router.post('/logout', logout);

export default router;
import express from 'express';
import rateLimit from 'express-rate-limit';
import {signup,login,refreshUserToken,logout,getMe,changePassword} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 1000, // lenient in dev/testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: '⛔ Too many attempts. Please try again in 15 minutes.'
  }
});

// ─── Public Routes ────────────────────────────────────────────────────────────
router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.post('/refresh', refreshUserToken);

// ─── Protected Routes (require valid access token) ────────────────────────────
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.patch('/change-password', protect, changePassword);

export default router;

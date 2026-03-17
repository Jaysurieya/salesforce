import express from 'express';
import chatController from '../controllers/chatController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/chat/send — auth required
router.post('/send', authMiddleware, chatController.sendMessage);

// GET /api/chat/status — public (used for health UI)
router.get('/status', chatController.getStatus);

export default router;

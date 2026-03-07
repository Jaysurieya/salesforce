import express from 'express';
import chatController from '../controllers/chatController.js';

const router = express.Router();

// POST /api/chat/send - Send a message to the AI
router.post('/send', chatController.sendMessage);

// GET /api/chat/status - Health check: LLM + Salesforce connectivity
router.get('/status', chatController.getStatus);

export default router;

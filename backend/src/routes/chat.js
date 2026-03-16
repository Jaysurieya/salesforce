import express from 'express';
import chatController from '../controllers/chatController.js';

const router = express.Router();

// POST /api/chat/send - Send a message to the AI
router.post('/send', chatController.sendMessage);

// GET /api/chat/status - Health check: LLM + Salesforce connectivity
router.get('/status', chatController.getStatus);

// Chat history management routes
router.post('/', chatController.createChat);
router.get('/', chatController.getChats);
router.get('/:id', chatController.getChatById);
router.post('/:id/messages', chatController.addMessage);
router.delete('/:id', chatController.deleteChat);
router.put('/:id/rename', chatController.renameChat);

export default router;

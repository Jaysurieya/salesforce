import express from 'express';
import { listUsers, deleteUser } from '../controllers/userController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import adminMiddleware from '../middleware/adminMiddleware.js';

const router = express.Router();

// All admin routes require auth + admin role
router.use(authMiddleware, adminMiddleware);

// GET /api/admin/users
router.get('/users', listUsers);

// DELETE /api/admin/user/:id
router.delete('/user/:id', deleteUser);

export default router;

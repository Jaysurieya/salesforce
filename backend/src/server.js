import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import chatRoutes  from './routes/chat.js';
import authRoutes  from './routes/auth.js';
import userRoutes  from './routes/user.js';
import adminRoutes from './routes/admin.js';
import SalesforceService from './services/salesforce.js';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3001;

/* ── Middleware ─────────────────────────────────────────────── */
app.use(cors());
app.use(express.json());

/* ── Routes ─────────────────────────────────────────────────── */
app.use('/api/auth',  authRoutes);
app.use('/api/user',  userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat',  chatRoutes);

/* ── Health ─────────────────────────────────────────────────── */
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

/* ── Error handler ──────────────────────────────────────────── */
app.use((err, _req, res, _next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

/* ── Startup ────────────────────────────────────────────────── */
async function start() {
  /* 1. MongoDB */
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.warn('⚠️  MONGO_URI not set in .env — database features disabled.');
  } else {
    try {
      await mongoose.connect(mongoUri);
      console.log('✅ MongoDB connected');
    } catch (err) {
      console.error('❌ MongoDB connection failed:', err.message);
    }
  }

  /* 2. Salesforce */
  console.log('\n🔍 Checking Salesforce connection...');
  try {
    const ok = await SalesforceService.isConnected();
    console.log(ok ? '✅ Salesforce connected\n' : '⚠️  Salesforce check returned false\n');
  } catch (err) {
    console.error('❌ Salesforce connect failed:', err.message, '\n');
  }

  /* 3. Listen */
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🤖 Model: ${process.env.OLLAMA_MODEL}`);
  });
}

start();

export default app;

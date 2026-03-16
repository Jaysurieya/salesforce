import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRoutes from './routes/chat.js';
import SalesforceService from './services/salesforce.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/chat', chatRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`🤖 Ollama: ${process.env.OLLAMA_HOST}`);
  console.log(`📦 Model: ${process.env.OLLAMA_MODEL}`);
  console.log(`🔗 Salesforce: ${process.env.SALESFORCE_INSTANCE_URL}`);

  // Verify Salesforce connectivity on startup
  console.log('\n🔍 Checking Salesforce connection...');
  try {
    const connected = await SalesforceService.isConnected();
    if (connected) {
      console.log('✅ Salesforce connected successfully!\n');
    } else {
      console.warn('⚠️  Salesforce connection check returned false. Check your credentials.\n');
    }
  } catch (err) {
    console.error('❌ Salesforce connection failed:', err.message);
    console.error('   Check SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET in .env\n');
  }
});

export default app;

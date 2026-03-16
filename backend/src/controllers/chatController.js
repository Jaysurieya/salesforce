import OllamaService from '../services/ollama.js';
import SalesforceService from '../services/salesforce.js';
import Chat from '../models/Chat.js';

export const sendMessage = async (req, res) => {
  try {
    const { message, conversationHistory = [], model } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Format conversation history for Ollama
    const formattedMessages = conversationHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    const userMessage = { role: 'user', content: message };
    const messagesWithCurrent = [...formattedMessages, userMessage];

    // Get initial response from Ollama (may include tool call)
    const ollamaResponse = await OllamaService.generateResponse(messagesWithCurrent, false, model);

    let finalText;
    let toolExecuted = null;

    if (ollamaResponse.toolCall) {
      console.log('🔧 Tool call detected:', ollamaResponse.toolCall);
      toolExecuted = ollamaResponse.toolCall.tool;

      finalText = await OllamaService.executeToolAndGetResponse(
        ollamaResponse.toolCall,
        messagesWithCurrent,
        model
      );
    } else {
      finalText = ollamaResponse.text;
    }

    res.json({
      success: true,
      data: {
        text: finalText,
        timestamp: new Date().toISOString(),
        toolUsed: toolExecuted
      }
    });
  } catch (error) {
    console.error('Error in chat controller:', error.message);

    if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
      return res.status(503).json({
        error: 'AI service unavailable',
        message: 'Unable to connect to the Cloud LLM. Please check your API key and Base URL.'
      });
    }

    if (error.message === 'Requested model is not available on the configured cloud AI provider.') {
      return res.status(404).json({
        error: 'Model Not Found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to process message',
      message: error.message
    });
  }
};

/**
 * GET /api/chat/status
 * Returns the health status of the LLM and Salesforce connections.
 */
export const getStatus = async (req, res) => {
  const llmHost = process.env.OLLAMA_HOST || 'https://api.ollama.com';
  const llmModel = process.env.OLLAMA_MODEL || 'llama3.3';
  const sfInstance = process.env.SALESFORCE_INSTANCE_URL || '';

  // Check Salesforce connectivity
  let sfConnected = false;
  let sfError = null;
  try {
    sfConnected = await SalesforceService.isConnected();
  } catch (err) {
    sfError = err.message;
  }

  res.json({
    status: 'ok',
    llm: {
      host: llmHost,
      model: llmModel,
      type: llmHost.includes('api.ollama.com') ? 'cloud' : 'local'
    },
    salesforce: {
      connected: sfConnected,
      instance: sfInstance,
      error: sfError || undefined
    },
    tools: [
      'getAccountRecords',
      'getContactRecords',
      'getOpportunityRecords',
      'getLeadRecords',
      'getCaseRecords',
      'createRecord',
      'updateRecord'
    ]
  });
};

export const createChat = async (req, res) => {
  try {
    const { title } = req.body;
    // auto fallback to "New Chat" handled by schema if not provided
    const newChat = new Chat({ title: title || 'New Chat' });
    const savedChat = await newChat.save();
    res.status(201).json(savedChat);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create chat', message: error.message });
  }
};

export const getChats = async (req, res) => {
  try {
    const chats = await Chat.find().sort({ updatedAt: -1 }).select('-messages');
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chats', message: error.message });
  }
};

export const getChatById = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chat', message: error.message });
  }
};

export const addMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { messages } = req.body; // Array of messages to append
    
    const chat = await Chat.findById(id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    chat.messages.push(...messages);
    
    // Auto-generate title if it's the first set of messages
    if (chat.title === 'New Chat' && messages.some(m => m.role === 'user')) {
      const firstUserMsg = messages.find(m => m.role === 'user').content;
      chat.title = firstUserMsg.slice(0, 30) + (firstUserMsg.length > 30 ? '...' : '');
    }

    const updatedChat = await chat.save();
    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add message', message: error.message });
  }
};

export const deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findByIdAndDelete(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json({ message: 'Chat deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete chat', message: error.message });
  }
};

export const renameChat = async (req, res) => {
  try {
    const { title } = req.body;
    const chat = await Chat.findByIdAndUpdate(req.params.id, { title }, { new: true });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: 'Failed to rename chat', message: error.message });
  }
};

export default { sendMessage, getStatus, createChat, getChats, getChatById, addMessage, deleteChat, renameChat };

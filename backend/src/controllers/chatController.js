import OllamaService from '../services/ollama.js';
import SalesforceService from '../services/salesforce.js';

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

    // Add current user message
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
        messagesWithCurrent
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

export default { sendMessage, getStatus };

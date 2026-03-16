import dotenv from 'dotenv';
import ToolRegistry from '../tools/toolRegistry.js';

dotenv.config();

/**
 * Ollama Service
 *
 * Uses the native Ollama API at https://ollama.com/api/chat
 * (NOT the OpenAI-compatible endpoint — the correct host is ollama.com, not api.ollama.com)
 *
 * Docs: https://github.com/ollama/ollama/blob/main/docs/api.md#generate-a-chat-completion
 */
class OllamaService {
  constructor() {
    this.host = (process.env.OLLAMA_HOST || 'https://ollama.com').replace(/\/$/, '');
    this.model = process.env.OLLAMA_MODEL || 'gpt-oss:120b-cloud';
    this.apiKey = process.env.OLLAMA_API_KEY || '';
    this.toolRegistry = ToolRegistry;

    console.log(`🤖 LLM: ${this.model} @ ${this.host}`);
    if (!this.apiKey) {
      console.warn('⚠️  OLLAMA_API_KEY is not set in .env');
    }
  }

  /**
   * Call the Ollama /api/chat endpoint.
   * @param {Array}   messages     - [{role, content}]
   * @param {boolean} forceSummary - If true, omit tools so the model returns plain English
   */
  async generateResponse(messages, forceSummary = false, customModel = null) {
    try {
      const tools = this.toolRegistry.getToolDefinitions();
      
      // If a custom model is passed from the frontend, use it. Otherwise use process.env default.
      let modelToUse = customModel || this.model;
      if (!modelToUse || modelToUse === 'default') {
        modelToUse = 'gpt-oss:120b-cloud';
      }

      const systemPrompt = forceSummary
        ? `You are a Salesforce assistant. Summarise the Salesforce data given to you in clear, 
           friendly English. Use bullet points for multiple records. Highlight names, emails, 
           amounts and statuses. Keep it concise — do not show raw IDs.`
        : `You are an AI assistant that helps users query and manage Salesforce CRM data. 
           Use the provided tools to fetch or write Salesforce records whenever the user asks 
           about contacts, accounts, leads, opportunities or cases. Never make up data.
           
           CRITICAL RULES FOR CREATING RECORDS:
           1. If a user wants to create a Contact, you MUST ensure they provide ALL of the following details: 
              - First Name
              - Last Name
              - Email Address
              - Phone Number
           2. If ANY of these 4 details are missing when the user asks to create a contact, DO NOT call the createRecord tool. Instead, politely inform the user that you need all the details first, and explicitly list exactly which of the 4 required details they still need to provide. Wait for them to provide the missing details before creating the contact.`;

      const body = {
        model: modelToUse,
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ]
      };

      // Attach tools only on the decision step
      if (!forceSummary && tools.length > 0) {
        body.tools = tools;
      }

      const url = `${this.host}/api/chat`;
      console.log(`📡 POST ${url} → model: ${modelToUse}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errBody = await response.text();
        let errMsg = response.statusText;
        try {
          const parsed = JSON.parse(errBody);
          errMsg = parsed?.error || parsed?.message || errBody;
        } catch (_) {
          errMsg = errBody || response.statusText;
        }
        console.error(`❌ Ollama API [${response.status}]:`, errMsg);

        if (response.status === 404 && errMsg.toLowerCase().includes('not found')) {
          throw new Error('Requested model is not available on the configured cloud AI provider.');
        }

        throw new Error(`Ollama API error [${response.status}]: ${errMsg}`);
      }

      const data = await response.json();

      // Native Ollama /api/chat response → data.message (not data.choices[0].message)
      const message = data.message;
      if (!message) throw new Error('No message in Ollama response');

      // Tool calls in native Ollama format
      if (message.tool_calls?.length > 0) {
        const tc = message.tool_calls[0];
        // Ollama native format: tc.function.name + tc.function.arguments (already an object)
        const params = typeof tc.function.arguments === 'string'
          ? JSON.parse(tc.function.arguments || '{}')
          : (tc.function.arguments || {});

        console.log(`🔧 Tool call → ${tc.function.name}`, params);
        return {
          text: message.content || '',
          toolCall: { tool: tc.function.name, params }
        };
      }

      return { text: message.content || 'No response generated.', toolCall: null };

    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.message.includes('ENOTFOUND')) {
        throw new Error(`Cannot connect to Ollama at ${this.host}. Check network/OLLAMA_HOST in .env`);
      }
      throw error;
    }
  }

  /**
   * Execute the tool the LLM chose, then ask the LLM to summarise the result.
   */
  async executeToolAndGetResponse(toolCall, messages, customModel = null) {
    try {
      const result = await this.toolRegistry.executeTool(toolCall.tool, toolCall.params);
      const count = Array.isArray(result) ? result.length : 1;

      const summaryMessages = [
        ...messages,
        {
          role: 'assistant',
          content: `I fetched Salesforce data using "${toolCall.tool}" — ${count} record(s) returned.`
        },
        {
          role: 'user',
          content: `Here is the raw data:\n\n${JSON.stringify(result, null, 2)}\n\nPlease summarise this clearly in plain English.`
        }
      ];

      // Pass the customModel down to the generateResponse call for the summary
      const summary = await this.generateResponse(summaryMessages, true, customModel);
      return summary.text;
    } catch (error) {
      console.error('Tool execution error:', error.message);
      return `Error fetching data: ${error.message}. Please try again.`;
    }
  }
}

export default new OllamaService();

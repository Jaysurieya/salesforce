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
   * @param {string}  modelOverride - Optional model to use instead of the .env default
   */
  async generateResponse(messages, forceSummary = false, modelOverride = null) {
    const modelToUse = modelOverride || this.model;
    try {
      const tools = this.toolRegistry.getToolDefinitions();

      const systemPrompt = forceSummary
        ? `You are a Salesforce assistant. Summarise the Salesforce data given to you in clear, 
           friendly English. Use bullet points for multiple records. Highlight names, emails, 
           amounts and statuses. Keep it concise — do not show raw IDs.`
        : `You are an AI assistant that helps users query and manage Salesforce CRM data. 
           Use the provided tools to fetch or write Salesforce records whenever the user asks 
           about contacts, accounts, leads, opportunities or cases.

           EXISTING TOOLS:
           - getAccountRecords: Use for companies/accounts.
           - getContactRecords: Use for people/contacts.
           - getOpportunityRecords: Use for deals/opportunities.
           - getLeadRecords: Use for prospects/leads.
           - getCaseRecords: Use for support cases/tickets.
           - createRecord: Use to add NEW records (Admin only).
           - updateRecord: Use to modify existing records (Admin only).

           CRITICAL RULES:
           1. ONLY use the tool names listed above. NEVER invent new tool names like "showAllContacts".
           2. To see "all" records, use the appropriate "get...Records" tool without filters.
           3. Never make up data.
           
           CREATING CONTACTS:
           - You MUST ensure they provide: First Name, Last Name, Email, and Phone Number.
           - If details are missing, DO NOT call createRecord. Ask for them first.`;

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
      console.log(`📡 POST ${url} → model: ${this.model}`);

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

      // FALLBACK: Parse manual code blocks if native tools were ignored
      const manualCall = this.parseManualToolCall(message.content || '');
      if (manualCall) {
        return { text: '', toolCall: manualCall };
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
  async executeToolAndGetResponse(toolCall, messages) {
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

      const summary = await this.generateResponse(summaryMessages, true);
      return summary.text;
    } catch (error) {
      console.error('Tool execution error:', error.message);
      return `Error fetching data: ${error.message}. Please try again.`;
    }
  }

  /**
   * FALLBACK: Detect and map manual tool calls like "showAllContacts()"
   */
  parseManualToolCall(content) {
    if (!content) return null;

    // Look for patterns like tool_code \n showAllContacts()
    const patterns = [
      /showAllContacts\(\)/i,
      /showAllLeads\(\)/i,
      /getAccountRecords\s*\(([^)]*)\)/i,
      /getContactRecords\s*\(([^)]*)\)/i
    ];

    if (patterns[0].test(content)) {
      return { tool: 'getContactRecords', params: { limit: 20 } };
    }
    if (patterns[1].test(content)) {
      return { tool: 'getLeadRecords', params: { limit: 20 } };
    }

    return null;
  }
}

export default new OllamaService();

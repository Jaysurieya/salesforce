import salesforceTools from './salesforceTools.js';
import toolDefinitions from './toolDefinitions.js';

/**
 * Tool Registry
 * Central system for registering, discovering, and executing tools
 */

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.definitions = new Map();
    this.initialize();
  }

  /**
   * Initialize the registry with Salesforce tools
   */
  initialize() {
    // Register each tool
    Object.entries(salesforceTools).forEach(([name, func]) => {
      this.registerTool(name, func);
    });

    // Register definitions
    toolDefinitions.forEach(def => {
      this.definitions.set(def.name, def);
    });

    console.log(`✅ Tool Registry initialized with ${this.tools.size} tools`);
  }

  /**
   * Register a tool
   * @param {string} name - Tool name
   * @param {Function} func - Tool function
   */
  registerTool(name, func) {
    if (this.tools.has(name)) {
      console.warn(`⚠️  Tool "${name}" already registered, overwriting`);
    }
    this.tools.set(name, func);
    console.log(`🔧 Registered tool: ${name}`);
  }

  /**
   * Get a tool by name
   * @param {string} name - Tool name
   * @returns {Function|null} - Tool function or null if not found
   */
  getTool(name) {
    return this.tools.get(name) || null;
  }

  /**
   * Check if a tool exists
   * @param {string} name - Tool name
   * @returns {boolean}
   */
  hasTool(name) {
    return this.tools.has(name);
  }

  /**
   * Execute a tool
   * @param {string} toolName - Name of the tool to execute
   * @param {Object} params - Parameters for the tool
   * @returns {Promise<any>} - Tool execution result
   */
  async executeTool(toolName, params = {}) {
    const tool = this.getTool(toolName);
    
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found`);
    }

    console.log(`⚙️ Executing tool: ${toolName}`, params);
    
    try {
      const result = await tool(params);
      console.log(`✅ Tool ${toolName} executed successfully, returned ${Array.isArray(result) ? result.length : '1'} records`);
      return result;
    } catch (error) {
      console.error(`❌ Tool ${toolName} failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get all tool definitions in OpenAI function calling format
   * @returns {Array} - Array of tool definitions
   */
  getToolDefinitions() {
    return toolDefinitions.map(def => ({
      type: 'function',
      function: {
        name: def.name,
        description: def.description,
        parameters: def.parameters
      }
    }));
  }

  /**
   * Get available tool names
   * @returns {Array<string>}
   */
  getAvailableTools() {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tool definition by name
   * @param {string} name - Tool name
   * @returns {Object|null}
   */
  getDefinition(name) {
    return this.definitions.get(name) || null;
  }
}

// Export singleton instance
export default new ToolRegistry();

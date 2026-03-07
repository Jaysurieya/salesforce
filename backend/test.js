#!/usr/bin/env node

/**
 * Test Script for Salesforce Chat AI Backend
 * Run this to verify all components are working
 */

const API_URL = 'http://localhost:3001';

async function testEndpoint(name, url, options = {}) {
  console.log(`\n📝 Testing: ${name}`);
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${name} - SUCCESS`);
      return { success: true, data };
    } else {
      console.log(`⚠️  ${name} - Warning: ${data.error || response.statusText}`);
      return { success: false, data };
    }
  } catch (error) {
    console.log(`❌ ${name} - ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  Salesforce Chat AI - Backend Test Suite     ║');
  console.log('╚═══════════════════════════════════════════════╝');

  // Test 1: Health Check
  const health = await testEndpoint('Health Check', `${API_URL}/health`);
  
  if (!health.success) {
    console.log('\n❌ Backend server is not running!');
    console.log('Run: npm run dev');
    return;
  }

  // Test 2: Simple Chat (no tool)
  console.log('\n\n📊 Running Chat Tests...\n');
  const simpleChat = await testEndpoint('Simple Chat Message', `${API_URL}/api/chat/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Hello! Can you help me?',
      conversationHistory: []
    })
  });

  if (simpleChat.success) {
    console.log('   Response:', simpleChat.data.data.text.substring(0, 100) + '...');
  }

  // Test 3: Tool-based Query (will attempt to use tools)
  const toolQuery = await testEndpoint('Tool Query (Accounts)', `${API_URL}/api/chat/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Show me all accounts in the system',
      conversationHistory: []
    })
  });

  if (toolQuery.success) {
    const response = toolQuery.data.data;
    console.log('   Response:', response.text.substring(0, 100) + '...');
    if (response.toolUsed) {
      console.log('   🔧 Tool Used:', response.toolUsed);
    }
  }

  // Summary
  console.log('\n\n╔═══════════════════════════════════════════════╗');
  console.log('║  Test Summary                                  ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log(`Backend Server: ${health.success ? '✅ Running' : '❌ Not Running'}`);
  console.log(`Chat Endpoint: ${simpleChat.success ? '✅ Working' : '⚠️  Issues'}`);
  console.log(`Tool Integration: ${toolQuery.success ? '✅ Ready' : '⚠️  Needs Setup'}`);

  if (!health.success) {
    console.log('\n💡 Next Steps:');
    console.log('1. Start the backend: npm run dev');
    console.log('2. Make sure Ollama is running: ollama serve');
    console.log('3. Pull the model: ollama pull llama3.1');
  } else if (!simpleChat.success) {
    console.log('\n💡 Next Steps:');
    console.log('1. Check if Ollama is running');
    console.log('2. Verify OLLAMA_MODEL in .env');
    console.log('3. Try: ollama pull llama3.1');
  } else {
    console.log('\n✅ All systems operational!');
    console.log('\n💡 To test with real Salesforce data:');
    console.log('1. Update .env with your Salesforce credentials');
    console.log('2. Restart the server');
    console.log('3. Try queries like:');
    console.log('   - "Show me all opportunities"');
    console.log('   - "Find contacts at Acme Corp"');
    console.log('   - "What cases are open?"');
  }

  console.log('');
}

// Run tests
runTests().catch(console.error);

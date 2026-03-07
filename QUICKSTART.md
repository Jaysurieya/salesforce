# 🚀 Quick Start Guide - Salesforce Chat AI

## Overview

This is an AI-powered chat assistant that connects to your Salesforce CRM using natural language. It uses Ollama for intelligent tool selection and automatic query generation.

---

## ⚡ 5-Minute Setup (Without Salesforce)

You can test the chat interface immediately without Salesforce credentials!

### Step 1: Start Ollama

```bash
# Install Ollama if you haven't
curl -fsSL https://ollama.com/install.sh | sh

# Pull the recommended model
ollama pull llama3.1

# Start Ollama server
ollama serve
```

### Step 2: Start Backend

```bash
cd backend
npm install
npm run dev
```

You should see:
```
🔧 Registered tool: getAccountRecords
🔧 Registered tool: getContactRecords
✅ Tool Registry initialized with 5 tools
🚀 Server running on http://localhost:3001
```

### Step 3: Start Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

### Step 4: Test It!

Open your browser to `http://localhost:5174` and try asking:
- "Hello!"
- "What can you do?"

**Note:** Without Salesforce credentials, tool-based queries will show connection errors, but the chat still works!

---

## 🔐 Full Setup (With Salesforce)

### Get Salesforce Credentials

#### 1. Create Free Developer Org

Go to: https://developer.salesforce.com/signup

#### 2. Create Connected App

1. Login to Salesforce
2. Go to **Setup** → **App Manager**
3. Click **New Connected App**
4. Fill in:
   - **Connected App Name**: `Chat AI`
   - **API Name**: `Chat_AI`
   - **Contact Email**: your email
5. Check **Enable OAuth Settings**
6. Add Callback URL: `http://localhost:3001/callback`
7. Select OAuth Scopes:
   - ✅ Full access (full)
   - ✅ Perform requests on your behalf (refresh_token, offline_access)
8. Save

#### 3. Get Your Credentials

After saving, you'll see:
- **Consumer Key** → Copy this
- **Consumer Secret** → Copy this

#### 4. Get Access Token

**Option A: Using Workbench (Easiest)**

1. Go to https://workbench.developerforce.com
2. Login with your Salesforce credentials
3. Click your username → **Settings**
4. Set API Version to latest
5. Click **OAuth Playground**
6. Enter your Consumer Key
7. Authorize and copy the **Access Token**

**Option B: Using curl**

```bash
curl -X POST https://login.salesforce.com/services/oauth2/token \
  -d "grant_type=password" \
  -d "client_id=YOUR_CONSUMER_KEY" \
  -d "client_secret=YOUR_CONSUMER_SECRET" \
  -d "username=YOUR_SALESFORCE_USERNAME" \
  -d "password=YOUR_PASSWORD_YOUR_SECURITY_TOKEN"
```

### Update .env File

Edit `backend/.env`:

```env
# Keep these defaults
PORT=3001
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.1

# Add your Salesforce credentials
SALESFORCE_INSTANCE_URL=https://your-instance.salesforce.com
# Example: https://na123.salesforce.com or https://myorg.my.salesforce.com

SALESFORCE_CONSUMER_KEY=0QaSfFp9rIiLlCaOnNeEcTtEdD...
# Paste your Consumer Key here

SALESFORCE_CONSUMER_SECRET=E1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P
# Paste your Consumer Secret here

SALESFORCE_ACCESS_TOKEN=00DfA0B1C2D3E4F5G6H7I8J9K0L1M2N3O4P5Q6R7S8T9U0V1W2X3Y4Z5...
# Paste your Access Token here
```

### Restart Backend

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

You should see:
```
✅ Salesforce connected successfully
```

---

## 🎯 Testing Your Setup

### Run Automated Tests

```bash
cd backend
npm test
```

### Manual Testing

Try these queries in the chat:

**Without Salesforce:**
- "Hello!"
- "What tools do you have?"
- "Can you help me with Salesforce?"

**With Salesforce Connected:**
- "Show me all accounts"
- "Find contacts at Acme Corp"
- "What opportunities are closing soon?"
- "List my open cases"
- "Show me qualified leads"

---

## 📊 How It Works

```
User Query → Ollama Analysis → Tool Selection → Salesforce Query → Response Formatting → User
```

### Example Flow

```
User: "Show me opportunities for Account ABC"
         ↓
Ollama: Analyzes intent, selects getOpportunityRecords
         ↓
Backend: Executes tool with params { accountId: "ABC" }
         ↓
Salesforce: Returns opportunity data
         ↓
Ollama: Formats data into natural language
         ↓
AI: "I found 3 opportunities for Account ABC..."
```

---

## 🛠️ Troubleshooting

### "Cannot connect to Ollama"

```bash
# Check if Ollama is running
ollama list

# If not running
ollama serve

# Pull the model if missing
ollama pull llama3.1
```

### "Salesforce connection failed"

1. Verify your instance URL format:
   - ✅ `https://na123.salesforce.com`
   - ✅ `https://myorg.my.salesforce.com`
   - ❌ `myorg.salesforce.com` (missing https://)

2. Check token expiration:
   - Access tokens expire after a few hours
   - Use refresh token flow for production

3. Verify Connected App permissions:
   - Must have "Full access" scope
   - Must have "Perform requests on your behalf" scope

### "Model not found"

```bash
# List installed models
ollama list

# Install llama3.1
ollama pull llama3.1
```

### Port conflicts

```bash
# Find what's using port 3001
lsof -ti:3001 | xargs kill

# Or change port in .env
PORT=3002
```

---

## 📝 Available Tools

| Tool | Use When User Asks For... | Parameters |
|------|---------------------------|------------|
| `getAccountRecords` | Companies, organizations, business accounts | accountName, limit |
| `getContactRecords` | People, contacts, individuals | email, lastName, accountId |
| `getOpportunityRecords` | Deals, sales, revenue, pipeline | stage, minAmount, accountId |
| `getLeadRecords` | Prospects, potential customers | company, status, email |
| `getCaseRecords` | Support tickets, issues, cases | status, priority |

---

## 🎨 Customization

### Change the Model

Edit `backend/.env`:

```env
# For better tool calling (recommended)
OLLAMA_MODEL=llama3.1

# For faster responses
OLLAMA_MODEL=phi3-mini

# For specialized tool use
OLLAMA_MODEL=mistral-nemo
```

### Add More Tools

1. Add tool definition in `src/tools/toolDefinitions.js`
2. Implement tool in `src/tools/salesforceTools.js`
3. Restart server

### Modify System Prompt

Edit the `createSystemPrompt()` method in `src/services/ollama.js`

---

## 📚 Next Steps

1. ✅ Test basic chat functionality
2. ✅ Connect Salesforce (if using)
3. ✅ Try sample queries
4. 📖 Read full README.md for advanced features
5. 🔒 Add authentication before deploying
6. 🚀 Deploy to production

---

## 💡 Tips

- **Use specific queries**: "Show me contacts at Acme Corp" works better than "Show contacts"
- **Start broad, then narrow**: First "Show accounts", then "Show California accounts"
- **Check logs**: Backend console shows which tools are being called
- **Token limits**: Keep conversations under 10 messages for best performance

---

## 🆘 Need Help?

Check these resources:
- [Ollama Docs](https://ollama.ai/docs)
- [Salesforce Developer Docs](https://developer.salesforce.com/docs)
- [jsforce Documentation](https://jsforce.github.io/document/)

---

**Ready to chat with your Salesforce data! 🎉**

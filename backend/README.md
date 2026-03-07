# Salesforce Chat AI Backend

AI-powered chat assistant with tool calling capabilities to query Salesforce data using Ollama.

## Features

✅ **Natural Language Interface** - Ask questions in plain English  
✅ **Intelligent Tool Selection** - Ollama automatically chooses the right Salesforce tool  
✅ **5 Built-in Tools**:
- `getAccountRecords` - Fetch company/account data
- `getContactRecords` - Fetch contact information
- `getOpportunityRecords` - Fetch sales opportunities
- `getLeadRecords` - Fetch leads/prospects
- `getCaseRecords` - Fetch support cases

✅ **Conversation Context** - Maintains chat history for better responses  
✅ **Error Handling** - Graceful error messages and fallbacks

---

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Ollama** installed and running
3. **Salesforce Account** (Developer org recommended)

---

## Installation

### 1. Install Ollama

```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# macOS
brew install ollama

# Windows
# Download from https://ollama.com/download
```

### 2. Pull Recommended Model

For best tool calling performance, use **llama3.1** or **mistral-nemo**:

```bash
ollama pull llama3.1
```

Alternative models:
- `mistral-nemo` - Specifically tuned for tool use (12B)
- `phi3-mini` - Fast and lightweight (3.8B)

### 3. Start Ollama

```bash
ollama serve
```

Keep this running in the background.

### 4. Install Backend Dependencies

```bash
cd backend
npm install
```

### 5. Setup Salesforce Credentials

#### Option A: Using Salesforce Developer Org (Recommended)

1. **Get a Free Developer Org**:
   - Go to https://developer.salesforce.com/signup
   - Create a free developer account

2. **Create a Connected App**:
   - Login to your Salesforce org
   - Go to **Setup** → **App Manager**
   - Click **New Connected App**
   - Fill in:
     - Connected App Name: `Chat AI`
     - Contact Email: your email
     - Enable OAuth Settings: ✅
     - Callback URL: `http://localhost:3001/callback`
     - Selected OAuth Scopes: 
       - Full access (full)
       - Perform requests on your behalf (refresh_token)
   - Save and note the **Consumer Key** and **Consumer Secret**

3. **Get Access Token** (using curl):

```bash
curl -X POST https://login.salesforce.com/services/oauth2/token \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_AUTH_CODE" \
  -d "client_id=YOUR_CONSUMER_KEY" \
  -d "client_secret=YOUR_CONSUMER_SECRET" \
  -d "redirect_uri=http://localhost:3001/callback"
```

Or use a tool like **Postman** or **Workbench** to get the token.

#### Option B: Quick Test Mode (Skip Salesforce for now)

If you want to test without Salesforce first, the app will show connection errors but the chat interface will still work for non-Salesforce queries.

### 6. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
PORT=3001
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.1

SALESFORCE_INSTANCE_URL=https://your-instance.salesforce.com
SALESFORCE_CONSUMER_KEY=your_consumer_key
SALESFORCE_CONSUMER_SECRET=your_consumer_secret
SALESFORCE_ACCESS_TOKEN=your_access_token
```

### 7. Start the Backend Server

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

You should see:

```
🚀 Server running on http://localhost:3001
📡 Ollama Host: http://localhost:11434
🤖 Model: llama3.1
✅ Tool Registry initialized with 5 tools
```

---

## Testing

### Health Check

```bash
curl http://localhost:3001/health
```

Response:
```json
{ "status": "ok", "message": "Server is running" }
```

### Test Chat Endpoint

```bash
curl -X POST http://localhost:3001/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello!"
  }'
```

### Test with Tool Call

```bash
curl -X POST http://localhost:3001/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me all accounts",
    "conversationHistory": []
  }'
```

---

## API Endpoints

### POST /api/chat/send

Send a message to the AI assistant.

**Request Body:**
```json
{
  "message": "Find all contacts at Acme Corp",
  "conversationHistory": [
    {"sender": "user", "text": "Hi"},
    {"sender": "ai", "text": "Hello! How can I help?"}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "text": "I found 3 contacts at Acme Corp...",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "toolUsed": "getContactRecords"
  }
}
```

---

## How It Works

### Tool Calling Flow

1. **User asks a question** → "Show me opportunities closing this month"

2. **Ollama analyzes intent** → Determines it needs `getOpportunityRecords`

3. **Backend executes tool** → Queries Salesforce for opportunities

4. **Ollama formats response** → Presents data in natural language

### Example Conversation

```
User: "What opportunities do we have for Account ABC?"

[Ollama decides to call getOpportunityRecords]
[Backend fetches from Salesforce]
[Ollama receives data and formats response]

AI: "I found 5 opportunities for Account ABC:
1. Enterprise Deal - $50,000 - Proposal Stage
2. Renewal Contract - $25,000 - Negotiation
3. Add-on Services - $15,000 - Qualification
...
Total pipeline: $90,000"
```

---

## Troubleshooting

### Cannot connect to Ollama

```bash
# Check if Ollama is running
ollama list

# Restart Ollama
ollama serve
```

### Salesforce Connection Error

- Verify your instance URL is correct (e.g., `https://na123.salesforce.com`)
- Check that your access token hasn't expired
- Ensure your Connected App has proper permissions

### Model Not Found

```bash
# Pull the model
ollama pull llama3.1

# Verify it's installed
ollama list
```

### Port Already in Use

```bash
# Find process using port 3001
lsof -ti:3001 | xargs kill

# Or change PORT in .env
PORT=3002
```

---

## Project Structure

```
backend/
├── src/
│   ├── controllers/
│   │   └── chatController.js      # Request handlers
│   ├── routes/
│   │   └── chat.js                # API routes
│   ├── services/
│   │   ├── ollama.js              # Ollama integration + tool calling
│   │   └── salesforce.js          # Salesforce API connection
│   ├── tools/
│   │   ├── toolRegistry.js        # Central tool registry
│   │   ├── salesforceTools.js     # Tool implementations
│   │   └── toolDefinitions.js     # JSON schemas
│   └── server.js                  # Express server
├── .env                           # Environment variables
├── .env.example                   # Template
├── package.json                   # Dependencies
└── README.md                      # This file
```

---

## Available Tools

| Tool | Description | Common Parameters |
|------|-------------|-------------------|
| `getAccountRecords` | Fetch companies/accounts | accountId, accountName, limit |
| `getContactRecords` | Fetch contacts/people | contactId, accountId, email, lastName |
| `getOpportunityRecords` | Fetch sales deals | opportunityId, accountId, stage, minAmount |
| `getLeadRecords` | Fetch leads/prospects | leadId, status, email, company |
| `getCaseRecords` | Fetch support cases | caseId, status, priority |

---

## Next Steps

1. **Start Frontend**: Navigate to frontend folder and run `npm run dev`
2. **Configure Salesforce**: Add your real Salesforce credentials
3. **Test Queries**: Try asking about accounts, contacts, opportunities
4. **Customize**: Add more tools or modify existing ones

---

## Security Notes

⚠️ **Never commit `.env` file** - Contains sensitive credentials  
⚠️ **Use environment variables** in production  
⚠️ **Implement rate limiting** for production use  
⚠️ **Add authentication** before deploying publicly  

---

## Resources

- [Ollama Documentation](https://ollama.ai/docs)
- [Salesforce API Docs](https://developer.salesforce.com/docs/apis)
- [jsforce Library](https://jsforce.github.io/document/)
- [Salesforce Developer Org](https://developer.salesforce.com/signup)

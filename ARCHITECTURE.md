# 🏛️ Salesforce Chat AI - Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │   React Frontend (Vite)                                   │  │
│  │   - Chat Interface                                        │  │
│  │   - Transparent BG + Violet Theme                         │  │
│  │   - Real-time Messages                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTP (localhost:5174 → 3001)
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER (Node.js/Express)                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  /api/chat/send                                           │  │
│  │  ↓                                                        │  │
│  │  chatController.js                                        │  │
│  │  - Receives user message                                  │  │
│  │  - Manages conversation history                           │  │
│  │  - Handles tool execution workflow                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                    ↕ Internal Call                               ↕ Salesforce REST API
┌──────────────────────────────┐         ┌────────────────────────────────┐
│      OLLAMA SERVICE          │         │     TOOL REGISTRY              │
│  ┌────────────────────────┐  │         │  ┌──────────────────────────┐  │
│  │ - Creates system prompt│  │         │  │ - getAccountRecords      │  │
│  │ - Sends to Ollama API  │  │         │  │ - getContactRecords      │  │
│  │ - Parses JSON response │◄─┼─────────┼──► - getOpportunityRecords  │  │
│  │ - Detects tool calls   │  │         │  │ - getLeadRecords         │  │
│  │ - Executes tools       │  │         │  │ - getCaseRecords         │  │
│  │ - Formats responses    │  │         │  └──────────────────────────┘  │
│  └────────────────────────┘  │         └────────────────────────────────┘
└──────────────────────────────┘                     ↕ jsforce
         ↕ fetch()                                ┌────────────────────┐
┌──────────────────────┐                         │  SALESFORCE        │
│   OLLAMA SERVER      │                         │  CRM               │
│  ┌────────────────┐  │                         │  - Accounts        │
│  │ llama3.1 Model │  │                         │  - Contacts        │
│  │ - Analyzes     │  │                         │  - Opportunities   │
│  │ - Selects tool │  │                         │  - Leads           │
│  │ - Extracts     │  │                         │  - Cases           │
│  │   parameters   │  │                         │                    │
│  └────────────────┘  │                         └────────────────────┘
└──────────────────────┘
```

---

## Data Flow Sequence

### Scenario: "Show me opportunities for Account ABC"

```
┌────┐     ┌─────┐     ┌──────────┐     ┌───────┐     ┌──────────┐     ┌────────────┐
│User│     │Front│     │ Backend │     │Ollama │     │  Tool  │     │Salesforce  │
│    │     │ end │     │Controller│     │Service│     │Registry│     │            │
└─┬──┘     └──┬──┘     └────┬─────┘     └───┬───┘     └────┬───┘     └─────┬──────┘
  │          │             │               │              │               │
  │ Type msg │             │               │              │               │
  │─────────>│             │               │              │               │
  │          │             │               │              │               │
  │          │ POST /chat  │               │              │               │
  │          │────────────>│               │              │               │
  │          │             │               │              │               │
  │          │             │ Create prompt │              │               │
  │          │             │ with tools    │              │               │
  │          │             │──────────────>│              │               │
  │          │             │               │              │               │
  │          │             │               │ Analyze query│              │
  │          │             │               │ Select tool  │              │
  │          │             │               │              │              │
  │          │             │               │ Return JSON  │              │
  │          │             │<──────────────│              │              │
  │          │             │               │              │              │
  │          │             │ Parse tool call              │              │
  │          │             │─────────────────────────────>│              │
  │          │             │               │              │              │
  │          │             │               │              │ Execute SOQL │
  │          │             │               │              │─────────────>│
  │          │             │               │              │              │
  │          │             │               │              │ Return data  │
  │          │             │               │              │<─────────────│
  │          │             │<─────────────────────────────│              │
  │          │             │               │              │              │
  │          │             │ Format result │              │              │
  │          │             │──────────────>│              │               │
  │          │             │               │              │               │
  │          │             │ Natural language response    │              │
  │          │             │<──────────────│              │              │
  │          │             │               │              │              │
  │          │ Response    │               │              │              │
  │          │<────────────│               │              │              │
  │          │             │               │              │              │
  │ Display  │             │               │              │              │
  │<─────────│             │               │              │              │
  │          │             │               │              │              │
```

---

## Component Interaction Map

```
                    ┌─────────────────┐
                    │   User Query    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Frontend App   │
                    │  (React/Vite)   │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼─────────┐         ┌────────▼────────┐
    │   Display Layer   │         │   API Layer     │
    │  - Chat UI        │         │  - Express      │
    │  - Styling        │         │  - Routes       │
    │  - Animations     │         │  - Middleware   │
    └───────────────────┘         └────────┬────────┘
                                           │
                                 ┌─────────▼──────────┐
                                 │  Controller Layer  │
                                 │  - chatController  │
                                 │  - Request handler │
                                 └─────────┬──────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                             │
          ┌─────────▼──────────┐                       ┌─────────▼──────────┐
          │   Intelligence     │                       │   Execution        │
          │   Layer            │                       │   Layer            │
          │  - Ollama Service  │                       │  - Tool Registry   │
          │  - Prompt Engine   │                       │  - Salesforce Tools│
          │  - JSON Parser     │                       │  - Data Fetching   │
          └─────────┬──────────┘                       └─────────┬──────────┘
                    │                                             │
          ┌─────────▼──────────┐                       ┌─────────▼──────────┐
          │   AI Model         │                       │   External APIs    │
          │  - llama3.1        │                       │  - Salesforce CRM  │
          │  - Tool Selection  │                       │  - jsforce         │
          │  - Intent Analysis │                       │  - SOQL Queries    │
          └────────────────────┘                       └────────────────────┘
```

---

## Tool Calling Decision Tree

```
                         User Query
                             │
              ┌──────────────┴──────────────┐
              │ Does it need Salesforce     │
              │ data?                        │
              └──────────────┬──────────────┘
                    Yes │           │ No
                        │           │
          ┌─────────────▼─┐    ┌────▼────────┐
          │ Which object? │    │ Respond     │
          └─────────────┬─┘    │ normally    │
                        │      └─────────────┘
        ┌───────────────┼───────────────┐
        │               │               │
   ┌────▼────┐   ┌─────▼─────┐   ┌────▼────┐
   │Account  │   │ Opportunity│   │ Contact │
   └────┬────┘   └─────┬─────┘   └────┬────┘
        │              │              │
        │              │              │
   ┌────▼──────────────▼──────────────▼────┐
   │  Extract Parameters                   │
   │  - IDs, names, filters                │
   │  - Dates, amounts, statuses           │
   └────────────────┬──────────────────────┘
                    │
          ┌─────────▼──────────┐
          │  Build Tool Call   │
          │  { tool, params }  │
          └─────────┬──────────┘
                    │
          ┌─────────▼──────────┐
          │  Execute Tool      │
          │  Query Salesforce  │
          └─────────┬──────────┘
                    │
          ┌─────────▼──────────┐
          │  Format Response   │
          │  Natural language  │
          └─────────┬──────────┘
                    │
                  User
```

---

## File Organization

```
Salesforce_chat_Ai/
│
├── frontend/                          # Client Application
│   ├── src/
│   │   ├── App.jsx                   # Main chat component
│   │   ├── App.css                   # Component styles
│   │   ├── index.css                 # Global styles
│   │   └── main.jsx                  # Entry point
│   ├── package.json
│   └── vite.config.js
│
├── backend/                           # Server Application
│   ├── src/
│   │   ├── controllers/
│   │   │   └── chatController.js     # Request handling logic
│   │   ├── routes/
│   │   │   └── chat.js               # API route definitions
│   │   ├── services/
│   │   │   ├── ollama.js             # Ollama integration
│   │   │   └── salesforce.js         # Salesforce connection
│   │   ├── tools/
│   │   │   ├── toolRegistry.js       # Tool management
│   │   │   ├── salesforceTools.js    # Tool implementations
│   │   │   └── toolDefinitions.js    # Tool schemas
│   │   └── server.js                 # Express server
│   ├── .env                          # Configuration
│   ├── .env.example                  # Config template
│   ├── package.json                  # Dependencies
│   ├── test.js                       # Test suite
│   └── README.md                     # Documentation
│
├── QUICKSTART.md                      # Quick setup guide
├── IMPLEMENTATION_SUMMARY.md          # Implementation details
└── ARCHITECTURE.md                    # This file
```

---

## Technology Stack Layers

```
┌─────────────────────────────────────────────────┐
│              Presentation Layer                 │
│  React 19 | Vite | CSS3 (Glassmorphism)        │
└─────────────────────────────────────────────────┘
                      ↕
┌─────────────────────────────────────────────────┐
│              API Layer                          │
│  Express.js | CORS | REST API                   │
└─────────────────────────────────────────────────┘
                      ↕
┌─────────────────────────────────────────────────┐
│              Business Logic Layer               │
│  Controllers | Services | Tool Registry         │
└─────────────────────────────────────────────────┘
                      ↕
┌─────────────────────────────────────────────────┐
│              AI/ML Layer                        │
│  Ollama | llama3.1 | Function Calling           │
└─────────────────────────────────────────────────┘
                      ↕
┌─────────────────────────────────────────────────┐
│              Data Access Layer                  │
│  jsforce | Salesforce REST API | SOQL           │
└─────────────────────────────────────────────────┘
```

---

**This architecture provides a scalable, maintainable, and extensible foundation for AI-powered Salesforce interactions!** 🚀

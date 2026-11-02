# Connecting Jacxi Shipping MCP with AI Agents & Chatbots

This guide explains how to connect your Jacxi Shipping MCP server and logistics tools to **ChatGPT**, **Google Gemini**, **xAI Grok**, **Anthropic Claude**, and custom autonomous AI agents.

---

## Architecture Overview

Your server provides dual-mode connectivity:

```
                          ┌──────────────────────────┐
                          │   Jacxi Shipping Data    │
                          │ (Prisma DB / Web App API)│
                          └─────────────┬────────────┘
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             │                                                     │
┌────────────▼─────────────┐                             ┌─────────▼──────────────┐
│ Stdio Transport (Local)  │                             │  HTTP / SSE / OpenAPI  │
│  `npm run mcp:server`    │                             │   `npm run mcp:http`   │
└────────────┬─────────────┘                             └─────────┬──────────────┘
             │                                                     │
   ┌─────────┴─────────┐                                 ┌─────────┴───────────┐
   │                   │                                 │          │          │
Antigravity      Claude Desktop                       ChatGPT     Gemini      Grok
Cursor           VS Code / Zed                      Custom GPTs    API        xAI
```

---

## 1. ChatGPT (OpenAI)

### Option A: Custom GPT Action (Web & Mobile ChatGPT)
You can connect ChatGPT without running code using the generated **OpenAPI 3.1** specification.

1. Start the HTTP Gateway:
   ```bash
   npm run mcp:http
   ```
   *(If running locally, expose it via Cloudflare or Ngrok: `npx cloudflared tunnel --url http://localhost:3333`)*
2. In [ChatGPT](https://chatgpt.com), click **Explore GPTs** > **Create a GPT**.
3. In the **Configure** tab:
   - **Name**: Jacxi Shipping Assistant
   - **Instructions**: "You are an assistant for Jacxi Shipping. Use the available actions to search vehicle shipments by VIN or lot number and track ocean freight containers."
4. Click **Create new action**:
   - Click **Import from URL** and enter:
     ```
     https://<YOUR-DOMAIN-OR-TUNNEL>/openapi.json
     ```
   - All endpoints (`searchVin`, `searchContainer`, `universalTrack`, `getShippingOverview`) will be imported automatically!
5. Test in chat:
   > *"Where is container CAAU5189072 and what vehicles are inside?"*

---

## 2. Google Gemini

### Option A: In Antigravity / Gemini CLI (Pre-configured)
The MCP server is already registered in `~/.gemini/config/mcp_config.json`. You can immediately ask questions in this chat session:
> *"Search VIN JTEBU5JR4A5011946"*
> *"What is the status of container CAAU5189072?"*

### Option B: Gemini API (Python)
```python
import google.generativeai as genai
import requests

genai.configure(api_key="YOUR_GEMINI_API_KEY")

# Fetch tool definitions from your gateway
tools_spec = requests.get("http://localhost:3333/schemas/gemini").json()["tools"]

# Configure functions
def search_vin(vin: str, includeTracking: bool = True):
    return requests.get(f"http://localhost:3333/api/search-vin?vin={vin}").json()

def search_container(containerNumber: str, includeShipments: bool = True):
    return requests.get(f"http://localhost:3333/api/search-container?number={containerNumber}").json()

model = genai.GenerativeModel(
    model_name="gemini-1.5-pro",
    tools=[search_vin, search_container]
)

chat = model.start_chat(enable_automatic_function_calling=True)
response = chat.send_message("Search for vehicle with VIN JTEBU5JR4A5011946")
print(response.text)
```

---

## 3. xAI Grok

Grok uses OpenAI-compatible function calling schemas:

```python
import os
import requests
from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("XAI_API_KEY"),
    base_url="https://api.x.ai/v1",
)

# 1. Fetch tool definitions from your Jacxi Gateway
tools = requests.get("http://localhost:3333/schemas/openai").json()["tools"]

messages = [{"role": "user", "content": "Find the status of container CAAU5189072"}]

response = client.chat.completions.create(
    model="grok-beta",
    messages=messages,
    tools=tools,
    tool_choice="auto"
)

# Handle tool call
tool_call = response.choices[0].message.tool_calls[0]
if tool_call.function.name == "search_container":
    import json
    args = json.loads(tool_call.function.arguments)
    data = requests.get(f"http://localhost:3333/api/search-container?number={args['containerNumber']}").json()
    print("Grok Tool Result:", data)
```

---

## 4. Anthropic Claude

### Option A: Claude Desktop App
Add to your `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jacxishipping": {
      "command": "node",
      "args": [
        "C:/Users/Administrator/Documents/GitHub/jacxishipping/node_modules/tsx/dist/cli.mjs",
        "C:/Users/Administrator/Documents/GitHub/jacxishipping/mcps/jacxishipping/src/index.ts"
      ],
      "env": {
        "JACXISHIPPING_APP_URL": "http://localhost:3000"
      }
    }
  }
}
```

### Option B: Claude API (Python)
```python
import anthropic
import requests

client = anthropic.Anthropic(api_key="YOUR_ANTHROPIC_API_KEY")
tools = requests.get("http://localhost:3333/schemas/claude").json()["tools"]

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    tools=tools,
    messages=[{"role": "user", "content": "Search VIN JTEBU5JR4A5011946"}]
)
print(response)
```

---

## 5. Next.js In-App Endpoint

When your Next.js application is running (`npm run dev` or in production), the AI tools and OpenAPI specification are also accessible directly on your main app URL:

- **OpenAPI Schema**: `https://<YOUR-WEB-APP>/api/ai/openapi`
- **Tool Dispatcher**: `https://<YOUR-WEB-APP>/api/ai/tools?action=search_vin&vin=...`


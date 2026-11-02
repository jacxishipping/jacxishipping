# Connecting Jacxi Shipping to AI Agents & Chatbots

Deployed on Vercel at **`https://jacxishipping.com`**, your application natively exposes:
1. **Authentication System**: API Key protection via Bearer tokens, headers, or query parameters.
2. **ChatGPT Plugin & Custom Actions**: Direct integration via `/.well-known/ai-plugin.json` and `/openapi.json`.
3. **Simple Gemini Gateway**: Dedicated `/api/gemini` endpoint for Google GenAI / Gemini API function calling.
4. **Model Context Protocol (MCP)**: Streamable HTTP transport at `/api/mcp` for desktop/cloud MCP agents.

---

## 🔐 Authentication System

All endpoints support authentication using the master key or a user's Jacxi login code:

### How to Configure the Master Key
In your **Vercel Project Dashboard** (or local `.env`), add:
```env
MCP_API_KEY="your-secret-key-here"
```

### How Clients Can Authenticate
Clients can provide the key using any of these methods:
- **HTTP Bearer Token**: `Authorization: Bearer <MCP_API_KEY>`
- **Custom Header**: `X-API-Key: <MCP_API_KEY>`
- **Query Parameter**: `?key=<MCP_API_KEY>` (e.g. `https://jacxishipping.com/api/ai/track?query=CAAU5189072&key=your-secret-key-here`)
- **User Login Code**: Users can also authenticate with their personal 8-character Jacxi `loginCode`.

*(If `MCP_API_KEY` is not set, the endpoints run in open development mode).*

---

## 🤖 1. Connecting as a ChatGPT Plugin / Custom GPT

### Method A: ChatGPT Custom GPT Action (Recommended)
1. In [ChatGPT](https://chatgpt.com), click **Explore GPTs** → **Create a GPT** → **Configure**.
2. Name it **Jacxi Shipping Assistant**.
3. Under **Actions**, click **Create new action**.
4. In **Import from URL**, enter:
   ```
   https://jacxishipping.com/openapi.json
   ```
5. Click **Import**.
6. Under **Authentication**:
   - Choose **API Key**.
   - Auth Type: **Bearer**.
   - Enter your `MCP_API_KEY`.
7. You are ready! In ChatGPT preview, test:
   > *"Track container CAAU5189072 and list the vehicles inside."*
   > *"Look up vehicle VIN JTEBU5JR4A5011946."*

### Method B: ChatGPT Plugin Manifest (`/.well-known/ai-plugin.json`)
Your application automatically hosts the official ChatGPT Plugin manifest at:
```
https://jacxishipping.com/.well-known/ai-plugin.json
```
Plugin systems (ChatGPT Plugin store, LibreChat, Dify, LangChain, Flowise) will automatically discover the plugin, icon, metadata, and OpenAPI endpoints.

---

## ♊ 2. Connecting with Simple Gemini (Google GenAI)

You can connect Google Gemini in just 5 lines of code using the dedicated `/api/gemini` gateway:

### Python Example (`google-genai` / `google.generativeai`)
```python
import google.generativeai as genai
import requests

genai.configure(api_key="YOUR_GEMINI_API_KEY")

API_URL = "https://jacxishipping.com/api/gemini"
HEADERS = {"Authorization": "Bearer YOUR_MCP_API_KEY"}

def search_vin(vin: str, includeTracking: bool = True):
    """Search for a vehicle shipment by VIN or lot number in Jacxi Shipping."""
    return requests.post(API_URL, headers=HEADERS, json={
        "name": "search_vin",
        "args": {"vin": vin, "includeTracking": includeTracking}
    }).json()

def search_container(containerNumber: str, includeShipments: bool = True):
    """Search for an ocean freight container by container number or booking ID."""
    return requests.post(API_URL, headers=HEADERS, json={
        "name": "search_container",
        "args": {"containerNumber": containerNumber, "includeShipments": includeShipments}
    }).json()

def track(query: str):
    """Universal live tracking for any VIN, container number, or lot number."""
    return requests.post(API_URL, headers=HEADERS, json={
        "name": "track",
        "args": {"query": query}
    }).json()

# Initialize Gemini with the Jacxi tools
model = genai.GenerativeModel("gemini-1.5-pro", tools=[search_vin, search_container, track])
chat = model.start_chat(enable_automatic_function_calling=True)

response = chat.send_message("Where is container CAAU5189072 and what car is in it?")
print(response.text)
```

### Simple HTTP GET Test for Gemini or Browser
```bash
curl "https://jacxishipping.com/api/gemini?action=search_vin&vin=JTEBU5JR4A5011946&key=YOUR_MCP_API_KEY"
```

---

## ⚡ 3. Connecting xAI Grok

```python
import os, requests
from openai import OpenAI

client = OpenAI(api_key=os.environ["XAI_API_KEY"], base_url="https://api.x.ai/v1")
tools = requests.get("https://jacxishipping.com/api/ai/schemas?format=grok").json()["tools"]

response = client.chat.completions.create(
    model="grok-beta",
    messages=[{"role": "user", "content": "Track container CAAU5189072"}],
    tools=tools,
    tool_choice="auto"
)
```

---

## 🖥️ 4. Full Remote MCP Clients (Antigravity, Cursor, Claude)

In `mcp_config.json`:
```json
{
  "mcpServers": {
    "jacxishipping": {
      "url": "https://jacxishipping.com/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_KEY"
      }
    }
  }
}
```

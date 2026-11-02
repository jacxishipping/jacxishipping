# Connecting Jacxi Shipping to AI Agents & Chatbots

Deployed on Vercel at **`https://jacxishipping.com`**, your application natively exposes both standard Model Context Protocol (MCP) endpoints and OpenAPI specifications for **ChatGPT**, **Google Gemini**, **xAI Grok**, **Anthropic Claude**, and custom AI agents.

---

## Production Endpoints at `https://jacxishipping.com`

| Endpoint | Target Client | Description |
| :--- | :--- | :--- |
| **`https://jacxishipping.com/openapi.json`** | **ChatGPT Custom GPT Actions** | Complete OpenAPI 3.1 schema. Paste this directly into ChatGPT Custom Actions. |
| **`https://jacxishipping.com/api/mcp`** | **Remote MCP Clients** | Streamable HTTP MCP transport (Antigravity, Claude, Cursor, Zed). |
| **`https://jacxishipping.com/api/ai/search-vin`** | **REST / Chatbots / Grok** | `GET/POST` Search by full or partial VIN, lot number, or shipment ID. |
| **`https://jacxishipping.com/api/ai/search-container`** | **REST / Chatbots / Grok** | `GET/POST` Search container by number (e.g. `CAAU5189072`), booking #, or tracking #. |
| **`https://jacxishipping.com/api/ai/track`** | **REST / Chatbots / Grok** | `GET/POST` Universal real-time tracking resolver. |
| **`https://jacxishipping.com/api/ai/overview`** | **REST / Analytics** | `GET` Operational shipping summary & statistics. |
| **`https://jacxishipping.com/api/ai/schemas`** | **Developers / SDKs** | Returns ready-to-use function schemas formatted for Gemini, OpenAI/Grok, and Claude. |

---

## 1. ChatGPT (OpenAI Custom GPT)

You can connect ChatGPT with **zero coding**:

1. In [ChatGPT](https://chatgpt.com), click **Explore GPTs** > **Create a GPT**.
2. In the **Configure** tab:
   - **Name**: Jacxi Shipping Assistant
   - **Instructions**: 
     > You are an intelligent logistics assistant for Jacxi Shipping (https://jacxishipping.com). Use the available actions to search vehicle shipments by VIN or lot number and look up ocean freight containers. Provide formatted tables and links to view shipments in the Jacxi Shipping portal.
3. Scroll down and click **Create new action**.
4. In the Schema section, click **Import from URL** and enter:
   ```
   https://jacxishipping.com/openapi.json
   ```
5. Click **Import**. ChatGPT will instantly register:
   - `searchVin`
   - `searchContainer`
   - `universalTrack`
   - `getShippingOverview`
6. Test in the preview pane:
   > *"Where is container CAAU5189072?"*
   > *"Can you look up VIN JTEBU5JR4A5011946?"*

---

## 2. Google Gemini

### Option A: Antigravity / Gemini CLI Remote Connection
Add to your `mcp_config.json`:
```json
{
  "mcpServers": {
    "jacxishipping-prod": {
      "url": "https://jacxishipping.com/api/mcp"
    }
  }
}
```

### Option B: Gemini API (Python)
```python
import google.generativeai as genai
import requests

genai.configure(api_key="YOUR_GEMINI_API_KEY")

def search_vin(vin: str, includeTracking: bool = True):
    """Search for a vehicle shipment by VIN or lot number."""
    return requests.get(
        "https://jacxishipping.com/api/ai/search-vin",
        params={"vin": vin, "includeTracking": includeTracking}
    ).json()

def search_container(containerNumber: str, includeShipments: bool = True):
    """Search for an ocean freight container by container number or booking ID."""
    return requests.get(
        "https://jacxishipping.com/api/ai/search-container",
        params={"number": containerNumber, "includeShipments": includeShipments}
    ).json()

model = genai.GenerativeModel(
    model_name="gemini-1.5-pro",
    tools=[search_vin, search_container]
)

chat = model.start_chat(enable_automatic_function_calling=True)
response = chat.send_message("What vehicles are inside container CAAU5189072?")
print(response.text)
```

---

## 3. xAI Grok (Grok 2 / Grok 3 API)

xAI uses standard OpenAI tool format:

```python
import os
import requests
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["XAI_API_KEY"],
    base_url="https://api.x.ai/v1",
)

# Fetch pre-built tool definitions from your production domain
tools = requests.get("https://jacxishipping.com/api/ai/schemas?format=grok").json()["tools"]

messages = [
    {"role": "user", "content": "Check the shipping status for VIN JTEBU5JR4A5011946"}
]

response = client.chat.completions.create(
    model="grok-beta",
    messages=messages,
    tools=tools,
    tool_choice="auto"
)

tool_call = response.choices[0].message.tool_calls[0]
if tool_call.function.name == "search_vin":
    import json
    args = json.loads(tool_call.function.arguments)
    data = requests.get(
        "https://jacxishipping.com/api/ai/search-vin",
        params={"vin": args["vin"]}
    ).json()
    print("Grok Tool Result:", data)
```

---

## 4. Anthropic Claude

### Option A: Remote MCP in Claude Desktop
In `%APPDATA%\Claude\claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "jacxishipping": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://jacxishipping.com/api/mcp"]
    }
  }
}
```

### Option B: Claude API (Python)
```python
import anthropic
import requests

client = anthropic.Anthropic(api_key="YOUR_ANTHROPIC_API_KEY")
tools = requests.get("https://jacxishipping.com/api/ai/schemas?format=claude").json()["tools"]

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    tools=tools,
    messages=[{"role": "user", "content": "Track container CAAU5189072"}]
)
print(response)
```

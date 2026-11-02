# Connecting Jacxi Shipping to AI Agents & Chatbots

> **Important (Canonical Domain)**: Always use **`https://www.jacxishipping.com/api/mcp`** (with **`www.`**) when connecting MCP clients, ChatGPT, or Claude. On Vercel, `https://jacxishipping.com` (without `www.`) issues a `308 Permanent Redirect` to `https://www.jacxishipping.com`, and MCP clients reject cross-origin `308` redirects on `POST` requests.

Deployed on Vercel at **`https://www.jacxishipping.com`**, your application natively exposes:
1. **Google OAuth 2.0 & MCP OAuth 2.1 Authentication**: Standard RFC 9728 / RFC 8414 OAuth 2.1 discovery (`/.well-known/oauth-protected-resource`, `/.well-known/oauth-authorization-server`), Dynamic Client Registration (`/api/oauth/register`), and Google OAuth 2.0 login (`/api/oauth/authorize` & `/api/oauth/token`).
2. **ChatGPT Plugin & Custom Actions**: Direct OAuth & Bearer integration via `/.well-known/ai-plugin.json` and `/openapi.json`.
3. **Simple Gemini Gateway**: Dedicated `/api/gemini` endpoint for Google GenAI / Gemini API function calling.
4. **Model Context Protocol (MCP)**: Streamable HTTP transport at `https://www.jacxishipping.com/api/mcp` with Google OAuth 2.0 support for Antigravity, Claude, ChatGPT, and Cursor.

---

## 🔐 Google OAuth 2.0 & Authentication System

All MCP and AI endpoints support **Google OAuth 2.0** alongside Bearer keys and customer login codes:

### 1. Google OAuth 2.0 Endpoints
| Endpoint | URL | Description |
| :--- | :--- | :--- |
| **MCP Streamable HTTP** | `https://www.jacxishipping.com/api/mcp` | Primary MCP Server endpoint |
| **OAuth Authorization** | `https://www.jacxishipping.com/api/oauth/authorize` | Launches Google OAuth 2.0 Sign-In & AI Agent consent screen |
| **OAuth Token Exchange** | `https://www.jacxishipping.com/api/oauth/token` | Exchanges authorization code (with PKCE `S256`) or refresh token for a Bearer token |
| **Google OAuth Callback** | `https://www.jacxishipping.com/api/oauth/callback/google` | Authorized Redirect URI for Google Cloud Console OAuth 2.0 Client |
| **Dynamic Registration** | `https://www.jacxishipping.com/api/oauth/register` | RFC 7591 Dynamic Client Registration for MCP clients |
| **Protected Resource Metadata** | `https://www.jacxishipping.com/.well-known/oauth-protected-resource` | RFC 9728 MCP OAuth discovery |
| **Auth Server Metadata** | `https://www.jacxishipping.com/.well-known/oauth-authorization-server` | RFC 8414 OAuth 2.0 server metadata |

### 2. Google Cloud Console Setup
In [Google Cloud Console -> Credentials](https://console.cloud.google.com/apis/credentials):
1. Create or edit your **OAuth 2.0 Client ID** (Web application).
2. Add the Authorized Redirect URI:
   ```
   https://www.jacxishipping.com/api/oauth/callback/google
   ```
3. Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel environment variables or directly inside **`/dashboard/mcp` -> API Keys & Security -> Google OAuth 2.0**.

---

## 🖥️ 1. Full Remote MCP Clients with Google OAuth (Antigravity, Cursor, Claude, ChatGPT)

### Option A: Automatic MCP Google OAuth 2.0 Flow (Recommended)
MCP clients that support Streamable HTTP (`https://www.jacxishipping.com/api/mcp`) automatically connect or discover Google OAuth via `/.well-known/oauth-protected-resource`:

```json
{
  "mcpServers": {
    "jacxishipping": {
      "url": "https://www.jacxishipping.com/api/mcp",
      "auth": {
        "type": "oauth",
        "provider": "google",
        "authorizationUrl": "https://www.jacxishipping.com/api/oauth/authorize",
        "tokenUrl": "https://www.jacxishipping.com/api/oauth/token",
        "scopes": ["openid", "email", "profile", "mcp:tools"]
      }
    }
  }
}
```

Or simply point `url` to the endpoint:
```json
{
  "mcpServers": {
    "jacxishipping": {
      "url": "https://www.jacxishipping.com/api/mcp"
    }
  }
}
```

### Option B: Direct Google OAuth Bearer Token (`ya29.*` or `jx_oauth.*`)
You can also pass a Google OAuth 2.0 Access Token (`ya29....`), a Google OpenID Token, or a signed Jacxi Google OAuth Token (`jx_oauth....` from `/dashboard/mcp`) in the `Authorization` header:
```json
{
  "mcpServers": {
    "jacxishipping": {
      "url": "https://www.jacxishipping.com/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_GOOGLE_OAUTH_TOKEN"
      }
    }
  }
}
```

---

## 🤖 2. Connecting as a ChatGPT Plugin / Custom GPT (with Google OAuth)

### Method A: ChatGPT Custom GPT Action with OAuth
1. In [ChatGPT](https://chatgpt.com), click **Explore GPTs** → **Create a GPT** → **Configure**.
2. Name it **Jacxi Shipping Assistant**.
3. Under **Actions**, click **Create new action** and import from URL:
   ```
   https://jacxishipping.com/openapi.json
   ```
4. Under **Authentication**, choose **OAuth**:
   - **Client ID**: *(your Google Client ID or leave auto-registered)*
   - **Client Secret**: *(your Google Client Secret)*
   - **Authorization URL**: `https://jacxishipping.com/api/oauth/authorize`
   - **Token URL**: `https://jacxishipping.com/api/oauth/token`
   - **Scope**: `openid email profile mcp:tools`
   - **Token Exchange Method**: `Default (POST request)`

### Method B: ChatGPT Plugin Manifest (`/.well-known/ai-plugin.json`)
Your application hosts the official ChatGPT Plugin manifest pre-configured with OAuth at:
```
https://jacxishipping.com/.well-known/ai-plugin.json
```

---

## ♊ 3. Connecting with Simple Gemini (Google GenAI)

You can authenticate `/api/gemini` using a Google OAuth Bearer token (`ya29....` or `jx_oauth....`) or your MCP API Key:

```python
import google.generativeai as genai
import requests

genai.configure(api_key="YOUR_GEMINI_API_KEY")

API_URL = "https://jacxishipping.com/api/gemini"
HEADERS = {"Authorization": "Bearer YOUR_GOOGLE_OAUTH_TOKEN"}

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

model = genai.GenerativeModel("gemini-1.5-pro", tools=[search_vin, search_container, track])
chat = model.start_chat(enable_automatic_function_calling=True)

response = chat.send_message("Where is container CAAU5189072 and what car is in it?")
print(response.text)
```

---

## ⚡ 4. Connecting xAI Grok

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

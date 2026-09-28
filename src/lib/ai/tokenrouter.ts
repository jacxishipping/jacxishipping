import { getEffectiveAiProviderSettings, isAiProviderConfigured } from '@/lib/ai/provider-settings';

type ChatMessageContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: ChatMessageContent;
};

type ChatCompletionOptions = {
  model?: string;
  maxTokens?: number;
  temperature?: number;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

export async function isTokenRouterConfigured() {
  return isAiProviderConfigured(await getEffectiveAiProviderSettings());
}

export async function createTokenRouterChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
) {
  const settings = await getEffectiveAiProviderSettings();
  const apiKey = settings.apiKey.trim();
  const model = options.model ?? settings.model;
  const endpoint = settings.chatCompletionsUrl;
  const provider = settings.provider.trim().toLowerCase();

  if (!isAiProviderConfigured(settings)) {
    throw new Error('TokenRouter AI is not configured. Save an enabled API key and endpoint in Settings > AI.');
  }

  // Venice rejects requests that carry X-API-Key or duplicate authorization
  // headers (returns 401 "Authentication failed" even for valid keys), so send
  // only the standard single Authorization header.
  const authHeaders: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };

  // OpenRouter integrations often expect origin metadata for allowlists/analytics.
  if (provider.includes('openrouter') || endpoint.includes('openrouter.ai')) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (appUrl) {
      authHeaders['HTTP-Referer'] = appUrl;
    }
    authHeaders['X-Title'] = 'Jacxi Shipping';
  }

  const tokenLimit = options.maxTokens ?? settings.maxTokens;
  const tempVal = options.temperature ?? settings.temperature;
  const isReasoningModel = /^(o[134]|gpt-4\.5-preview)/i.test(model);

  // Helper to execute request with specific body
  const executeRequest = async (bodyPayload: Record<string, any>) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(bodyPayload),
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    });

    const payload = (await response.json().catch(() => null)) as ChatCompletionResponse | null;
    return { response, payload };
  };

  // 1. Initial payload build
  let bodyPayload: Record<string, any> = {
    model,
    messages,
  };

  if (isReasoningModel) {
    bodyPayload.max_completion_tokens = tokenLimit;
  } else {
    bodyPayload.max_tokens = tokenLimit;
    bodyPayload.temperature = tempVal;
  }

  let { response, payload } = await executeRequest(bodyPayload);

  // 2. If 400 Bad Request due to parameter incompatibilities (e.g. unknown parameter 'max_tokens' or 'temperature'), retry adaptively
  if (!response.ok && response.status === 400) {
    const errMsg = (payload?.error?.message || '').toLowerCase();
    
    // If rejected max_tokens, retry with max_completion_tokens
    if (errMsg.includes('max_tokens') || errMsg.includes('unknown parameter') || errMsg.includes('unrecognized')) {
      const fallbackPayload: Record<string, any> = {
        model,
        messages,
        max_completion_tokens: tokenLimit,
      };
      // Keep temperature only if not rejected
      if (!errMsg.includes('temperature') && !isReasoningModel) {
        fallbackPayload.temperature = tempVal;
      }
      
      const retryRes = await executeRequest(fallbackPayload);
      if (retryRes.response.ok) {
        response = retryRes.response;
        payload = retryRes.payload;
      } else {
        // As a last-resort, try bare payload without token or temperature limits
        const bareRetry = await executeRequest({ model, messages });
        if (bareRetry.response.ok) {
          response = bareRetry.response;
          payload = bareRetry.payload;
        }
      }
    } else if (errMsg.includes('temperature')) {
      // If rejected temperature, retry without temperature
      const fallbackPayload: Record<string, any> = {
        model,
        messages,
        max_tokens: tokenLimit,
      };
      const retryRes = await executeRequest(fallbackPayload);
      if (retryRes.response.ok) {
        response = retryRes.response;
        payload = retryRes.payload;
      }
    }
  }

  if (!response.ok) {
    const errorMessage = payload?.error?.message ?? `TokenRouter AI request failed with status ${response.status}`;
    if (/missing\s+authentication\s+header/i.test(errorMessage)) {
      throw new Error(
        `AI provider rejected authentication headers for ${settings.provider || 'configured provider'}. Re-save a valid API key in Settings > AI and confirm the endpoint ${endpoint} matches that key.`,
      );
    }
    throw new Error(errorMessage);
  }

  const content = payload?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('TokenRouter AI returned an empty response.');
  }

  return {
    content,
    model,
  };
}

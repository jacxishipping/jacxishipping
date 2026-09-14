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

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens ?? settings.maxTokens,
      temperature: options.temperature ?? settings.temperature,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(25000),
  });

  const payload = (await response.json().catch(() => null)) as ChatCompletionResponse | null;

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

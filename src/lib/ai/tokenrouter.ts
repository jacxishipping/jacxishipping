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
    text?: string;
  }>;
  output?: any;
  response?: string;
  text?: string;
  content?: string;
  error?: {
    message?: string;
  } | string;
  message?: string;
  detail?: string;
};

function extractAiErrorMessage(payload: any, fallbackStatus?: number): string {
  if (!payload) return fallbackStatus ? `AI provider request failed with status ${fallbackStatus}` : 'Unknown AI provider error';
  if (typeof payload === 'string') return payload;
  if (typeof payload.error === 'string') return payload.error;
  if (typeof payload.error?.message === 'string') return payload.error.message;
  if (typeof payload.message === 'string') return payload.message;
  if (typeof payload.detail === 'string') return payload.detail;
  if (Array.isArray(payload.errors) && payload.errors.length > 0) return String(payload.errors[0]);
  return fallbackStatus ? `AI provider request failed with status ${fallbackStatus}` : 'Unknown AI provider error';
}

function extractAiResponseContent(payload: any): string | null {
  if (!payload) return null;
  if (typeof payload === 'string') return payload.trim();
  if (payload.choices?.[0]?.message?.content) return payload.choices[0].message.content.trim();
  if (payload.choices?.[0]?.text) return payload.choices[0].text.trim();
  if (typeof payload.output === 'string') return payload.output.trim();
  if (typeof payload.output?.content === 'string') return payload.output.content.trim();
  if (typeof payload.output?.text === 'string') return payload.output.text.trim();
  if (Array.isArray(payload.output) && payload.output[0]?.text) return payload.output[0].text.trim();
  if (Array.isArray(payload.output) && typeof payload.output[0]?.content === 'string') return payload.output[0].content.trim();
  if (Array.isArray(payload.output) && Array.isArray(payload.output[0]?.content) && payload.output[0].content[0]?.text) {
    return payload.output[0].content[0].text.trim();
  }
  if (Array.isArray(payload.output) && typeof payload.output[0] === 'string') return payload.output[0].trim();
  if (typeof payload.response === 'string') return payload.response.trim();
  if (typeof payload.text === 'string') return payload.text.trim();
  if (typeof payload.content === 'string') return payload.content.trim();
  if (typeof payload.message?.content === 'string') return payload.message.content.trim();
  return null;
}

async function parseAiResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }
  const rawText = await response.text().catch(() => '');
  try {
    return JSON.parse(rawText);
  } catch {
    if (rawText.includes('data:')) {
      const lines = rawText.split('\n');
      let combinedContent = '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:') && !trimmed.includes('[DONE]')) {
          try {
            const data = JSON.parse(trimmed.slice(5).trim());
            const delta =
              data.choices?.[0]?.delta?.content ||
              data.choices?.[0]?.message?.content ||
              data.output?.content ||
              data.output?.text ||
              data.text ||
              data.response ||
              '';
            combinedContent += delta;
          } catch {
            // continue parsing next line
          }
        }
      }
      if (combinedContent) {
        return { choices: [{ message: { content: combinedContent } }] };
      }
    }
    return { text: rawText };
  }
}

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

  // Standard authorization header
  const authHeaders: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };

  // OpenRouter metadata
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
  const isMetaOrResponsesEndpoint =
    endpoint.includes('/responses') ||
    provider.includes('meta') ||
    model.toLowerCase().includes('muse-') ||
    model.toLowerCase().includes('spark-');

  // Helper to execute request with specific body
  const executeRequest = async (bodyPayload: Record<string, any>) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...authHeaders,
      },
      body: JSON.stringify(bodyPayload),
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    });

    const payload = await parseAiResponse(response);
    return { response, payload };
  };

  // 1. Initial payload build
  let bodyPayload: Record<string, any>;

  if (isMetaOrResponsesEndpoint) {
    // Meta / Responses API format (e.g. curl https://api.meta.ai/v1/responses)
    // ONLY uses `input`, never `messages`
    bodyPayload = {
      model,
      input: messages,
      stream: false,
      temperature: tempVal,
      max_output_tokens: tokenLimit,
      top_p: 1,
    };
  } else if (isReasoningModel) {
    bodyPayload = {
      model,
      messages,
      max_completion_tokens: tokenLimit,
    };
  } else {
    bodyPayload = {
      model,
      messages,
      max_tokens: tokenLimit,
      temperature: tempVal,
    };
  }

  let { response, payload } = await executeRequest(bodyPayload);

  // 2. If 400 or 422 Bad Request due to parameter incompatibilities, retry adaptively
  if (!response.ok && (response.status === 400 || response.status === 422)) {
    const rawError = extractAiErrorMessage(payload, response.status);
    const errMsg = rawError.toLowerCase();
    
    // Case A: Upstream rejected 'messages' parameter (expects 'input')
    if (errMsg.includes('messages')) {
      const inputOnlyPayload: Record<string, any> = {
        model,
        input: messages,
        max_output_tokens: tokenLimit,
        temperature: tempVal,
        top_p: 1,
        stream: false,
      };
      const retryRes = await executeRequest(inputOnlyPayload);
      if (retryRes.response.ok) {
        response = retryRes.response;
        payload = retryRes.payload;
      } else {
        const bareInputRetry = await executeRequest({ model, input: messages });
        if (bareInputRetry.response.ok) {
          response = bareInputRetry.response;
          payload = bareInputRetry.payload;
        }
      }
    }
    // Case B: Upstream rejected 'input' parameter (expects 'messages')
    else if (errMsg.includes('input')) {
      const messagesOnlyPayload: Record<string, any> = {
        model,
        messages,
        max_tokens: tokenLimit,
        temperature: tempVal,
      };
      const retryRes = await executeRequest(messagesOnlyPayload);
      if (retryRes.response.ok) {
        response = retryRes.response;
        payload = retryRes.payload;
      } else {
        const bareMsgRetry = await executeRequest({ model, messages });
        if (bareMsgRetry.response.ok) {
          response = bareMsgRetry.response;
          payload = bareMsgRetry.payload;
        }
      }
    }
    // Case C: Upstream rejected token limit or extra fields
    else if (
      errMsg.includes('max_tokens') ||
      errMsg.includes('max_output_tokens') ||
      errMsg.includes('max_completion_tokens') ||
      errMsg.includes('unknown parameter') ||
      errMsg.includes('unrecognized') ||
      errMsg.includes('unsupported parameter') ||
      errMsg.includes('extra fields')
    ) {
      const isInput = isMetaOrResponsesEndpoint || ('input' in bodyPayload);
      const msgField = isInput ? { input: messages } : { messages };

      // Try max_output_tokens
      let retry = await executeRequest({
        model,
        ...msgField,
        max_output_tokens: tokenLimit,
        temperature: tempVal,
      });

      if (retry.response.ok) {
        response = retry.response;
        payload = retry.payload;
      } else {
        // Try max_completion_tokens
        retry = await executeRequest({
          model,
          ...msgField,
          max_completion_tokens: tokenLimit,
        });

        if (retry.response.ok) {
          response = retry.response;
          payload = retry.payload;
        } else {
          // Try max_tokens
          retry = await executeRequest({
            model,
            ...msgField,
            max_tokens: tokenLimit,
            temperature: tempVal,
          });

          if (retry.response.ok) {
            response = retry.response;
            payload = retry.payload;
          } else {
            // Try temperature only
            retry = await executeRequest({
              model,
              ...msgField,
              temperature: tempVal,
            });

            if (retry.response.ok) {
              response = retry.response;
              payload = retry.payload;
            } else {
              // Bare payload
              retry = await executeRequest({
                model,
                ...msgField,
              });
              if (retry.response.ok) {
                response = retry.response;
                payload = retry.payload;
              }
            }
          }
        }
      }
    } else if (errMsg.includes('temperature')) {
      const isInput = isMetaOrResponsesEndpoint || ('input' in bodyPayload);
      const msgField = isInput ? { input: messages } : { messages };
      const fallbackPayload: Record<string, any> = {
        model,
        ...msgField,
      };
      const retryRes = await executeRequest(fallbackPayload);
      if (retryRes.response.ok) {
        response = retryRes.response;
        payload = retryRes.payload;
      }
    }
  }

  if (!response.ok) {
    const errorMessage = extractAiErrorMessage(payload, response.status);
    if (/missing\s+authentication\s+header/i.test(errorMessage)) {
      throw new Error(
        `AI provider rejected authentication headers for ${settings.provider || 'configured provider'}. Re-save a valid API key in Settings > AI and confirm the endpoint ${endpoint} matches that key.`,
      );
    }
    throw new Error(errorMessage);
  }

  const content = extractAiResponseContent(payload);

  if (!content) {
    throw new Error('TokenRouter AI returned an empty response.');
  }

  return {
    content,
    model,
  };
}

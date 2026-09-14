import { getEffectiveAiProviderSettings, isAiProviderConfigured } from './src/lib/ai/provider-settings';
import { createTokenRouterChatCompletion } from './src/lib/ai/tokenrouter';

(async () => {
  const settings = await getEffectiveAiProviderSettings();
  console.log('--- effective settings ---');
  console.log(JSON.stringify({
    enabled: settings.enabled,
    provider: settings.provider,
    model: settings.model,
    chatCompletionsUrl: settings.chatCompletionsUrl,
    decryptedKeyLength: settings.apiKey.length,
  }, null, 2));
  console.log('isAiProviderConfigured:', isAiProviderConfigured(settings));

  console.log('--- live chat completion attempt ---');
  try {
    const result = await createTokenRouterChatCompletion([
      { role: 'user', content: 'Reply with exactly: PONG' },
    ], { maxTokens: 20 });
    console.log('SUCCESS:', JSON.stringify(result));
  } catch (e) {
    console.log('FAILED:', e instanceof Error ? e.message : String(e));
  }
  process.exit(0);
})();

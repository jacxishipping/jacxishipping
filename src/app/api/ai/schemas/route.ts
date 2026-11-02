import { NextRequest, NextResponse } from 'next/server';
import {
  getOpenAITools,
  getGeminiTools,
  getClaudeTools,
} from '../../../../../mcps/jacxishipping/src/ai-schemas';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'all';

  if (format === 'gemini') {
    return NextResponse.json({ tools: getGeminiTools() }, { headers: corsHeaders });
  }

  if (format === 'openai' || format === 'grok') {
    return NextResponse.json({ tools: getOpenAITools() }, { headers: corsHeaders });
  }

  if (format === 'claude' || format === 'anthropic') {
    return NextResponse.json({ tools: getClaudeTools() }, { headers: corsHeaders });
  }

  return NextResponse.json(
    {
      gemini: getGeminiTools(),
      openai_and_grok: getOpenAITools(),
      claude: getClaudeTools(),
    },
    { headers: corsHeaders }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}


import { createOpenAI } from '@ai-sdk/openai';

export function parseCartesiaDebugPayload(raw: string) {
  const openai = createOpenAI();
  return { provider: openai, payload: JSON.parse(raw) };
}

import { generateDeepSeekJson, isDeepSeekConfigured } from './deepseek';
import { generateGeminiJson, isGeminiConfigured } from './gemini';

export function isPlannerLlmConfigured(): boolean {
  return isDeepSeekConfigured() || isGeminiConfigured();
}

function isRetryableProviderError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('402') ||
    lower.includes('insufficient balance') ||
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('rate limit')
  );
}

export async function generatePlannerJson<T>(prompt: string): Promise<T> {
  const errors: string[] = [];

  if (isDeepSeekConfigured()) {
    try {
      return await generateDeepSeekJson<T>(prompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'DeepSeek failed';
      errors.push(message);
      if (!isRetryableProviderError(message)) throw error;
    }
  }

  if (isGeminiConfigured()) {
    try {
      return await generateGeminiJson<T>(prompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gemini failed';
      errors.push(message);
      throw new Error(message);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors[0]);
  }

  throw new Error('No AI provider configured');
}

export function friendlyAiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('402') || message.toLowerCase().includes('insufficient balance')) {
    return 'DeepSeek has no credits — using the built-in smart planner instead. Add balance at platform.deepseek.com or set GEMINI_API_KEY for AI enhancement.';
  }
  if (message.includes('429') || message.toLowerCase().includes('quota')) {
    return 'AI rate limit reached — using the built-in smart planner for now.';
  }
  return message;
}

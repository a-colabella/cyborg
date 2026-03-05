/**
 * Provider factory for Vercel AI SDK model instances.
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

/**
 * Returns a Vercel AI SDK model instance for the given provider.
 *
 * @param {string} provider - "claude", "openai", or "gemini"
 * @param {string} apiKey - The API key for the provider
 * @returns {import('ai').LanguageModel}
 */
export function getModel(provider, apiKey) {
  switch (provider) {
    case 'claude': {
      const anthropic = createAnthropic({ apiKey });
      return anthropic('claude-sonnet-4-20250514');
    }
    case 'openai': {
      const openai = createOpenAI({ apiKey });
      return openai('gpt-4o');
    }
    case 'gemini': {
      const google = createGoogleGenerativeAI({ apiKey });
      return google('gemini-2.5-flash');
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

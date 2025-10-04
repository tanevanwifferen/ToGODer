import {
  ChatCompletionMessageParam,
  ChatCompletion,
} from 'openai/resources/index';
import { AIWrapper } from '../LLM/AIWrapper';
import { BillingApi } from '../Api/BillingApi';
import { AIProvider, getTokenCost } from '../LLM/Model/AIProvider';
import { User } from '@prisma/client';
import { ParsedChatCompletion } from 'openai/resources/chat/completions';

export class BillingDecorator implements AIWrapper {
  public constructor(
    private aiWrapper: AIWrapper,
    private user: User
  ) {}

  public get Model(): AIProvider {
    return this.aiWrapper.Model;
  }

  async getResponse(
    systemPrompt: string,
    userAndAgentPrompts: ChatCompletionMessageParam[]
  ): Promise<ChatCompletion> {
    const billingApi = new BillingApi();

    const result = await this.aiWrapper.getResponse(
      systemPrompt,
      userAndAgentPrompts
    );

    const price = getTokenCost(this.aiWrapper.Model);

    const inputPrice = price.input_cost_per_million
      .mul(result.usage!.prompt_tokens)
      .div('1000000');
    const outputPrice = price.output_cost_per_million
      .mul(result.usage!.completion_tokens)
      .div('1000000');

    await billingApi.BillForMonth(this.user.email, inputPrice.add(outputPrice));

    return result;
  }

  /**
   * Streaming with usage-based post-billing.
   * - For providers that include usage on streaming (e.g., OpenAI with stream_options.include_usage),
   *   we capture usage from the wrapped AIWrapper and bill exactly at the end.
   * - If usage is unavailable, we fallback to no-op billing to avoid over/under-charging.
   *   (This can be enhanced later by estimating tokens from prompts and deltas.)
   */
  async *streamResponse(
    systemPrompt: string,
    userAndAgentPrompts: ChatCompletionMessageParam[]
  ): AsyncGenerator<string, void, void> {
    // Stream through deltas while accumulating completion text,
    // in case we need to estimate later (not currently used).
    let completionText = '';
    try {
      for await (const delta of this.aiWrapper.streamResponse(
        systemPrompt,
        userAndAgentPrompts
      )) {
        if (delta) completionText += delta;
        yield delta;
      }
    } finally {
      // Try to bill using provider-reported usage, if available
      const usage = this.aiWrapper.getAndResetLastUsage?.();
      if (usage) {
        const billingApi = new BillingApi();
        const price = getTokenCost(this.aiWrapper.Model);

        const inputPrice = price.input_cost_per_million
          .mul(usage.prompt_tokens)
          .div('1000000');
        const outputPrice = price.output_cost_per_million
          .mul(usage.completion_tokens)
          .div('1000000');

        await billingApi.BillForMonth(
          this.user.email,
          inputPrice.add(outputPrice)
        );
      }
      // else: no reliable usage for streaming; skip billing to avoid inaccuracies.
    }
  }

  // Forward last-usage access to inner wrapper so upstream callers can query it if needed
  getAndResetLastUsage(): {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  } | null {
    return this.aiWrapper.getAndResetLastUsage
      ? this.aiWrapper.getAndResetLastUsage()
      : null;
  }

  async getJSONResponse(
    systemPrompt: string,
    userAndAgentPrompts: ChatCompletionMessageParam[],
    structure?: any
  ): Promise<ParsedChatCompletion<any>> {
    const result = await this.aiWrapper.getJSONResponse(
      systemPrompt,
      userAndAgentPrompts,
      structure
    );

    const billingApi = new BillingApi();

    const price = getTokenCost(this.aiWrapper.Model);

    const inputPrice = price.input_cost_per_million
      .mul(result.usage!.prompt_tokens)
      .div('1000000');
    const outputPrice = price.output_cost_per_million
      .mul(result.usage!.completion_tokens)
      .div('1000000');

    await billingApi.BillForMonth(this.user.email, inputPrice.add(outputPrice));

    return result;
  }
}

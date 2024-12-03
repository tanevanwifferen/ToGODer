import {
  ChatCompletionMessageParam,
  ChatCompletion,
} from 'openai/resources/index.mjs';
import { AIWrapper } from '../LLM/AIWrapper';
import { BillingApi } from '../Api/BillingApi';
import { AIProvider, getTokenCost } from '../LLM/Model/AIProvider';
import { User } from '@prisma/client';

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

    const billingApi = new BillingApi();
    await billingApi.BillForMonth(this.user.email, inputPrice.add(outputPrice));

    return result;
  }

  async getJSONResponse(
    systemPrompt: string,
    userAndAgentPrompts: ChatCompletionMessageParam[]
  ): Promise<ChatCompletion> {
    const result = await this.aiWrapper.getJSONResponse(
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

    const billingApi = new BillingApi();
    await billingApi.BillForMonth(this.user.email, inputPrice.add(outputPrice));

    return result;
  }
}

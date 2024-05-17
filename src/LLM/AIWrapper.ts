import { ChatCompletionMessageParam } from "openai/resources/index.mjs";

export interface AIWrapper {
  getResponse(
    systemPrompt: string,
    userAndAgentPrompts: ChatCompletionMessageParam[]
  ): Promise<string>;
}

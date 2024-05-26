import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { AIWrapper } from "../LLM/AIWrapper";
import { OpenAIWrapper } from "../LLM/OpenAI";
import {
  AllSidesPrompt,
  FormattingPrompt,
  IndividuationPrompt,
  ScientificSpiritualPrompt,
  CouncellorPrompt,
} from "../LLM/prompts/chatprompts";
import { PromptList } from "../LLM/prompts/promptlist";
import { GetTitlePrompt } from "../LLM/prompts/systemprompts";

export class ConversationApi {
  /**
   * Get a short title for a conversation based on the first prompt.
   */
  public async getTitle(body: ChatCompletionMessageParam[]): Promise<string> {
    if (body.length > 1) {
      throw new Error("Only one prompt is allowed for this endpoint");
    }
    var aiWrapper = this.getAIWrapper();

    var prompt = GetTitlePrompt + body[0].content;

    return await aiWrapper.getResponse(prompt, body);
  }

  /**
   * Get a chat completion for a conversation with the AI.
   * @param prompts Chat history
   * @returns string response from the AI
   */
  public async getResponse(
    prompts: ChatCompletionMessageParam[]
  ): Promise<string> {
    var aiWrapper = this.getAIWrapper();

    var firstPrompt = (<string>prompts[0].content)?.split(" ")[0];

    var systemprompt = PromptList["/default"].prompt;
    if (firstPrompt in PromptList) {
      systemprompt = PromptList[firstPrompt].prompt;
    }
    systemprompt += "\n\n" + FormattingPrompt;
    return await aiWrapper.getResponse(systemprompt, prompts);
  }

  private getAIWrapper(): AIWrapper {
    return new OpenAIWrapper();
  }
}

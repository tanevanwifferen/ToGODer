import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { AIWrapper } from "../LLM/AIWrapper";
import { OpenAIWrapper } from "../LLM/OpenAI";
import {
  AllSidesPrompt,
  FormattingPrompt,
  IndividuationPrompt,
  ScientificSpiritualPrompt,
  CouncellorPrompt,
} from "../LLM/prompts/systemprompts";
import { PromptList } from "../LLM/prompts/promptlist";

export class ConversationApi {
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

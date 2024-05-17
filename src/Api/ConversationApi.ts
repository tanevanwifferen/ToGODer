import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { AIWrapper } from "../LLM/AIWrapper";
import { OpenAIWrapper } from "../LLM/OpenAI";
import {
  FormattingPrompt,
  MainSystemPrompt,
  TherapistPrompt,
} from "../LLM/prompts/systemprompts";

export class ConversationApi {
  public async getResponse(
    prompts: ChatCompletionMessageParam[]
  ): Promise<string> {
    var aiWrapper = this.getAIWrapper();

    var firstPrompt = (<string>prompts[0].content)?.split(" ")[0];

    var systemprompt = "";
    switch (firstPrompt) {
      case "/therapist":
        systemprompt += TherapistPrompt;
      default:
        systemprompt += MainSystemPrompt;
    }
    systemprompt += "\n\n" + FormattingPrompt;
    return await aiWrapper.getResponse(systemprompt, prompts);
  }

  private getAIWrapper(): AIWrapper {
    return new OpenAIWrapper();
  }
}

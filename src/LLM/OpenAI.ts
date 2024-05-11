import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";

export class OpenAIWrapper {
  private apiKey: string;

  constructor() {
    let apiKey = process.env.OPENAI_API_KEY;
    if (apiKey == null) throw new Error("OpenAI API key is required");
    this.apiKey = apiKey;
  }

  async getResponse(
    systemPrompt: string,
    userAndAgentPrompts: ChatCompletionMessageParam[]
  ): Promise<string> {
    try {
      const openAI = new OpenAI({
        apiKey: this.apiKey,
      });
      const completion = openAI.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          ...userAndAgentPrompts,
        ],
        model: "gpt-4-turbo",
      });
      return (await completion).choices[0].message.content!;
    } catch (error) {
      console.error("Error:", error);
      throw new Error("Failed to get response from OpenAI API");
    }
  }
}

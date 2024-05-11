import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { OpenAIWrapper } from "./LLM/OpenAI";
import { MainSystemPrompt } from "./LLM/prompts/systemprompts";

const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("hello world");

var openai = new OpenAIWrapper();

var thread: ChatCompletionMessageParam[] = [];

async function run() {
  while (true) {
    await new Promise<void>((res, rej) => {
      rl.question("> ", (question: string) => {
        thread.push({ role: "user", content: question });
        openai.getResponse(MainSystemPrompt, thread).then((response) => {
          thread.push({ role: "assistant", content: response });
          console.log(response);
          res();
        });
      });
    });
  }
}

run();

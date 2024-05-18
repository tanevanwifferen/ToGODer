import { ConversationApi } from "./Api/ConversationApi";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import express from "express";
import path from "path";
import { PromptList } from "./LLM/prompts/promptlist";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Serve static files from the "../Frontend" directory
app.use(express.static(path.join(__dirname, "../Frontend")));

app.post("/api/chat", async (req, res) => {
  var body: ChatCompletionMessageParam[] = req.body;
  var conversationApi = new ConversationApi();
  res.send(await conversationApi.getResponse(body));
});

app.get("/api/prompts", (req, res) => {
  res.send(Object.keys(PromptList));
});

// Redirect empty path to "index.html"
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/index.html"));
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

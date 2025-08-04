import { ConversationApi } from '../Api/ConversationApi';
import { MemoryService } from './MemoryService';
import { ChatRequest } from '../Model/ChatRequest';
import { User } from '@prisma/client';
import { AIProvider } from '../LLM/Model/AIProvider';
import { PromptList } from '../LLM/prompts/promptlist';
import { AutoGenerateSystemPromptPrompt } from '../LLM/prompts/systemPromptGeneration';
import { requestForMemoryBasedOnSystemPromptPrompt } from '../LLM/prompts/systemprompts';

/**
 * Service for auto-generating personalized system prompts based on user memories and existing prompt examples.
 * This service fetches user memories, analyzes existing prompts, and creates a tailored system prompt.
 */
export class SystemPromptGenerationService {
  private conversationApi: ConversationApi;
  private memoryService: MemoryService;

  constructor(assistantName: string) {
    this.conversationApi = new ConversationApi(assistantName);
    this.memoryService = new MemoryService(assistantName);
  }

  /**
   * Generates a personalized system prompt for a user based on their memories and existing prompt examples.
   * Uses a two-phase approach: first generates a basic system prompt, then requests relevant memories to enhance it.
   * @param body ChatRequest containing memory information and configuration
   * @param user The user to generate the prompt for
   * @returns Either a request for more memories or the generated system prompt
   */
  async generatePersonalizedSystemPrompt(
    body: ChatRequest,
    user: User
  ): Promise<{ requestForMemory?: { keys: string[] }; systemPrompt?: string }> {
    // Phase 1: Check if we need additional memories
    var requestForMemory: { keys: string[] } = { keys: [] };
    if (!!body.memoryIndex && body.memoryIndex.length > 0) {
      var memories = body.memories || {};
      Object.defineProperty(memories, 'root', {
        value: body.configurableData ?? undefined,
        writable: true,
        enumerable: true,
        configurable: true,
      });
      requestForMemory =
        await this.conversationApi.requestMemoriesForSystemPrompt(
          requestForMemoryBasedOnSystemPromptPrompt,
          body.memoryIndex,
          memories,
          user
        );
    }

    // If we need more memories, return the request
    if (requestForMemory.keys.length > 0) {
      return { requestForMemory };
    }

    // Phase 2: Generate initial system prompt with available memories
    const promptExamples = this.getPromptExamples();
    const systemPromptInput = this.formatSystemPromptInput(
      body.memories || {},
      body.configurableData,
      promptExamples
    );

    // Generate the initial personalized system prompt
    const aiWrapper = this.conversationApi.getAIWrapper(AIProvider.Grok4, user);
    const response = await aiWrapper.getResponse(
      AutoGenerateSystemPromptPrompt,
      [
        {
          role: 'system',
          content: `Current date: ${new Date().toISOString()}`,
        },
        {
          role: 'user',
          content: systemPromptInput,
        },
      ]
    );

    const generatedPrompt =
      response.choices[0].message.content ||
      'Unable to generate personalized system prompt.';

    // We have all the memories we need, return the generated system prompt
    return { systemPrompt: generatedPrompt };
  }

  /**
   * Gets examples from the existing prompt library to use as templates.
   */
  private getPromptExamples(): {
    [key: string]: { prompt: string; description: string };
  } {
    const examples: { [key: string]: { prompt: string; description: string } } =
      {};

    // Select a diverse set of prompts as examples
    const exampleKeys = [
      '/default',
      '/growth',
      '/individuation',
      '/practical',
      '/deescalation',
      '/sociallife',
      '/arbitration',
    ];

    for (const key of exampleKeys) {
      if (PromptList[key]) {
        examples[key] = {
          prompt: PromptList[key].prompt,
          description: PromptList[key].description,
        };
      }
    }

    return examples;
  }

  /**
   * Formats the input for the AI system prompt generator.
   */
  private formatSystemPromptInput(
    memories: { [key: string]: string },
    configurableData: { [key: string]: string },
    promptExamples: { [key: string]: { prompt: string; description: string } }
  ): string {
    let input = 'USER MEMORIES AND PERSONAL DATA:\n\n';

    if (Object.keys(memories).length > 0) {
      for (const [key, content] of Object.entries(memories)) {
        input += `Memory ${key}:\n${content}\n\n`;
      }
    } else {
      input +=
        'No specific memories available. Generate a general but helpful system prompt.\n\n';
    }

    input += 'CONFIGURABLE DATA:\n\n';
    if (configurableData) {
      input += '\n' + JSON.stringify(configurableData, null, 2) + '\n\n';
    } else {
      input += 'No configurable data available.\n';
    }

    input += 'EXISTING PROMPT EXAMPLES:\n\n';

    for (const [key, example] of Object.entries(promptExamples)) {
      input += `${key} - ${example.description}:\n${example.prompt}\n\n---\n\n`;
    }

    input +=
      'Please generate a personalized system prompt based on the above information.';

    return input;
  }
}

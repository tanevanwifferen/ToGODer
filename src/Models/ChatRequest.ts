import { ChatCompletionMessageParam } from 'openai/src/resources/index.js';
import { AIProvider } from './AIProvider';

export enum ChatRequestCommunicationStyle {
  Default = 0,
  LessBloat = 1,
  AdaptToConversant = 2,
}

export interface ChatRequest {
  model: AIProvider;
  humanPrompt: boolean | undefined;
  keepGoing: boolean | undefined;
  communcationStyle: ChatRequestCommunicationStyle | undefined;
  prompts: ChatCompletionMessageParam[];
}
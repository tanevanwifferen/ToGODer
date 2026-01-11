import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources';
import { AIProvider } from '../LLM/Model/AIProvider';

export enum ChatRequestCommunicationStyle {
  Default = 0,
  LessBloat = 1,
  AdaptToConversant = 2,
  Informal = 3,
}

export interface ArtifactInfo {
  path: string;
  name: string;
  mimeType: string;
}

export interface ChatRequest {
  model: AIProvider;
  humanPrompt: boolean | undefined;
  keepGoing: boolean | undefined;
  outsideBox: boolean | undefined;
  holisticTherapist: boolean | undefined;
  communicationStyle: ChatRequestCommunicationStyle | undefined;
  prompts: ChatCompletionMessageParam[];
  assistant_name: string | undefined;
  configurableData?: any;
  staticData?: any;
  memoryIndex: string[];
  memories: Record<string, string>;
  customSystemPrompt?: string;
  persona?: string;
  libraryIntegrationEnabled?: boolean;
  memoryLoopCount?: number;
  memoryLoopLimitReached?: boolean;
  artifactIndex?: ArtifactInfo[];
  tools?: ChatCompletionTool[];
}

export interface ExperienceRequest {
  model: AIProvider;
  language: string;
  assistant_name: string | undefined;
  data?: any;
}

import { Decimal } from '@prisma/client/runtime/library';
import { AIWrapper } from '../AIWrapper';
import { OpenAIWrapper } from '../OpenAI';
import { OpenRouterWrapper } from '../OpenRouter';

export interface AICost {
  input_cost_per_million: Decimal;
  output_cost_per_million: Decimal;
}

export enum AIProvider {
  gpt5 = 'gpt-5',
  gpt51Chat = 'gpt-5.1',
  gpt41 = 'gpt-4.1',
  Gpt4o = 'gpt-4o',
  Gpt4oMini = 'gpt-4o-mini',
  Gpt35turbo = 'gpt-3.5-turbo',
  Claude3SonnetBeta = 'anthropic/claude-3.5-sonnet:beta',
  Claude37SonnetBeta = 'anthropic/claude-3.7-sonnet:beta',
  Claude4Sonnet = 'anthropic/claude-sonnet-4',
  Claude45Sonnet = 'anthropic/claude-sonnet-4.5',
  DeepSeekV3 = 'deepseek/deepseek-chat-v3.1',
  DeepSeekV32 = 'deepseek/deepseek-v3.2',
  LLama3 = 'perplexity/llama-3-sonar-large-32k-chat',
  LLama3170b = 'meta-llama/llama-3.1-70b-instruct',
  LLama31405b = 'meta-llama/llama-3.1-405b-instruct',
  LLama3290b = 'meta-llama/llama-3.2-90b-vision-instruct',
  LLama3370b = 'meta-llama/llama-3.3-70b-instruct',
  Llama4Maverick = 'meta-llama/llama-4-maverick',
  Grok3Mini = 'x-ai/grok-3-mini',
  Grok4 = 'x-ai/grok-4',
  Gemini3Pro = 'google/gemini-3-pro-preview',
  Qwen3Coder = 'qwen/qwen3-coder',
}

export function getAIWrapper(model: AIProvider): AIWrapper {
  switch (model) {
    case AIProvider.gpt41:
    case AIProvider.Gpt4oMini:
    case AIProvider.Gpt4o:
    case AIProvider.Gpt35turbo:
    case AIProvider.gpt5:
    case AIProvider.gpt51Chat:
      return new OpenAIWrapper(model);
    case AIProvider.Claude3SonnetBeta:
    case AIProvider.Claude37SonnetBeta:
    case AIProvider.Claude4Sonnet:
    case AIProvider.Claude45Sonnet:
    case AIProvider.DeepSeekV3:
    case AIProvider.DeepSeekV32:
    case AIProvider.LLama3:
    case AIProvider.LLama3170b:
    case AIProvider.LLama31405b:
    case AIProvider.LLama3290b:
    case AIProvider.LLama3370b:
    case AIProvider.Llama4Maverick:
    case AIProvider.Grok3Mini:
    case AIProvider.Grok4:
    case AIProvider.Gemini3Pro:
    case AIProvider.Qwen3Coder:
      return new OpenRouterWrapper(model);
    default:
      return new OpenRouterWrapper(AIProvider.LLama3370b);
  }
}

export function getTokenCost(model: AIProvider): AICost {
  let torReturn: AICost | null = null;
  switch (model) {
    case AIProvider.Claude3SonnetBeta:
    case AIProvider.Claude37SonnetBeta:
    case AIProvider.Claude4Sonnet:
    case AIProvider.Claude45Sonnet:
      torReturn = {
        input_cost_per_million: new Decimal('3'),
        output_cost_per_million: new Decimal('15'),
      };
      break;
    case AIProvider.DeepSeekV3:
      torReturn = {
        input_cost_per_million: new Decimal('2'),
        output_cost_per_million: new Decimal('2'),
      };
      break;
    case AIProvider.DeepSeekV32:
      torReturn = {
        input_cost_per_million: new Decimal('0.27'),
        output_cost_per_million: new Decimal('0.42'),
      };
      break;
    case AIProvider.LLama3:
      torReturn = {
        input_cost_per_million: new Decimal('1'),
        output_cost_per_million: new Decimal('1'),
      };
      break;
    case AIProvider.LLama31405b:
      torReturn = {
        input_cost_per_million: new Decimal('4.5'),
        output_cost_per_million: new Decimal('4.5'),
      };
      break;
    case AIProvider.LLama3170b:
      torReturn = {
        input_cost_per_million: new Decimal('1'),
        output_cost_per_million: new Decimal('1'),
      };
      break;
    case AIProvider.LLama3290b:
      torReturn = {
        input_cost_per_million: new Decimal('1.08'),
        output_cost_per_million: new Decimal('1.08'),
      };
      break;
    case AIProvider.LLama3370b:
      torReturn = {
        input_cost_per_million: new Decimal('0.90'),
        output_cost_per_million: new Decimal('0.90'),
      };
      break;
    case AIProvider.Llama4Maverick:
      torReturn = {
        input_cost_per_million: new Decimal('0.24'),
        output_cost_per_million: new Decimal('0.85'),
      };
      break;
    case AIProvider.Gpt4o:
      torReturn = {
        input_cost_per_million: new Decimal('5'),
        output_cost_per_million: new Decimal('15'),
      };
      break;
    case AIProvider.Gpt4oMini:
      torReturn = {
        input_cost_per_million: new Decimal('0.15'),
        output_cost_per_million: new Decimal('0.6'),
      };
      break;
    case AIProvider.Gpt35turbo:
      torReturn = {
        input_cost_per_million: new Decimal('3'),
        output_cost_per_million: new Decimal('6'),
      };
      break;
    case AIProvider.gpt41:
      torReturn = {
        input_cost_per_million: new Decimal('2'),
        output_cost_per_million: new Decimal('8'),
      };
    case AIProvider.gpt5:
    case AIProvider.gpt51Chat:
      torReturn = {
        input_cost_per_million: new Decimal('1.25'),
        output_cost_per_million: new Decimal('10'),
      };
      break;
    case AIProvider.Grok3Mini:
      torReturn = {
        input_cost_per_million: new Decimal('0.3'),
        output_cost_per_million: new Decimal('0.5'),
      };
      break;
    case AIProvider.Grok4:
      torReturn = {
        input_cost_per_million: new Decimal('3'),
        output_cost_per_million: new Decimal('15'),
      };
      break;
    case AIProvider.Gemini3Pro:
      torReturn = {
        input_cost_per_million: new Decimal('3'),
        output_cost_per_million: new Decimal('15'),
      };
      break;
    case AIProvider.Qwen3Coder:
      torReturn = {
        input_cost_per_million: new Decimal('2'),
        output_cost_per_million: new Decimal('2'),
      };
      break;
    default:
      throw new Error('unknown price for model: ' + model);
  }

  torReturn.input_cost_per_million =
    torReturn.input_cost_per_million.mul('1.1');
  torReturn.output_cost_per_million =
    torReturn.output_cost_per_million.mul('1.1');
  return torReturn;
}

export function GetModelName(provider: AIProvider): string {
  switch (provider) {
    case AIProvider.gpt5:
      return 'GPT-5';
    case AIProvider.gpt51Chat:
      return 'GPT-5.1';
    case AIProvider.Gpt4oMini:
      return 'GPT-4o-mini';
    case AIProvider.Gpt4o:
      return 'GPT-4o';
    case AIProvider.gpt41:
      return 'GPT-4.1';
    case AIProvider.Gpt35turbo:
      return 'GPT-3.5 Turbo';
    case AIProvider.Claude3SonnetBeta:
      return 'Claude3.5 Sonnet Beta';
    case AIProvider.Claude37SonnetBeta:
      return 'Claude3.7 Sonnet Beta';
    case AIProvider.Claude4Sonnet:
      return 'Claude 4 Sonnet';
    case AIProvider.Claude45Sonnet:
      return 'Claude 4.5 Sonnet';
    case AIProvider.DeepSeekV3:
      return 'DeepSeek V3';
    case AIProvider.DeepSeekV32:
      return 'DeepSeek V3.2';
    case AIProvider.LLama3:
      return 'LLama3 sonar 32k';
    case AIProvider.LLama3170b:
      return 'Llama 3.1 70b';
    case AIProvider.LLama31405b:
      return 'Llama 3.1 405b';
    case AIProvider.LLama3290b:
      return 'Llama 3.2 90b';
    case AIProvider.LLama3370b:
      return 'Llama 3.3 70b';
    case AIProvider.Llama4Maverick:
      return 'Llama 4 Maverick';
    case AIProvider.Grok4:
      return 'Grok 4';
    case AIProvider.Gemini3Pro:
      return 'Gemini 3 Pro';
    case AIProvider.Qwen3Coder:
      return 'Qwen 3 Coder';
    default:
      throw new Error('Unknown AIProvider');
  }
}

let modelCache: AIProvider[] | null = null;

export function ListModels(): AIProvider[] {
  if (modelCache != null) {
    return modelCache;
  }
  modelCache = [
    AIProvider.DeepSeekV3,
    AIProvider.DeepSeekV32,
    AIProvider.gpt5,
    AIProvider.gpt51Chat,
    AIProvider.Gpt4oMini,
    AIProvider.LLama31405b,
    AIProvider.LLama3170b,
    AIProvider.Gpt4o,
    AIProvider.Gpt35turbo,
    AIProvider.gpt41,
    AIProvider.Claude3SonnetBeta,
    AIProvider.Claude37SonnetBeta,
    AIProvider.Claude4Sonnet,
    AIProvider.Claude45Sonnet,
    AIProvider.LLama3,
    AIProvider.LLama3290b,
    AIProvider.LLama3370b,
    AIProvider.Llama4Maverick,
    AIProvider.Gemini3Pro,
    AIProvider.Grok4,
  ].filter((x) => {
    try {
      var a: AIWrapper | null = null;
      switch (x) {
        case AIProvider.gpt5:
        case AIProvider.gpt51Chat:
        case AIProvider.Gpt4o:
        case AIProvider.gpt41:
        case AIProvider.Gpt4oMini:
        case AIProvider.Gpt35turbo:
          a = new OpenAIWrapper(x);
          break;
        case AIProvider.Claude3SonnetBeta:
        case AIProvider.Claude37SonnetBeta:
        case AIProvider.Claude4Sonnet:
        case AIProvider.Claude45Sonnet:
        case AIProvider.DeepSeekV3:
        case AIProvider.LLama3:
        case AIProvider.LLama3170b:
        case AIProvider.LLama31405b:
        case AIProvider.LLama3290b:
        case AIProvider.LLama3370b:
        case AIProvider.Llama4Maverick:
        case AIProvider.Gemini3Pro:
        case AIProvider.Grok4:
          a = new OpenRouterWrapper(x);
          break;
        default:
          throw new Error('Unknown AIProvider');
      }
      return true;
    } catch (e) {
      return false;
    }
  });
  return modelCache;
}

export function getDefaultModel(): AIProvider {
  var items = ListModels();
  if (items.length == 0) {
    throw new Error(
      'Please configure at least one model to work with. Currently OpenAI and OpenRouter are supported.'
    );
  }
  return items[0];
}

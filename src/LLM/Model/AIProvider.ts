import { Decimal } from '@prisma/client/runtime/library';
import { AIWrapper } from '../AIWrapper';
import { OpenAIWrapper } from '../OpenAI';
import { OpenRouterWrapper } from '../OpenRouter';

export interface AICost {
  input_cost_per_million: Decimal;
  output_cost_per_million: Decimal;
}

export enum AIProvider {
  Gpt4o = 'gpt-4o',
  Gpt4oMini = 'gpt-4o-mini',
  Gpt35turbo = 'gpt-3.5-turbo',
  Claude3SonnetBeta = 'anthropic/claude-3.5-sonnet:beta',
  LLama3 = 'perplexity/llama-3-sonar-large-32k-chat',
  LLama3170b = 'meta-llama/llama-3.1-70b-instruct',
  LLama31405b = 'meta-llama/llama-3.1-405b-instruct',
  LLama3290b = 'meta-llama/llama-3.2-90b-vision-instruct',
  LLama3370b = 'meta-llama/llama-3.3-70b-instruct',
  FireLLava13b = 'fireworks/firellava-13b',
}

export function getAIWrapper(model: AIProvider): AIWrapper {
  switch (model) {
    case AIProvider.Gpt4oMini:
    case AIProvider.Gpt4o:
    case AIProvider.Gpt35turbo:
      return new OpenAIWrapper(model);
    case AIProvider.Claude3SonnetBeta:
    case AIProvider.LLama3:
    case AIProvider.LLama3170b:
    case AIProvider.LLama31405b:
    case AIProvider.LLama3290b:
    case AIProvider.LLama3370b:
    case AIProvider.FireLLava13b:
      return new OpenRouterWrapper(model);
    default:
      return new OpenRouterWrapper(AIProvider.LLama3370b);
  }
}

export function getTokenCost(model: AIProvider): AICost {
  let torReturn: AICost | null = null;
  switch (model) {
    case AIProvider.Claude3SonnetBeta:
      torReturn = {
        input_cost_per_million: new Decimal('3'),
        output_cost_per_million: new Decimal('15'),
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
    case AIProvider.Gpt4o:
      torReturn = {
        input_cost_per_million: new Decimal('5'),
        output_cost_per_million: new Decimal('15'),
      };
      break;
    case AIProvider.Gpt4oMini:
    case AIProvider.FireLLava13b:
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
    case AIProvider.Gpt4oMini:
      return 'GPT-4o-mini';
    case AIProvider.Gpt4o:
      return 'GPT-4o';
    case AIProvider.Gpt35turbo:
      return 'GPT-3.5 Turbo';
    case AIProvider.Claude3SonnetBeta:
      return 'Claude3.5 Sonnet Beta';
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
    case AIProvider.FireLLava13b:
      return 'FireLLava 13b';
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
    AIProvider.Gpt4oMini,
    AIProvider.LLama31405b,
    AIProvider.LLama3170b,
    AIProvider.Gpt4o,
    AIProvider.Gpt35turbo,
    AIProvider.Claude3SonnetBeta,
    AIProvider.LLama3,
    AIProvider.LLama3290b,
    AIProvider.LLama3370b,
    AIProvider.FireLLava13b,
  ].filter((x) => {
    try {
      var a: AIWrapper | null = null;
      switch (x) {
        case AIProvider.Gpt4o:
        case AIProvider.Gpt4oMini:
        case AIProvider.Gpt35turbo:
          a = new OpenAIWrapper(x);
          break;
        case AIProvider.Claude3SonnetBeta:
        case AIProvider.LLama3:
        case AIProvider.LLama3170b:
        case AIProvider.LLama31405b:
        case AIProvider.LLama3290b:
        case AIProvider.LLama3370b:
        case AIProvider.FireLLava13b:
          a = new OpenRouterWrapper(x);
          break;
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

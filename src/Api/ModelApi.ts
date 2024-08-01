import { AIWrapper } from '../LLM/AIWrapper';
import { OpenAIWrapper } from '../LLM/OpenAI';
import { OpenRouterWrapper } from '../LLM/OpenRouter';
import { AIProvider } from '../Models/AIProvider';

export class ModelApi {
  private static modelCache: AIProvider[] | null = null;

  public static GetName(privider: AIProvider): string {
    switch (privider) {
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
      default:
        throw new Error('Unknown AIProvider');
    }
  }

  public ListModels(): AIProvider[] {
    if (ModelApi.modelCache != null) {
      return ModelApi.modelCache;
    }
    ModelApi.modelCache = [
      AIProvider.Gpt4oMini,
      AIProvider.LLama31405b,
      AIProvider.LLama3170b,
      AIProvider.Gpt4o,
      AIProvider.Gpt35turbo,
      AIProvider.Claude3SonnetBeta,
      AIProvider.LLama3,
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
            a = new OpenRouterWrapper(x);
            break;
        }
        return true;
      } catch (e) {
        return false;
      }
    });
    return ModelApi.modelCache;
  }

  public GetDefaultModel(): AIProvider {
    var items = this.ListModels();
    if (items.length == 0) {
      throw new Error(
        'Please configure at least one model to work with. Currently OpenAI and OpenRouter are supported.'
      );
    }
    return items[0];
  }
}

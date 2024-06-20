import { AIWrapper } from '../LLM/AIWrapper';
import { OpenAIWrapper } from '../LLM/OpenAI';
import { OpenRouterWrapper } from '../LLM/OpenRouter';
import { AIProvider } from '../Models/AIProvider';

export class ModelApi {
  private static modelCache: AIProvider[] | null = null;

  public ListModels(): AIProvider[] {
    if (ModelApi.modelCache != null) {
      return ModelApi.modelCache;
    }
    ModelApi.modelCache = [
      AIProvider.Gpt4o,
      AIProvider.Claude3SonnetBeta,
    ].filter((x) => {
      try {
        var a: AIWrapper | null = null;
        switch (x) {
          case AIProvider.Gpt4o:
            a = new OpenAIWrapper();
            break;
          case AIProvider.Claude3SonnetBeta:
            a = new OpenRouterWrapper();
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

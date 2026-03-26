import axios from 'axios';
import { ToolRegistry } from './ToolRegistry';
import { ChatRequest } from '../Model/ChatRequest';

const TOOL_NAME = 'query_custom_papers';

function parseBooleanFlag(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return ['true', '1', 'yes', 'y', 'on'].includes(normalized);
}

/**
 * Register the query_custom_papers backend tool.
 *
 * Only registers when LIBRARY_INTEGRATION_ENABLED=true at startup.
 * Searches only the 'custom' dataset via the unified /chat endpoint.
 */
export function registerCustomPapersTool(): void {
  const envEnabled = parseBooleanFlag(process.env.LIBRARY_INTEGRATION_ENABLED);
  if (!envEnabled) {
    return;
  }

  const registry = ToolRegistry.getInstance();

  registry.register(
    TOOL_NAME,
    {
      type: 'function',
      function: {
        name: TOOL_NAME,
        description:
          'Search the custom papers collection for relevant excerpts based on a query. ' +
          'Use this when the user asks about topics that might be covered in custom uploaded papers.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query to find relevant paper excerpts',
            },
          },
          required: ['query'],
        },
      },
    },
    async (ctx) => {
      const query = ctx.arguments.query;
      if (typeof query !== 'string' || query.trim().length === 0) {
        return 'Error: query parameter is required and must be a non-empty string.';
      }

      const baseUrl = (process.env.LIBRARIAN_API_URL ?? '').trim();
      if (!baseUrl) {
        return 'Library service is not configured.';
      }

      const endpoint = `${baseUrl.replace(/\/$/, '')}/unified/chat`;

      try {
        const response = await axios.post(
          endpoint,
          {
            messages: [{ role: 'user', content: query }],
            datasets: ['custom'],
          },
          {
            timeout: 30000,
          }
        );

        const answer = response.data?.answer;
        if (typeof answer !== 'string' || answer.trim().length === 0) {
          return 'No relevant excerpts found for this query.';
        }

        let result = answer.trim();

        const sources = Array.isArray(response.data?.sources)
          ? response.data.sources
          : [];
        if (sources.length > 0) {
          const formattedSources = sources
            .map((src: any) => {
              const filename = src?.filename ?? 'unknown';
              const chunkIndex = src?.chunk_index;
              if (chunkIndex === undefined || chunkIndex === null) {
                return `- ${filename}`;
              }
              return `- ${filename}#${chunkIndex}`;
            })
            .join('\n');
          if (formattedSources.length > 0) {
            result += '\n\nSources:\n' + formattedSources;
          }
        }

        return result;
      } catch (error: any) {
        if (axios.isAxiosError(error)) {
          console.error('Custom papers tool API error:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            code: error.code,
            endpoint,
          });
        } else {
          console.error('Custom papers tool error:', error?.message ?? error);
        }
        return 'Failed to query custom papers. The service may be temporarily unavailable.';
      }
    },
    (request: ChatRequest) => !!request.libraryIntegrationEnabled
  );
}

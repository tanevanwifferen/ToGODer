import axios from 'axios';
import pdf2md from '@opendocsg/pdf2md';
import { ToolRegistry } from './ToolRegistry';
import { ChatRequest } from '../Model/ChatRequest';

function parseBooleanFlag(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return ['true', '1', 'yes', 'y', 'on'].includes(normalized);
}

interface ArxivSearchResult {
  arxiv_id: string;
  title: string;
  abstract: string;
  categories: string;
  authors: string;
  similarity: number;
}

/**
 * Register arxiv_search and arxiv_read_paper backend tools.
 *
 * Only registers when LIBRARY_INTEGRATION_ENABLED=true at startup.
 * Per-request, the tools are only included when the request also has
 * libraryIntegrationEnabled=true.
 */
export function registerArxivTools(): void {
  const envEnabled = parseBooleanFlag(process.env.LIBRARY_INTEGRATION_ENABLED);
  if (!envEnabled) {
    return;
  }

  const registry = ToolRegistry.getInstance();
  const isEnabled = (request: ChatRequest) =>
    !!request.libraryIntegrationEnabled;

  // --- arxiv_search ---
  registry.register(
    'arxiv_search',
    {
      type: 'function',
      function: {
        name: 'arxiv_search',
        description:
          'Search arXiv for scientific papers matching a query. ' +
          'Returns the top 5 results with title, authors, arXiv ID, and abstract.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query for finding scientific papers',
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

      const endpoint = `${baseUrl.replace(/\/$/, '')}/arxiv/search`;

      try {
        const response = await axios.post(
          endpoint,
          { query: query.trim(), topK: 5 },
          { timeout: 15000 }
        );

        const matches: ArxivSearchResult[] = response.data?.matches ?? [];
        if (matches.length === 0) {
          return 'No papers found for this query.';
        }

        return matches
          .map(
            (m, i) =>
              `[${i + 1}] ${m.title}\n` +
              `    Authors: ${m.authors}\n` +
              `    arXiv ID: ${m.arxiv_id}\n` +
              `    Categories: ${m.categories}\n` +
              `    Abstract: ${m.abstract}`
          )
          .join('\n\n');
      } catch (error: any) {
        if (axios.isAxiosError(error)) {
          console.error('ArXiv search API error:', {
            message: error.message,
            status: error.response?.status,
            endpoint,
          });
        } else {
          console.error('ArXiv search error:', error?.message ?? error);
        }
        return 'Failed to search arXiv. The service may be temporarily unavailable.';
      }
    },
    isEnabled
  );

  // --- arxiv_read_paper ---
  registry.register(
    'arxiv_read_paper',
    {
      type: 'function',
      function: {
        name: 'arxiv_read_paper',
        description:
          'Fetch and read a full arXiv paper by its arXiv ID. ' +
          'Downloads the PDF, converts it to markdown, and returns the paper content. ' +
          'Use arxiv_search first to find the arXiv ID.',
        parameters: {
          type: 'object',
          properties: {
            arxiv_id: {
              type: 'string',
              description:
                'The arXiv paper ID (e.g. "2301.07041" or "2301.07041v1")',
            },
          },
          required: ['arxiv_id'],
        },
      },
    },
    async (ctx) => {
      const arxivId = ctx.arguments.arxiv_id;
      if (typeof arxivId !== 'string' || arxivId.trim().length === 0) {
        return 'Error: arxiv_id parameter is required and must be a non-empty string.';
      }

      const pdfUrl = `https://arxiv.org/pdf/${arxivId.trim()}`;

      try {
        const response = await axios.get(pdfUrl, {
          responseType: 'arraybuffer',
          timeout: 90000,
        });

        const pdfBuffer = Buffer.from(response.data);
        const markdown = await pdf2md(pdfBuffer);

        if (markdown.trim().length === 0) {
          return 'The PDF was retrieved but could not be converted to readable text.';
        }

        return markdown;
      } catch (error: any) {
        if (axios.isAxiosError(error)) {
          console.error('ArXiv PDF fetch error:', {
            message: error.message,
            status: error.response?.status,
            url: pdfUrl,
          });
        } else {
          console.error('ArXiv read paper error:', error?.message ?? error);
        }
        return 'Failed to fetch or convert the arXiv paper. The service may be temporarily unavailable.';
      }
    },
    isEnabled
  );
}

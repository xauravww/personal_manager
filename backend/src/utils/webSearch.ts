import axios from 'axios';

interface WebSearchResult {
  title: string;
  url: string;
  content: string;
  engine: string;
  category?: string;
  publishedDate?: string;
}

interface WebSearchResponse {
  query: string;
  number_of_results: number;
  results: WebSearchResult[];
  answers?: any[];
  corrections?: any[];
  infoboxes?: any[];
  suggestions?: string[];
  unresponsive_engines?: string[];
}

export interface WebSearchOptions {
  pageno?: number;
  time_range?: 'day' | 'week' | 'month' | 'year';
  categories?: string;
  engines?: string;
  enabled_engines?: string;
  disabled_engines?: string;
  language?: string;
  safesearch?: number;
  theme?: string;
  format?: string;
  autocomplete?: string;
  image_proxy?: boolean;
  results_on_new_tab?: number;
  enabled_plugins?: string;
  disabled_plugins?: string;
}

export async function performWebSearch(
  query: string,
  options: WebSearchOptions = {}
): Promise<WebSearchResponse> {
  // Try multiple search engines in order of reliability
  const searchUrls = [
    process.env.WEB_SEARCH_URL || 'https://search.canine.tools/search',
    'https://searx.org/search',
    'https://search.brave.com/search'
  ];

  let lastError: any = null;

  for (const searchUrl of searchUrls) {
    try {
      const defaultOptions: WebSearchOptions = {
        format: 'json',
        pageno: 1,
        time_range: 'month',
        categories: 'it,news',
        engines: 'duckduckgo,bing',
        enabled_engines: 'duckduckgo,wikipedia',
        disabled_engines: '',
        language: 'en',
        safesearch: 1,
        autocomplete: 'duckduckgo',
        image_proxy: true,
        results_on_new_tab: 0,
        theme: 'simple',
        enabled_plugins: 'Hash_plugin,Self_Information,Tracker_URL_remover,Ahmia_blacklist',
        disabled_plugins: '',
        ...options
      };

      console.log(`Trying web search with ${searchUrl} for query: "${query}"`);

      const response = await axios.get(searchUrl, {
        params: {
          q: query,
          ...defaultOptions
        },
        headers: {
          'User-Agent': 'curl/7.68.0',
          'Accept': '*/*',
        },
        timeout: 10000, // 10 seconds timeout per attempt
      });

      if (response.status !== 200) {
        throw new Error(`Web search API returned status ${response.status}`);
      }

      const data: WebSearchResponse = response.data;

      // Validate response structure
      if (!data.results || !Array.isArray(data.results)) {
        throw new Error('Invalid response format from web search API');
      }

      console.log(`Web search successful with ${searchUrl}, found ${data.results.length} results`);
      return data;

    } catch (error: any) {
      console.error(`Web search failed with ${searchUrl}:`, error.message);
      lastError = error;

      // Continue to next search URL
      continue;
    }
  }

  // If all search URLs failed, throw the last error
  console.error('All web search URLs failed');
  throw new Error(`Web search failed: ${lastError?.message || 'All search engines unavailable'}`);
}

export function formatWebSearchResults(searchResponse: WebSearchResponse): string {
  const { query, number_of_results, results } = searchResponse;

  if (!results || results.length === 0) {
    return `No web search results found for "${query}".`;
  }

  let formatted = `Web search results for "${query}" (${number_of_results} total results):\n\n`;

  results.slice(0, 8).forEach((result, index) => {
    formatted += `${index + 1}. **${result.title}**\n`;
    formatted += `   ${result.content}\n`;
    formatted += `   Source: ${result.url}\n`;
    if (result.engine) {
      formatted += `   Engine: ${result.engine}\n`;
    }
    formatted += '\n';
  });

  if (results.length > 8) {
    formatted += `... and ${number_of_results - 8} more results.\n`;
  }

  return formatted;
}
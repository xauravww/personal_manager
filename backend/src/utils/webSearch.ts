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
  // Use a public SearXNG instance that doesn't have aggressive bot protection
  const searchUrl = process.env.WEB_SEARCH_URL || 'https://searx.tiekoetter.com/search';

  const defaultOptions = {
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
    image_proxy: 'True',
    results_on_new_tab: 0,
    theme: 'simple',
    enabled_plugins: 'Hash_plugin,Self_Information,Tracker_URL_remover,Ahmia_blacklist',
    disabled_plugins: '',
    ...options
  };

  // Retry logic with exponential backoff
  const maxRetries = 2;
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 3000); // 1s, 2s max 3s
        console.log(`⏳ Waiting ${delayMs}ms before retry attempt ${attempt}...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      console.log(`🔍 ${attempt > 0 ? `Retry ${attempt}:` : 'Trying'} web search for: "${query}"`);

      const response = await axios.get(searchUrl, {
        params: {
          q: query,
          ...defaultOptions
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:142.0) Gecko/20100101 Firefox/142.0',
          'Accept': 'application/json, text/html, */*',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 15000,
      });

      console.log(`📊 Response status: ${response.status}, Results: ${response.data?.results?.length || 0}`);

      if (response.status !== 200) {
        throw new Error(`Web search API returned status ${response.status}`);
      }

      const data: WebSearchResponse = response.data;

      if (!data.results || !Array.isArray(data.results)) {
        console.error('Invalid response structure:', JSON.stringify(data).substring(0, 200));
        throw new Error('Invalid response format from web search API');
      }

      console.log(`✅ Web search successful, found ${data.results.length} results`);
      return data;

    } catch (error: any) {
      lastError = error;
      const isRateLimit = error.response?.status === 429;

      console.error(`❌ Web search attempt ${attempt + 1}/${maxRetries + 1} failed:`, error.message);

      // If it's a rate limit and we have retries left, continue
      if (isRateLimit && attempt < maxRetries) {
        console.log('⚠️ Rate limited, will retry...');
        continue;
      }

      // If not a rate limit or no retries left, throw immediately
      if (!isRateLimit || attempt === maxRetries) {
        break;
      }
    }
  }

  throw new Error(`Web search failed after ${maxRetries + 1} attempts: ${lastError?.response?.status === 429 ? 'Rate limited (429)' : lastError?.message}`);
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
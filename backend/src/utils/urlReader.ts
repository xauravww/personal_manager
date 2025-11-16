import axios from 'axios';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import zlib from 'zlib';

// Utility function for retry logic with exponential backoff
async function retryWithBackoff(fn: () => Promise<any>, maxRetries = 3, baseDelay = 1000): Promise<any> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (attempt === maxRetries) {
        break;
      }

      // Check if error is retryable
      const isRetryable = error.code === 'ECONNABORTED' ||
                         error.code === 'ENOTFOUND' ||
                         error.code === 'ECONNREFUSED' ||
                         error.code === 'ETIMEDOUT' ||
                         (error.response && error.response.status >= 500);

      if (!isRetryable) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Decode response data properly based on content-type charset
function decodeResponseData(data: any, contentType?: string): string {
  // Handle Buffer data (compressed or binary)
  if (Buffer.isBuffer(data)) {
    // Try to detect if it's compressed
    try {
      // Check if it's gzip compressed
      if (data.length > 2 && data[0] === 0x1f && data[1] === 0x8b) {
        // Gzip compressed - decompress it
        const decompressed = zlib.gunzipSync(data);
        return decompressed.toString('utf-8');
      }
      // Check if it's deflate compressed
      else if (data.length > 0) {
        try {
          const decompressed = zlib.inflateSync(data);
          return decompressed.toString('utf-8');
          } catch {
          // Not deflate, try as raw buffer
          return data.toString('utf-8');
        }
      }
    } catch (error) {
      console.warn('Failed to decompress data, treating as raw buffer:', error);
      return data.toString('utf-8');
    }
  }

  // If data is already a string, try to detect encoding issues
  if (typeof data === 'string') {
    // Check for common encoding indicators in content-type
    const charsetMatch = contentType?.match(/charset=([^;]+)/i);
    const charset = charsetMatch ? charsetMatch[1].toLowerCase() : 'utf-8';

    // If charset is not UTF-8, we need to handle it properly
    if (charset !== 'utf-8' && charset !== 'utf8') {
      try {
        // For non-UTF-8 charsets, convert using Buffer
        // This handles cases where axios incorrectly assumes UTF-8
        const buffer = Buffer.from(data, 'latin1'); // Use latin1 for binary-like data
        return buffer.toString(charset as any);
    } catch (_error) {
         console.warn(`Failed to decode with charset ${charset}, falling back to UTF-8:`, _error);
         return data; // Return original data as fallback
       }
    }
  }

  return data;
}

function processContent(content: string, contentType?: string, returnRaw = false): string {
  if (returnRaw) {
    return content;
  }

  // Check if content is HTML
  const isHtml = contentType?.includes('text/html') ||
                 content.toLowerCase().includes('<html') ||
                 content.toLowerCase().includes('<!doctype html');

  if (isHtml) {
    try {
      return NodeHtmlMarkdown.translate(content);
    } catch (error) {
      console.warn('Failed to convert HTML to Markdown, returning raw content:', error);
      return content;
    }
  }

  // For non-HTML content, return as-is
  return content;
}

function applyCharacterPagination(content: string, startChar = 0, maxLength?: number): string {
  if (startChar >= content.length) {
    return "";
  }

  const start = Math.max(0, startChar);
  const end = maxLength ? Math.min(content.length, start + maxLength) : content.length;

  return content.slice(start, end);
}

function extractSection(markdownContent: string, sectionHeading: string): string {
  const lines = markdownContent.split('\n');
  const sectionRegex = new RegExp(`^#{1,6}\\s*.*${sectionHeading}.*$`, 'i');

  let startIndex = -1;
  let currentLevel = 0;

  // Find the section start
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (sectionRegex.test(line)) {
      startIndex = i;
      currentLevel = (line.match(/^#+/) || [''])[0].length;
      break;
    }
  }

  if (startIndex === -1) {
    return "";
  }

  // Find the section end (next heading of same or higher level)
  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^#+/);
    if (match && match[0].length <= currentLevel) {
      endIndex = i;
      break;
    }
  }

  return lines.slice(startIndex, endIndex).join('\n');
}

function extractParagraphRange(markdownContent: string, range: string): string {
  const paragraphs = markdownContent.split('\n\n').filter(p => p.trim().length > 0);

  // Parse range (e.g., "1-5", "3", "10-")
  const rangeMatch = range.match(/^(\d+)(?:-(\d*))?$/);
  if (!rangeMatch) {
    return "";
  }

  const start = parseInt(rangeMatch[1]) - 1; // Convert to 0-based index
  const endStr = rangeMatch[2];

  if (start < 0 || start >= paragraphs.length) {
    return "";
  }

  if (endStr === undefined) {
    // Single paragraph (e.g., "3")
    return paragraphs[start] || "";
  } else if (endStr === "") {
    // Range to end (e.g., "10-")
    return paragraphs.slice(start).join('\n\n');
  } else {
    // Specific range (e.g., "1-5")
    const end = parseInt(endStr);
    return paragraphs.slice(start, end).join('\n\n');
  }
}

function extractHeadings(markdownContent: string): string {
  const lines = markdownContent.split('\n');
  const headings = lines.filter(line => /^#{1,6}\s/.test(line));

  if (headings.length === 0) {
    return "No headings found in the content.";
  }

  return headings.join('\n');
}

function applyPaginationOptions(markdownContent: string, options: any): string {
  let result = markdownContent;

  // Apply heading extraction first if requested
  if (options.readHeadings) {
    return extractHeadings(result);
  }

  // Apply section extraction
  if (options.section) {
    result = extractSection(result, options.section);
    if (result === "") {
      return `Section "${options.section}" not found in the content.`;
    }
  }

  // Apply paragraph range filtering
  if (options.paragraphRange) {
    result = extractParagraphRange(result, options.paragraphRange);
    if (result === "") {
      return `Paragraph range "${options.paragraphRange}" is invalid or out of bounds.`;
    }
  }

  // Apply character-based pagination last
  if (options.startChar !== undefined || options.maxLength !== undefined) {
    result = applyCharacterPagination(result, options.startChar, options.maxLength);
  }

  return result;
}

export interface UrlReaderOptions {
  returnRaw?: boolean;
  maxRetries?: number;
  startChar?: number;
  maxLength?: number;
  section?: string;
  paragraphRange?: string;
  readHeadings?: boolean;
}

export async function readUrlContent(
  url: string,
  timeoutMs = 10000,
  options: UrlReaderOptions = {}
): Promise<string> {
  const {
    returnRaw = false,
    maxRetries = 3,
    ...paginationOptions
  } = options;

  const startTime = Date.now();
  console.log(`Fetching URL: ${url} (returnRaw: ${returnRaw}, maxRetries: ${maxRetries})`);

  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
   } catch {
     const errorMsg = `Invalid URL format: ${url}. Please provide a valid URL starting with http:// or https://.`;
     console.error(errorMsg);
     throw new Error(errorMsg);
   }

  try {
    const fetchContent = async () => {
      const response = await axios.get(url, {
        timeout: timeoutMs,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'identity', // Disable compression to avoid encoding issues
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0'
        },
        maxRedirects: 5,
        validateStatus: function (status: number) {
          return status < 500; // Accept all status codes below 500
        }
      });

      if (response.status >= 400) {
        const errorMsg = `HTTP ${response.status}: ${response.statusText}. The server returned an error response.`;
        throw new Error(errorMsg);
      }

      const rawContent = response.data;
      const contentType = response.headers['content-type'];

      // Decode content properly based on charset
      const content = decodeResponseData(rawContent, contentType);

      if (!content || (typeof content === 'string' && content.trim().length === 0)) {
        const errorMsg = "Website returned empty content. The response body was empty or null.";
        throw new Error(errorMsg);
      }

      console.log(`Fetched ${content.length} bytes from ${url}. Content-Type: ${contentType || 'unknown'}`);

      // Process content based on type and options
      const processedContent = processContent(content, contentType, returnRaw);

      if (!processedContent || processedContent.trim().length === 0) {
        console.warn(`Empty processed content for: ${url}`);
        return `⚠️ Empty content after processing for URL: ${url}`;
      }

      return processedContent;
    };

    const content = await retryWithBackoff(fetchContent, maxRetries);

    // Apply pagination options to the processed content
    const result = applyPaginationOptions(content, paginationOptions);

    const duration = Date.now() - startTime;
    console.log(`Successfully processed URL: ${url} (${result.length} chars in ${duration}ms)`);
    return result;

  } catch (error: any) {
    let errorMsg = `Failed to fetch and process URL: ${url}`;

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorMsg = `Request timed out after ${timeoutMs}ms. The server took too long to respond.`;
      console.error(`${errorMsg} (URL: ${url})`);
    } else if (error.code === 'ENOTFOUND') {
      errorMsg = `Host not found. The domain ${parsedUrl.hostname} could not be resolved.`;
      console.error(`${errorMsg} (URL: ${url})`);
    } else if (error.code === 'ECONNREFUSED') {
      errorMsg = `Connection refused. The server at ${parsedUrl.hostname} is not accepting connections.`;
      console.error(`${errorMsg} (URL: ${url})`);
    } else if (error.response) {
      errorMsg = `Server error: HTTP ${error.response.status} - ${error.response.statusText}.`;
      console.error(`${errorMsg} (URL: ${url})`);
    } else {
      errorMsg += ` - ${error.message}`;
      console.error(`Unexpected error fetching URL: ${url}`, error);
    }

    throw new Error(errorMsg);
  }
}
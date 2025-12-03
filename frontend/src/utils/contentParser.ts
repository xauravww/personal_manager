// Interface for parsed content
export interface ParsedContent {
  explanation: string;
  hasEmbeddedQuiz: boolean;
  hasEmbeddedCode: boolean;
}

// Interface for extracted structured data
export interface ExtractedData {
  response?: string;
  code?: { language: string; snippet: string };
  quiz?: { question: string; options: string[]; correctAnswer: number };
  mastery_achieved?: boolean;
}

// Function to parse response content into structured sections
export const parseResponseContent = (response: string): ParsedContent => {
  let explanation = response;

  // Remove embedded JSON (starts with { and ends with })
  explanation = explanation.replace(/\{[\s\S]*\}/, '').trim();

  // Remove quiz section
  const quizRegex = /(?:\*\*Quiz Time!\*\*|\*\*Quiz:\*\*|Here's a quiz|Quiz:).*?Choose.*?\./si;
  explanation = explanation.replace(quizRegex, '').trim();

  // Remove code blocks
  explanation = explanation.replace(/```[\s\S]*?```/g, '').trim();

  // Clean up extra newlines
  explanation = explanation.replace(/\n{3,}/g, '\n\n').trim();

  // Detect presence of embedded quiz/code in original response
  const hasEmbeddedQuiz = /(?:\*\*Quiz Time!\*\*|\*\*Quiz:\*\*|Here's a quiz|Quiz:)/i.test(response);
  const hasEmbeddedCode = /```[\s\S]*?```/.test(response);

  return { explanation, hasEmbeddedQuiz, hasEmbeddedCode };
};

// Function to extract structured data from response text
export const extractStructuredData = (content: string): ExtractedData | null => {
  // Look for JSON objects in the content (greedy to match complete objects)
  const jsonRegex = /\{[\s\S]*\}/g;
  const matches = content.match(jsonRegex);

  if (!matches) return null;

  for (const match of matches) {
    try {
      const parsed = JSON.parse(match);
      if (parsed.response || parsed.code || parsed.quiz) {
        return parsed;
      }
    } catch {
      // Not valid JSON, continue
    }
  }

  return null;
};

// Function to parse content and extract code blocks from explanation only
export const parseContent = (content: string) => {
  const parsed = parseResponseContent(content);
  const explanation = parsed.explanation;

  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  const parts: Array<{ type: 'text' | 'code', content?: string, language?: string, snippet?: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(explanation)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: explanation.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', language: match[1] || 'text', snippet: match[2] });
    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < explanation.length) {
    parts.push({ type: 'text', content: explanation.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: explanation }];
};
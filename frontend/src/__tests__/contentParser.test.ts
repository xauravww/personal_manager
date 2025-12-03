import { parseResponseContent, ParsedContent, extractStructuredData, ExtractedData } from '../utils/contentParser';

// Mock the functions since they are inside the component
// We'll extract them to a separate file for testing

describe('Content Parser', () => {
  describe('parseResponseContent', () => {
    it('should extract explanation from response with quiz', () => {
      const response = `You chose "ok" which isn't a valid response to the quiz. Let's try again.

**Quiz:** What is the valid way to declare a variable in Python?

A) \`var x = 5\`
B) \`x = 5\`
C) \`let x = 5\`
D) \`declare x = 5\`

Choose a response from the options above.`;

      const result: ParsedContent = parseResponseContent(response);

      expect(result.explanation).toBe(`You chose "ok" which isn't a valid response to the quiz. Let's try again.`);
      expect(result.hasEmbeddedQuiz).toBe(true);
      expect(result.hasEmbeddedCode).toBe(false);
    });

    it('should extract explanation from response with code', () => {
      const response = `Here is the full code:
\`\`\`python
x = 5
y = "hello"
\`\`\`

This code declares two variables.`;

      const result: ParsedContent = parseResponseContent(response);

      expect(result.explanation).toBe(`Here is the full code:

This code declares two variables.`);
      expect(result.hasEmbeddedQuiz).toBe(false);
      expect(result.hasEmbeddedCode).toBe(true);
    });

    it('should handle response with both quiz and code', () => {
      const response = `Let's learn about variables.

**Quiz:** What is a variable?

A) A number
B) A storage location
C) A function

Choose an answer.

\`\`\`python
x = 5
\`\`\`

Variables store values.`;

      const result: ParsedContent = parseResponseContent(response);

      expect(result.explanation).toBe(`Let's learn about variables.

Variables store values.`);
      expect(result.hasEmbeddedQuiz).toBe(true);
      expect(result.hasEmbeddedCode).toBe(true);
    });

    it('should handle response with no embedded content', () => {
      const response = `This is just an explanation with no quiz or code.`;

      const result: ParsedContent = parseResponseContent(response);

      expect(result.explanation).toBe(`This is just an explanation with no quiz or code.`);
      expect(result.hasEmbeddedQuiz).toBe(false);
      expect(result.hasEmbeddedCode).toBe(false);
    });

    it('should handle empty response', () => {
      const response = ``;

      const result: ParsedContent = parseResponseContent(response);

      expect(result.explanation).toBe(``);
      expect(result.hasEmbeddedQuiz).toBe(false);
      expect(result.hasEmbeddedCode).toBe(false);
    });
  });

  describe('extractStructuredData', () => {
    it('should extract JSON from response text', () => {
      const content = `Here's some text {
  "response": "Hello",
  "code": {
    "language": "python",
    "snippet": "print(\\"hi\\")"
  },
  "quiz": {
    "question": "What?",
    "options": ["A", "B"],
    "correctAnswer": 0
  }
} and more text.`;

      const result: ExtractedData | null = extractStructuredData(content);

      expect(result).toEqual({
        response: "Hello",
        code: {
          language: "python",
          snippet: "print(\"hi\")"
        },
        quiz: {
          question: "What?",
          options: ["A", "B"],
          correctAnswer: 0
        }
      });
    });

    it('should return null if no valid JSON found', () => {
      const content = `Just some text without JSON.`;

      const result: ExtractedData | null = extractStructuredData(content);

      expect(result).toBeNull();
    });

    it('should handle JSON in code blocks', () => {
      const content = `Here's an example:
\`\`\`
{
  "code": {
    "language": "python",
    "snippet": "print(\\"test\\")"
  }
}
\`\`\`
End.`;

      const result: ExtractedData | null = extractStructuredData(content);

      expect(result).toEqual({
        code: {
          language: "python",
          snippet: "print(\"test\")"
        }
      });
    });
  });
});
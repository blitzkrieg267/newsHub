// @ts-ignore: No types for @google/genai yet
import { GoogleGenAI } from "@google/genai";

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
  }>;
  promptFeedback?: any;
  usageMetadata?: any;
  modelVersion?: string;
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  raw_content?: string;
  published_date?: string;
}

interface TavilyResponse {
  answer: string;
  query: string;
  response_time: number;
  images?: Array<{
    url: string;
    description: string;
  }>;
  results: TavilySearchResult[];
}

interface MultiAgentResponse {
  source: 'gemini' | 'tavily';
  answer: string;
  query: string;
  response_time: number;
  results?: TavilySearchResult[];
  raw_response?: any;
}


// Helper to add inline citations to Gemini response text
type GeminiCitation = { uri: string; index: number };
function addCitations(response: any): { text: string; citations: GeminiCitation[] } {
  let text = response.text;
  const supports = response.candidates?.[0]?.groundingMetadata?.groundingSupports || [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const citations: GeminiCitation[] = [];
  // Sort supports by end_index in descending order to avoid shifting issues when inserting.
  const sortedSupports = [...supports].sort(
    (a: any, b: any) => (b.segment?.endIndex ?? 0) - (a.segment?.endIndex ?? 0)
  );
  for (const support of sortedSupports) {
    const endIndex = support.segment?.endIndex;
    if (endIndex === undefined || !support.groundingChunkIndices?.length) continue;
    const citationLinks = support.groundingChunkIndices
      .map((i: number) => {
        const uri = chunks[i]?.web?.uri;
        if (uri) {
          citations.push({ uri, index: i + 1 });
          return `[${i + 1}](${uri})`;
        }
        return null;
      })
      .filter(Boolean);
    if (citationLinks.length > 0) {
      const citationString = citationLinks.join(", ");
      text = text.slice(0, endIndex) + citationString + text.slice(endIndex);
    }
  }
  return { text, citations };
}

// Gemini search using @google/genai
async function searchWithGemini(query: string): Promise<MultiAgentResponse | null> {
  try {
    const startTime = Date.now();
    const ai = new GoogleGenAI({ apiKey: VITE_GEMINI_API_KEY }); // API key from env
    // Enhanced system prompt for card-based, concise, multi-section markdown output
    const systemPrompt = `You are an AI news and current affairs search assistant with real-time web access. 

When answering, ALWAYS:
- Structure your response as a set of concise, clearly separated sections using markdown headings (## or ###) for each aspect, fact, or angle relevant to the query.
- Each section should be brief, focused, and suitable for display in a card (2-6 sentences or bullet points per section).
- Use bullet points, short lists, or concise explanations instead of long paragraphs.
- Avoid repetition and keep the overall answer as short and visually scannable as possible.
- If possible, include sections like "Key Facts", "Background", "Recent Developments", "Analysis", etc., as appropriate for the query.
- Use markdown formatting for clarity.
- If you cite sources, use markdown links.

User Query: ${query}`;
    const config = {
      tools: [{ googleSearch: {} }],
      generationConfig: {
        candidateCount: 1,
        maxOutputTokens: 512,
        temperature: 0.2,
        thinkingBudget: 0, // prioritize speed/cost
      },
    };
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: systemPrompt,
      ...config,
    });
    const responseTime = (Date.now() - startTime) / 1000;
    if (!response.text?.trim()) return null;
    const { text, citations } = addCitations(response);
    let results: TavilySearchResult[] | undefined = undefined;
    if (citations.length > 0) {
      results = citations.map((c) => ({
        title: `Source [${c.index}]`,
        url: c.uri,
        content: c.uri,
        score: 1,
      }));
    }
    return {
      source: "gemini",
      answer: text,
      query,
      response_time: responseTime,
      results,
      raw_response: response,
    };
  } catch (error) {
    console.warn("Gemini search failed:", error);
    return null;
  }
}

export async function searchWithGeminiOnly(query: string): Promise<MultiAgentResponse> {
  console.log(`Starting Gemini-only search for: "${query}"`);
  const geminiResult = await searchWithGemini(query);
  if (geminiResult) {
    console.log('Gemini search successful');
    return geminiResult;
  }
  // If Gemini fails, throw an error instead of falling back
  throw new Error('Gemini AI is unable to access current information for this query. Please enable Tavily fallback for enhanced search capabilities.');
}

async function searchWithTavily(query: string): Promise<MultiAgentResponse> {
  try {
    const startTime = Date.now();
    
    const response = await fetch('https://api.picaos.com/v1/passthrough/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pica-secret': PICA_SECRET_KEY,
        'x-pica-connection-key': PICA_TAVILY_CONNECTION_KEY,
        'x-pica-action-id': 'conn_mod_def::GCMZGXIH9aE::u-LjTRVgSdC0O_VGbS317w',
      },
      body: JSON.stringify({
        query,
        search_depth: 'basic',
        topic: 'news',
        max_results: 8,
        include_answer: 'basic',
        include_images: true,
        days: 7
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API request failed: ${response.status} ${response.statusText}`);
    }

    const data: TavilyResponse = await response.json();
    const responseTime = (Date.now() - startTime) / 1000;

    return {
      source: 'tavily',
      answer: data.answer || 'No summary available',
      query: data.query,
      response_time: responseTime,
      results: data.results || [],
      raw_response: data
    };
  } catch (error) {
    console.error('Tavily search failed:', error);
    throw new Error('Failed to search news. Please try again.');
  }
}

export async function multiAgentNewsSearch(query: string): Promise<MultiAgentResponse> {
  console.log(`Starting multi-agent search for: "${query}"`);
  // 1. Try Gemini first
  console.log('Attempting search with Gemini...');
  const geminiResult = await searchWithGemini(query);
  if (geminiResult) {
    console.log('Gemini search successful');
    return geminiResult;
  }
  // 2. Fallback to Tavily
  console.log('Gemini failed or returned fallback, switching to Tavily...');
  const tavilyResult = await searchWithTavily(query);
  console.log('Tavily search successful');
  return tavilyResult;
}

export function getCategoryQuery(category: string): string {
  const categoryQueries: Record<string, string> = {
    'World Events': 'latest world news global developments international affairs current events',
    'Politics': 'political news government elections policy latest political updates',
    'Technology': 'latest technology news AI software development cybersecurity tech trends',
    'Business': 'business news finance markets economy corporate earnings stock market',
    'Health': 'health news medical research wellness fitness nutrition healthcare',
    'Science': 'science news research discoveries climate space exploration scientific breakthroughs',
    'Sports': 'sports news football basketball soccer tennis latest scores championships',
    'Entertainment': 'entertainment news movies music celebrities hollywood awards shows',
  };

  return categoryQueries[category] || 'latest breaking news current events worldwide';
}
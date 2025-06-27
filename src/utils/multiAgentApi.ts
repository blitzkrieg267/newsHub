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

// Get API keys from environment variables with better error handling
const VITE_GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const PICA_SECRET_KEY = import.meta.env.VITE_PICA_SECRET_KEY;
const PICA_TAVILY_CONNECTION_KEY = import.meta.env.VITE_PICA_TAVILY_CONNECTION_KEY;

// Debug logging for environment variables (remove in production)
console.log('Environment variables check:', {
  hasGeminiKey: !!VITE_GEMINI_API_KEY,
  hasPicaSecret: !!PICA_SECRET_KEY,
  hasPicaTavily: !!PICA_TAVILY_CONNECTION_KEY,
  geminiKeyLength: VITE_GEMINI_API_KEY ? VITE_GEMINI_API_KEY.length : 0
});

// Gemini search using @google/genai with proper configuration
async function searchWithGemini(query: string): Promise<MultiAgentResponse | null> {
  try {
    console.log('Starting Gemini search with query:', query);
    
    // Check if API key is available and valid
    if (!VITE_GEMINI_API_KEY || VITE_GEMINI_API_KEY.trim() === '') {
      console.error('Gemini API key not found or empty in environment variables');
      console.error('Expected: VITE_GEMINI_API_KEY, Got:', VITE_GEMINI_API_KEY ? `${VITE_GEMINI_API_KEY.substring(0, 10)}...` : 'undefined');
      throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your environment variables and restart the development server.');
    }
    
    // Validate API key format (basic check)
    if (!VITE_GEMINI_API_KEY.startsWith('AIza')) {
      console.error('Invalid Gemini API key format. Expected key to start with "AIza"');
      throw new Error('Invalid Gemini API key format. Please check your VITE_GEMINI_API_KEY in the environment variables.');
    }
    
    const startTime = Date.now();
    
    // Initialize GoogleGenAI with explicit error handling
    let genAI;
    try {
      genAI = new GoogleGenAI(VITE_GEMINI_API_KEY);
    } catch (initError) {
      console.error('Failed to initialize GoogleGenAI:', initError);
      throw new Error('Failed to initialize Gemini AI client. Please check your API key configuration.');
    }
    
    // Create the model with proper configuration
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        candidateCount: 1,
        maxOutputTokens: 1024,
        temperature: 0.3,
      },
    });

    // Enhanced prompt for news search
    const prompt = `You are a news search assistant. Please provide a comprehensive answer about: "${query}"

Structure your response with clear sections using markdown headings (## or ###). Include:
- Key facts and current developments
- Background context if relevant
- Recent news and updates
- Analysis or implications

Keep each section concise (2-4 sentences) and use bullet points where appropriate. Focus on the most current and relevant information available.

Query: ${query}`;

    console.log('Sending request to Gemini...');
    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseTime = (Date.now() - startTime) / 1000;
    
    console.log('Gemini response received');
    
    const text = response.text();
    if (!text?.trim()) {
      console.warn('Gemini returned empty response');
      return null;
    }
    
    console.log('Gemini search successful');
    return {
      source: "gemini",
      answer: text,
      query,
      response_time: responseTime,
      results: undefined, // Gemini doesn't provide separate search results in this mode
      raw_response: response,
    };
  } catch (error) {
    console.error("Gemini search failed:", error);
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('401')) {
        throw new Error('Invalid Gemini API key. Please check your VITE_GEMINI_API_KEY environment variable.');
      }
      if (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('429')) {
        throw new Error('Gemini API quota exceeded. Please try again later or check your billing.');
      }
      if (error.message.includes('SAFETY')) {
        throw new Error('Content was blocked by Gemini safety filters. Please try a different query.');
      }
      if (error.message.includes('API Key must be set')) {
        throw new Error('Gemini API key is not properly configured. Please ensure VITE_GEMINI_API_KEY is set in your .env file and restart the development server.');
      }
    }
    
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
  throw new Error('Gemini AI is unable to process this query. Please try a different search term or enable Tavily fallback for enhanced search capabilities.');
}

async function searchWithTavily(query: string): Promise<MultiAgentResponse> {
  try {
    console.log('Starting Tavily search with query:', query);
    
    // Check if API keys are available
    if (!PICA_SECRET_KEY || !PICA_TAVILY_CONNECTION_KEY) {
      console.error('Tavily API keys not found in environment variables');
      throw new Error('Tavily API keys not configured. Please add VITE_PICA_SECRET_KEY and VITE_PICA_TAVILY_CONNECTION_KEY to your environment variables.');
    }
    
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
      const errorText = await response.text();
      console.error('Tavily API error:', response.status, response.statusText, errorText);
      throw new Error(`Tavily API request failed: ${response.status} ${response.statusText}`);
    }

    const data: TavilyResponse = await response.json();
    const responseTime = (Date.now() - startTime) / 1000;

    console.log('Tavily search successful');
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
    throw error;
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
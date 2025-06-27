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
    if (!VITE_GEMINI_API_KEY || VITE_GEMINI_API_KEY.trim() === '' || VITE_GEMINI_API_KEY === 'your_gemini_api_key_here') {
      console.error('Gemini API key not found, empty, or using placeholder value');
      console.error('Expected: VITE_GEMINI_API_KEY, Got:', VITE_GEMINI_API_KEY ? `${VITE_GEMINI_API_KEY.substring(0, 10)}...` : 'undefined');
      throw new Error('Gemini API key not configured. Please add your actual VITE_GEMINI_API_KEY to your .env file and restart the development server. Get your API key from https://makersuite.google.com/app/apikey');
    }
    
    // Validate API key format (basic check)
    if (!VITE_GEMINI_API_KEY.startsWith('AIza')) {
      console.error('Invalid Gemini API key format. Expected key to start with "AIza"');
      throw new Error('Invalid Gemini API key format. Please check your VITE_GEMINI_API_KEY in the .env file. The key should start with "AIza".');
    }
    
    const startTime = Date.now();
    
    // Initialize GoogleGenAI with explicit error handling
    let genAI;
    try {
      genAI = new GoogleGenAI(VITE_GEMINI_API_KEY);
      console.log('GoogleGenAI client initialized successfully');
    } catch (initError) {
      console.error('Failed to initialize GoogleGenAI:', initError);
      
      // Check if it's a module loading issue
      if (initError instanceof Error && initError.message.includes('GoogleGenAI is not a constructor')) {
        throw new Error('Failed to load Google Gemini AI library. Please ensure @google/genai is properly installed. Try running: npm install @google/genai');
      }
      
      throw new Error('Failed to initialize Gemini AI client. Please check your API key configuration and ensure the @google/genai package is properly installed.');
    }
    
    // Create the model with proper configuration
    let model;
    try {
      model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          candidateCount: 1,
          maxOutputTokens: 1024,
          temperature: 0.3,
        },
      });
      console.log('Gemini model configured successfully');
    } catch (modelError) {
      console.error('Failed to configure Gemini model:', modelError);
      throw new Error('Failed to configure Gemini AI model. Please check your API key permissions and quota.');
    }

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
    
    let result;
    try {
      result = await model.generateContent(prompt);
    } catch (generateError) {
      console.error('Gemini content generation failed:', generateError);
      
      // Handle specific Gemini API errors
      if (generateError instanceof Error) {
        if (generateError.message.includes('API_KEY_INVALID') || generateError.message.includes('401')) {
          throw new Error('Invalid Gemini API key. Please verify your VITE_GEMINI_API_KEY in the .env file is correct and has proper permissions.');
        }
        if (generateError.message.includes('QUOTA_EXCEEDED') || generateError.message.includes('429')) {
          throw new Error('Gemini API quota exceeded. Please check your billing settings or try again later.');
        }
        if (generateError.message.includes('SAFETY')) {
          throw new Error('Content was blocked by Gemini safety filters. Please try a different, more neutral query.');
        }
        if (generateError.message.includes('PERMISSION_DENIED') || generateError.message.includes('403')) {
          throw new Error('Permission denied. Please check your Gemini API key permissions and ensure the Generative AI API is enabled in your Google Cloud project.');
        }
        if (generateError.message.includes('NOT_FOUND') || generateError.message.includes('404')) {
          throw new Error('Gemini API endpoint not found. Please ensure you are using the correct API key and the service is available in your region.');
        }
        if (generateError.message.includes('INTERNAL') || generateError.message.includes('500')) {
          throw new Error('Gemini API internal error. Please try again in a few moments.');
        }
        if (generateError.message.includes('UNAVAILABLE') || generateError.message.includes('503')) {
          throw new Error('Gemini API is temporarily unavailable. Please try again later.');
        }
      }
      
      throw new Error(`Gemini API request failed: ${generateError instanceof Error ? generateError.message : 'Unknown error'}. Please try again or check your API configuration.`);
    }
    
    let response;
    try {
      response = result.response;
    } catch (responseError) {
      console.error('Failed to get response from Gemini result:', responseError);
      throw new Error('Failed to process Gemini response. The API may have returned an unexpected format.');
    }
    
    const responseTime = (Date.now() - startTime) / 1000;
    
    console.log('Gemini response received');
    
    let text;
    try {
      text = response.text();
    } catch (textError) {
      console.error('Failed to extract text from Gemini response:', textError);
      throw new Error('Failed to extract text from Gemini response. The response may be empty or in an unexpected format.');
    }
    
    if (!text?.trim()) {
      console.warn('Gemini returned empty response');
      throw new Error('Gemini returned an empty response. Please try rephrasing your query or try again later.');
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
    
    // Re-throw the error if it's already a descriptive error from our handling above
    if (error instanceof Error && (
      error.message.includes('API key') ||
      error.message.includes('quota') ||
      error.message.includes('safety') ||
      error.message.includes('permission') ||
      error.message.includes('not found') ||
      error.message.includes('internal') ||
      error.message.includes('unavailable') ||
      error.message.includes('Failed to')
    )) {
      throw error;
    }
    
    // Generic fallback for unexpected errors
    throw new Error(`Unexpected error during Gemini search: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or check your configuration.`);
  }
}

export async function searchWithGeminiOnly(query: string): Promise<MultiAgentResponse> {
  console.log(`Starting Gemini-only search for: "${query}"`);
  
  try {
    const geminiResult = await searchWithGemini(query);
    if (geminiResult) {
      console.log('Gemini search successful');
      return geminiResult;
    }
    
    // This shouldn't happen since searchWithGemini throws on failure, but just in case
    throw new Error('Gemini search returned no results unexpectedly.');
  } catch (error) {
    console.error('Gemini-only search failed:', error);
    
    // Provide helpful error message with fallback suggestion
    if (error instanceof Error) {
      throw new Error(`${error.message} You can try enabling Tavily fallback for enhanced search capabilities, or check your API configuration.`);
    }
    
    throw new Error('Gemini AI search failed. Please try a different search term, check your API configuration, or enable Tavily fallback for enhanced search capabilities.');
  }
}

async function searchWithTavily(query: string): Promise<MultiAgentResponse> {
  try {
    console.log('Starting Tavily search with query:', query);
    
    // Check if API keys are available
    if (!PICA_SECRET_KEY || !PICA_TAVILY_CONNECTION_KEY) {
      console.error('Tavily API keys not found in environment variables');
      throw new Error('Tavily API keys not configured. Please add VITE_PICA_SECRET_KEY and VITE_PICA_TAVILY_CONNECTION_KEY to your .env file.');
    }
    
    // Check for placeholder values
    if (PICA_SECRET_KEY === 'your_pica_secret_key_here' || PICA_TAVILY_CONNECTION_KEY === 'your_pica_tavily_connection_key_here') {
      throw new Error('Tavily API keys are using placeholder values. Please add your actual API keys to the .env file.');
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
      
      if (response.status === 401) {
        throw new Error('Tavily API authentication failed. Please check your VITE_PICA_SECRET_KEY and VITE_PICA_TAVILY_CONNECTION_KEY in the .env file.');
      }
      if (response.status === 403) {
        throw new Error('Tavily API access forbidden. Please verify your API key permissions and quota.');
      }
      if (response.status === 429) {
        throw new Error('Tavily API rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`Tavily API request failed: ${response.status} ${response.statusText}. Please check your API configuration.`);
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
    
    if (error instanceof Error && (
      error.message.includes('API key') ||
      error.message.includes('authentication') ||
      error.message.includes('forbidden') ||
      error.message.includes('rate limit')
    )) {
      throw error;
    }
    
    throw new Error(`Tavily search failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your API configuration.`);
  }
}

export async function multiAgentNewsSearch(query: string): Promise<MultiAgentResponse> {
  console.log(`Starting multi-agent search for: "${query}"`);
  
  // 1. Try Gemini first
  console.log('Attempting search with Gemini...');
  try {
    const geminiResult = await searchWithGemini(query);
    if (geminiResult) {
      console.log('Gemini search successful');
      return geminiResult;
    }
  } catch (geminiError) {
    console.log('Gemini search failed, will try Tavily fallback:', geminiError instanceof Error ? geminiError.message : 'Unknown error');
  }
  
  // 2. Fallback to Tavily
  console.log('Gemini failed or returned fallback, switching to Tavily...');
  try {
    const tavilyResult = await searchWithTavily(query);
    console.log('Tavily search successful');
    return tavilyResult;
  } catch (tavilyError) {
    console.error('Both Gemini and Tavily searches failed');
    throw new Error(`All search methods failed. Gemini: ${geminiError instanceof Error ? geminiError.message : 'Unknown error'}. Tavily: ${tavilyError instanceof Error ? tavilyError.message : 'Unknown error'}. Please check your API configurations.`);
  }
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
import React, { useState } from 'react';
import { Search, Bot, Sparkles, Clock, ExternalLink, AlertCircle, Loader2, Zap, Globe, Settings, Key, CheckCircle, Newspaper } from 'lucide-react';
import { multiAgentNewsSearch, searchWithGeminiOnly, getCategoryQuery } from '../utils/multiAgentApi';
// @ts-ignore: No types for 'marked' yet
import { marked } from 'marked';

interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

interface SearchResponse {
  source: 'gemini' | 'tavily';
  answer: string;
  query: string;
  response_time: number;
  results?: SearchResult[];
}

// Helper: Split markdown answer into sections by headings (## or ###)
function splitMarkdownSections(markdown: string): { title: string; content: string }[] {
  const lines = markdown.split('\n');
  const sections: { title: string; content: string }[] = [];
  let currentTitle = '';
  let currentContent = '';
  
  for (const line of lines) {
    const headingMatch = line.match(/^##+\s+(.*)/);
    if (headingMatch) {
      if (currentContent.trim()) {
        sections.push({ title: currentTitle, content: currentContent.trim() });
      }
      currentTitle = headingMatch[1];
      currentContent = '';
    } else {
      currentContent += line + '\n';
    }
  }
  
  if (currentContent.trim()) {
    sections.push({ title: currentTitle, content: currentContent.trim() });
  }
  
  return sections.length > 0 ? sections : [{ title: '', content: markdown }];
}

// Check if API keys are configured
function checkAPIKeys() {
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const picaSecret = import.meta.env.VITE_PICA_SECRET_KEY;
  const picaTavily = import.meta.env.VITE_PICA_TAVILY_CONNECTION_KEY;
  
  return {
    hasGemini: !!geminiKey && geminiKey !== 'your_gemini_api_key_here',
    hasTavily: !!picaSecret && !!picaTavily && picaSecret !== 'your_pica_secret_key_here' && picaTavily !== 'your_pica_tavily_connection_key_here',
    hasAny: (!!geminiKey && geminiKey !== 'your_gemini_api_key_here') || (!!picaSecret && !!picaTavily && picaSecret !== 'your_pica_secret_key_here' && picaTavily !== 'your_pica_tavily_connection_key_here')
  };
}

export default function AIGuidedNews() {
  const [query, setQuery] = useState('');
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useTavilyFallback, setUseTavilyFallback] = useState(false);

  const apiStatus = checkAPIKeys();

  const categories = [
    'World Events',
    'Politics', 
    'Technology',
    'Business',
    'Health',
    'Science',
    'Sports',
    'Entertainment'
  ];

  const sampleQuestions = {
    'World Events': [
      "What's happening in Ukraine right now?",
      "Latest developments in the Middle East",
      "Current global economic situation",
      "Recent international conflicts and tensions"
    ],
    'Politics': [
      "Latest US political developments",
      "European Union policy changes this week", 
      "Election updates worldwide",
      "Government policy changes and reforms"
    ],
    'Technology': [
      "Latest AI breakthroughs and developments",
      "Cybersecurity threats this week",
      "New tech product launches",
      "Software development trends 2025"
    ],
    'Business': [
      "Stock market trends today",
      "Cryptocurrency market updates",
      "Major corporate acquisitions this week",
      "Economic indicators and forecasts"
    ],
    'Health': [
      "Medical research breakthroughs",
      "Public health updates and alerts",
      "New treatment discoveries",
      "Health policy changes globally"
    ],
    'Science': [
      "Climate change latest updates",
      "Space exploration recent news",
      "Scientific discoveries this month",
      "Environmental research findings"
    ],
    'Sports': [
      "Latest sports scores and highlights",
      "Olympic updates and news",
      "Major league developments",
      "Sports injury and transfer news"
    ],
    'Entertainment': [
      "Hollywood latest news",
      "Music industry updates",
      "Celebrity developments",
      "Entertainment awards and shows"
    ]
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    if (!apiStatus.hasAny) {
      setError('No API keys configured. Please set up your API keys in the environment variables to use AI search.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      let response;
      if (useTavilyFallback && apiStatus.hasTavily) {
        // Use multi-agent search (Gemini first, then Tavily fallback)
        response = await multiAgentNewsSearch(searchQuery);
      } else if (apiStatus.hasGemini) {
        // Use Gemini only
        response = await searchWithGeminiOnly(searchQuery);
      } else {
        throw new Error('No valid API configuration found. Please check your environment variables.');
      }
      setSearchResponse(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search news';
      setError(errorMessage);
      console.error('AI search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryClick = (category: string) => {
    const categoryQuery = getCategoryQuery(category);
    setQuery(categoryQuery);
    handleSearch(categoryQuery);
  };

  const handleSampleQuestionClick = (question: string) => {
    setQuery(question);
    handleSearch(question);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getSourceIcon = (source: 'gemini' | 'tavily') => {
    switch (source) {
      case 'gemini':
        return <Sparkles className="text-blue-400" size={20} />;
      case 'tavily':
        return <Globe className="text-green-400" size={20} />;
      default:
        return <Bot className="text-purple-400" size={20} />;
    }
  };

  const getSourceName = (source: 'gemini' | 'tavily') => {
    switch (source) {
      case 'gemini':
        return 'Google Gemini with Search';
      case 'tavily':
        return 'Tavily Search';
      default:
        return 'AI Agent';
    }
  };

  const getSourceColor = (source: 'gemini' | 'tavily') => {
    switch (source) {
      case 'gemini':
        return 'from-blue-500 to-indigo-600';
      case 'tavily':
        return 'from-green-500 to-emerald-600';
      default:
        return 'from-purple-500 to-blue-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <Bot className="mr-3 text-purple-600" size={48} />
              <Zap className="absolute -top-1 -right-1 text-yellow-500" size={20} />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">AI News Search</h1>
          </div>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto">
            Powered by Google Gemini AI with real-time Google Search integration. Get current news analysis with source links.
          </p>
          <div className="flex items-center justify-center mt-4 space-x-6 text-sm text-gray-500">
            <div className="flex items-center">
              <Sparkles className="mr-1 text-blue-500" size={16} />
              <span>Google Gemini + Search {apiStatus.hasGemini ? '✓' : '✗'}</span>
            </div>
            {useTavilyFallback && (
              <div className="flex items-center">
                <Globe className="mr-1 text-green-500" size={16} />
                <span>Tavily Search {apiStatus.hasTavily ? '✓' : '✗'}</span>
              </div>
            )}
          </div>
        </header>

        {/* API Key Status */}
        {apiStatus.hasAny && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center">
                <CheckCircle className="text-green-600 mr-3" size={20} />
                <div>
                  <h3 className="text-green-800 font-medium">AI Search Ready</h3>
                  <p className="text-green-600 text-sm">
                    {apiStatus.hasGemini && 'Gemini AI with Google Search is configured. '}
                    {apiStatus.hasTavily && 'Tavily search is available as fallback.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Key Status Warning */}
        {!apiStatus.hasAny && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <Key className="text-yellow-600 mr-3" size={24} />
                <h3 className="text-yellow-800 font-bold text-lg">API Keys Required</h3>
              </div>
              <div className="text-yellow-700 space-y-2">
                <p>To use AI search, you need to configure API keys in your environment variables:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><code className="bg-yellow-100 px-2 py-1 rounded">VITE_GEMINI_API_KEY</code> - For Google Gemini AI with Search</li>
                  <li><code className="bg-yellow-100 px-2 py-1 rounded">VITE_PICA_SECRET_KEY</code> - For Tavily search (optional)</li>
                  <li><code className="bg-yellow-100 px-2 py-1 rounded">VITE_PICA_TAVILY_CONNECTION_KEY</code> - For Tavily search (optional)</li>
                </ul>
                <p className="text-sm mt-3">
                  Create a <code className="bg-yellow-100 px-2 py-1 rounded">.env</code> file in your project root and add these keys.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search Configuration */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Settings className="text-gray-500" size={20} />
                <span className="font-medium text-gray-700">Search Configuration</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">Gemini Only</span>
                <button
                  onClick={() => setUseTavilyFallback(!useTavilyFallback)}
                  disabled={!apiStatus.hasTavily}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    useTavilyFallback ? 'bg-green-600' : 'bg-gray-300'
                  } ${!apiStatus.hasTavily ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useTavilyFallback ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-600">Enable Tavily Fallback</span>
              </div>
            </div>
            {useTavilyFallback && apiStatus.hasTavily && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Cost Warning:</strong> Tavily fallback enabled. This will use Tavily search if Gemini cannot provide current information, which may incur additional costs.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Search Interface */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch(query)}
                  placeholder="Ask about current events, politics, technology, or any news topic..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                  disabled={isLoading || !apiStatus.hasAny}
                />
              </div>
              <button
                onClick={() => handleSearch(query)}
                disabled={isLoading || !query.trim() || !apiStatus.hasAny}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin mr-2" />
                ) : (
                  <Search size={20} className="mr-2" />
                )}
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </div>

        {/* Category Buttons */}
        {apiStatus.hasAny && (
          <div className="max-w-4xl mx-auto mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Quick Categories</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 text-sm font-medium disabled:opacity-50"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sample Questions */}
        {!searchResponse && !isLoading && apiStatus.hasAny && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center flex items-center justify-center">
                <Sparkles className="mr-2 text-purple-600" size={24} />
                Try These Sample Questions
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(sampleQuestions).map(([category, questions]) => (
                  <div key={category} className="space-y-3">
                    <h4 className="font-semibold text-gray-800 flex items-center">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                      {category}
                    </h4>
                    <ul className="space-y-2">
                      {questions.map((question, index) => (
                        <li key={index}>
                          <button
                            onClick={() => handleSampleQuestionClick(question)}
                            className="text-sm text-gray-600 hover:text-purple-600 hover:underline text-left transition-colors"
                          >
                            "{question}"
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center">
              <AlertCircle className="text-red-500 mr-3" size={20} />
              <div>
                <h3 className="text-red-800 font-medium">Search Error</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchResponse && !isLoading && (
          <div className="max-w-6xl mx-auto">
            {/* AI Answer Cards */}
            {searchResponse.answer && (
              <div className="mb-8">
                <div className="flex items-center mb-6">
                  {getSourceIcon(searchResponse.source)}
                  <h3 className="text-2xl font-bold text-gray-900 ml-2">
                    {getSourceName(searchResponse.source)} Analysis
                  </h3>
                  <div className="ml-auto flex items-center text-gray-500 text-sm">
                    <Clock size={14} className="mr-1" />
                    {searchResponse.response_time.toFixed(2)}s
                  </div>
                </div>
                
                {/* Split response into cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {splitMarkdownSections(searchResponse.answer).map((section, idx) => (
                    <article key={idx} className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                      <div className="p-6">
                        {section.title && (
                          <div className="flex items-center mb-3">
                            <Newspaper size={16} className="text-purple-600 mr-2" />
                            <h4 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                              {section.title}
                            </h4>
                          </div>
                        )}
                        <div className="text-gray-700 text-sm prose prose-sm max-w-none" 
                             dangerouslySetInnerHTML={{ __html: marked.parse(section.content) }} />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Source Links */}
            {searchResponse.results && searchResponse.results.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 flex items-center mb-6">
                  <ExternalLink className="mr-2" size={20} />
                  Source Links ({searchResponse.results.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResponse.results.map((result, index) => (
                    <article key={index} className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                              {result.title}
                            </h4>
                            {result.published_date && (
                              <div className="flex items-center text-gray-500 text-sm mb-2">
                                <Clock size={12} className="mr-1" />
                                {formatDate(result.published_date)}
                              </div>
                            )}
                          </div>
                          <div className="ml-3 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            Score: {(result.score * 100).toFixed(0)}%
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                          {result.content}
                        </p>
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors duration-200"
                        >
                          Read Source
                          <ExternalLink size={14} className="ml-2" />
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Source Attribution */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center">
                {getSourceIcon(searchResponse.source)}
                <div className="ml-3">
                  <h3 className="text-blue-800 font-medium">Powered by {getSourceName(searchResponse.source)}</h3>
                  <p className="text-blue-600 text-sm">
                    {searchResponse.source === 'gemini' 
                      ? 'Analysis generated using Google Gemini AI with real-time Google Search integration.'
                      : 'Search results provided by Tavily AI search engine.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center items-center py-12">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Bot size={20} className="text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <div className="text-gray-600 font-medium">
                  {useTavilyFallback ? 'Searching with AI agents...' : 'Searching with Gemini + Google Search...'}
                </div>
                <div className="text-gray-500 text-sm">
                  {useTavilyFallback ? 'Trying Gemini first, then Tavily if needed' : 'Using Google Gemini AI with real-time search'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
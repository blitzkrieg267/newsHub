import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Newspaper, Heart, AlertCircle, Settings, Eye, EyeOff } from 'lucide-react';
import { NewsItem, RSSFeed } from '../types';
import { fetchRSSFeed } from '../utils/rssParser';
import NewsItemComponent from './NewsItem';
import CategoryFilter from './CategoryFilter';
import SearchBar from './SearchBar';
import FeedManager from './admin/FeedManagement';

export default function NewsAggregator() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [feeds, setFeeds] = useState<RSSFeed[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showFeedManager, setShowFeedManager] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Always load feeds from feeds.json
  useEffect(() => {
    fetch('/feeds.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch feeds.json');
        return res.json();
      })
      .then(json => {
        setFeeds(json);
      })
      .catch(err => {
        setError('Failed to load RSS feed list.');
        setFeeds([]);
        console.error('Error loading feeds.json:', err);
      });
  }, []);

  const fetchAllNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const activeFeeds = feeds.filter(feed => feed.isActive);
    if (activeFeeds.length === 0) {
      setError('No active RSS feeds configured.');
      setIsLoading(false);
      return;
    }
    try {
      const feedsToFetch = activeFeeds.slice(0, 25);
      const allNewsPromises = feedsToFetch.map(feed =>
        fetchRSSFeed(feed.url, feed.title).catch(err => {
          console.warn(`Failed to fetch from ${feed.title}:`, err);
          return [];
        })
      );
      const allNewsArrays = await Promise.all(allNewsPromises);
      const allNews = allNewsArrays.flat();
      const uniqueNews = allNews.filter((item, index, self) =>
        index === self.findIndex(t => t.link === item.link)
      );
      const sortedNews = uniqueNews.sort((a, b) =>
        new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      );
      const existingFavorites = new Set(
        newsItems.filter(item => item.isFavorite).map(item => item.link)
      );
      const newsWithFavorites = sortedNews.map(item => ({
        ...item,
        isFavorite: existingFavorites.has(item.link)
      }));
      setNewsItems(newsWithFavorites);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to fetch news. Please check your internet connection.');
      console.error('Error fetching news:', err);
    } finally {
      setIsLoading(false);
    }
  }, [feeds, newsItems]);

  const handleToggleFavorite = (id: string) => {
    setNewsItems(prev => prev.map(item =>
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    ));
  };

  const handleFeedToggle = (feedId: string) => {
    setFeeds(prevFeeds => prevFeeds.map(feed =>
      feed.id === feedId ? { ...feed, isActive: !feed.isActive } : feed
    ));
  };

  // Filter news items based on category, search term, and favorites
  const filteredNews = newsItems
    .filter(item => {
      const matchesCategory = selectedCategory === null || item.category === selectedCategory;
      const matchesSearch = searchTerm === '' || 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFavorites = !showFavorites || item.isFavorite;
      return matchesCategory && matchesSearch && matchesFavorites;
    })
    .sort((a, b) => {
      // Sort by category A-Z, then by pubDate (newest first)
      if (a.category < b.category) return -1;
      if (a.category > b.category) return 1;
      // If same category, sort by date (newest first)
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    });

  // Calculate category counts
  const categoryCounts = newsItems.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Initial load
  useEffect(() => {
    if (feeds.length > 0) {
      fetchAllNews();
    }
  }, [feeds.length]); // Only depend on feeds.length to avoid infinite loop

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Newspaper className="mr-3 text-blue-600" size={48} />
            <h1 className="text-4xl font-bold text-gray-900">RSS NewsHub</h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Your centralized hub for news from {feeds.length}+ trusted RSS feeds worldwide, automatically categorized and searchable
          </p>
        </header>

        {/* Controls */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchAllNews}
              disabled={isLoading}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <RefreshCw 
                size={20} 
                className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} 
              />
              {isLoading ? 'Refreshing...' : 'Refresh News'}
            </button>
            
            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className={`flex items-center px-6 py-3 rounded-xl transition-all duration-200 shadow-lg ${
                showFavorites
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Heart 
                size={20} 
                className="mr-2" 
                fill={showFavorites ? 'currentColor' : 'none'} 
              />
              {showFavorites ? 'Show All' : 'Favorites Only'}
            </button>

            <button
              onClick={() => setShowFeedManager(!showFeedManager)}
              className="flex items-center px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Settings size={20} className="mr-2" />
              Manage Feeds
            </button>
          </div>
          
          <div className="flex flex-col items-end">
            {lastUpdated && (
              <div className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
            <div className="text-xs text-gray-400 mt-1">
              {feeds.filter(f => f.isActive).length} active feeds
            </div>
          </div>
        </div>

        {/* Feed Manager */}
        {showFeedManager && (
          <FeedManager
            feeds={feeds}
            onFeedToggle={handleFeedToggle}
            onClose={() => setShowFeedManager(false)}
          />
        )}

        {/* Search Bar */}
        <SearchBar 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        {/* Category Filter */}
        <CategoryFilter
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categoryCounts={categoryCounts}
        />

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 flex items-center">
            <AlertCircle className="text-red-500 mr-3" size={20} />
            <div>
              <h3 className="text-red-800 font-medium">Error Loading News</h3>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-gray-600">Loading latest news from {feeds.filter(f => f.isActive).length} sources...</span>
          </div>
        )}

        {/* News Grid */}
        {!isLoading && filteredNews.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredNews.map(item => (
              <NewsItemComponent
                key={item.id}
                item={item}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredNews.length === 0 && newsItems.length > 0 && (
          <div className="text-center py-12">
            <Newspaper size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No articles found</h3>
            <p className="text-gray-600">
              {showFavorites
                ? "You haven't favorited any articles yet."
                : searchTerm || selectedCategory
                ? "No articles match your current filters."
                : "No articles available."}
            </p>
          </div>
        )}

        {/* No News State */}
        {!isLoading && newsItems.length === 0 && !error && (
          <div className="text-center py-12">
            <Newspaper size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Welcome to RSS NewsHub</h3>
            <p className="text-gray-600 mb-4">
              Click "Refresh News" to load the latest stories from our curated collection of {feeds.length} RSS feeds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
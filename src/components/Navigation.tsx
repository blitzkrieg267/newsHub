import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Newspaper, Search, Rss } from 'lucide-react';

export default function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white/90 backdrop-blur-md shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="p-2 bg-blue-600 rounded-lg group-hover:bg-blue-700 transition-colors">
              <Newspaper className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">NewsHub</h1>
              <p className="text-xs text-gray-500">Your News Aggregator</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            <Link
              to="/"
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/')
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Rss size={16} className="mr-2" />
              RSS News
            </Link>
            
            <Link
              to="/ai-news"
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/ai-news')
                  ? 'bg-purple-100 text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Search size={16} className="mr-2" />
              AI News Search
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
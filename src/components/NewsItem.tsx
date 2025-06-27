import React from 'react';
import { ExternalLink, Heart, Clock, Newspaper } from 'lucide-react';
import { NewsItem as NewsItemType } from '../types';
import { formatDate, getCategoryConfig } from '../utils/rssParser';
import { getCategoryConfig as getConfig } from '../utils/categorizer';

interface NewsItemProps {
  item: NewsItemType;
  onToggleFavorite: (id: string) => void;
}

export default function NewsItem({ item, onToggleFavorite }: NewsItemProps) {
  const categoryConfig = getConfig(item.category);
  
  // Placeholder image URL from Pexels
  const placeholderImage = "https://images.pexels.com/photos/518543/pexels-photo-518543.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop";
  
  return (
    <article className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
      <div className="relative h-48 overflow-hidden">
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = placeholderImage;
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            <Newspaper size={48} className="text-white opacity-80" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {categoryConfig && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${categoryConfig.color}`}>
                {item.category}
              </span>
            )}
            <span className="text-sm text-gray-500">{item.source}</span>
          </div>
          
          <button
            onClick={() => onToggleFavorite(item.id)}
            className={`p-2 rounded-full transition-colors duration-200 ${
              item.isFavorite
                ? 'text-red-500 bg-red-50'
                : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
            }`}
          >
            <Heart size={16} fill={item.isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {item.title}
        </h3>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {item.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-500 text-xs">
            <Clock size={12} className="mr-1" />
            {formatDate(item.pubDate)}
          </div>
          
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Read More
            <ExternalLink size={14} className="ml-2" />
          </a>
        </div>
      </div>
    </article>
  );
}
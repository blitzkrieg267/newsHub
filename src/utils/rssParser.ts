import { NewsItem } from '../types';
import { categorizeNews } from './categorizer';

export async function fetchRSSFeed(url: string, sourceName: string): Promise<NewsItem[]> {
  try {
    // Use a CORS proxy for external RSS feeds
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);
    const data = await response.json();
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data.contents, 'text/xml');
    
    const items = xmlDoc.querySelectorAll('item');
    const newsItems: NewsItem[] = [];
    const seenLinks = new Set<string>(); // Track seen links to prevent duplicates
    
    // Calculate date one year ago from now
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    items.forEach((item, index) => {
      const title = item.querySelector('title')?.textContent || '';
      const description = item.querySelector('description')?.textContent || '';
      const link = item.querySelector('link')?.textContent || '';
      const pubDateString = item.querySelector('pubDate')?.textContent || '';
      
      // Skip if we've already seen this link
      if (seenLinks.has(link)) {
        return;
      }
      
      // Parse and validate publication date
      let pubDate: Date;
      try {
        pubDate = new Date(pubDateString);
        
        // Check if the date is valid and within the past year
        if (isNaN(pubDate.getTime()) || pubDate < oneYearAgo) {
          console.log(`Skipping article from ${sourceName}: "${title}" - Date: ${pubDateString} (older than 1 year or invalid)`);
          return;
        }
        
        // Also skip future dates (likely invalid)
        const now = new Date();
        if (pubDate > now) {
          console.log(`Skipping article from ${sourceName}: "${title}" - Date: ${pubDateString} (future date)`);
          return;
        }
      } catch (error) {
        console.log(`Skipping article from ${sourceName}: "${title}" - Invalid date: ${pubDateString}`);
        return;
      }
      
      seenLinks.add(link);
      
      // Try to extract image from various possible fields
      let image = '';
      const mediaContent = item.querySelector('media\\:content, content');
      const enclosure = item.querySelector('enclosure[type^="image"]');
      const imageRegex = /<img[^>]+src="([^">]+)"/i;
      const imageMatch = description.match(imageRegex);
      
      if (mediaContent) {
        image = mediaContent.getAttribute('url') || '';
      } else if (enclosure) {
        image = enclosure.getAttribute('url') || '';
      } else if (imageMatch) {
        image = imageMatch[1];
      }
      
      const category = categorizeNews(title, description);
      
      newsItems.push({
        id: `${sourceName}-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: title.replace(/<[^>]*>/g, ''), // Strip HTML tags
        description: description.replace(/<[^>]*>/g, '').substring(0, 200) + '...', // Strip HTML and truncate
        link,
        pubDate: pubDate.toISOString(), // Store as ISO string for consistency
        category,
        source: sourceName,
        image: image || undefined,
        isFavorite: false
      });
    });
    
    // Sort by publication date (newest first) before returning
    newsItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    
    console.log(`Fetched ${newsItems.length} recent articles from ${sourceName} (within past year)`);
    return newsItems;
  } catch (error) {
    console.error(`Error fetching RSS feed from ${url}:`, error);
    return [];
  }
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Show relative time for recent articles
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return diffMinutes <= 1 ? 'Just now' : `${diffMinutes}m ago`;
      }
      return diffHours === 1 ? '1h ago' : `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else if (diffDays < 30) {
      const diffWeeks = Math.floor(diffDays / 7);
      return diffWeeks === 1 ? '1w ago' : `${diffWeeks}w ago`;
    } else if (diffDays < 365) {
      const diffMonths = Math.floor(diffDays / 30);
      return diffMonths === 1 ? '1mo ago' : `${diffMonths}mo ago`;
    } else {
      // For articles older than a year (shouldn't happen with our filter, but just in case)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  } catch {
    return dateString;
  }
}

export function getCategoryConfig(categoryName: string) {
  // This function is kept for backward compatibility
  // The actual implementation is in categorizer.ts
  return undefined;
}
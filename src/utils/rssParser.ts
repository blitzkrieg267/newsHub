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
    
    items.forEach((item, index) => {
      const title = item.querySelector('title')?.textContent || '';
      const description = item.querySelector('description')?.textContent || '';
      const link = item.querySelector('link')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent || '';
      
      // Skip if we've already seen this link
      if (seenLinks.has(link)) {
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
        pubDate,
        category,
        source: sourceName,
        image: image || undefined,
        isFavorite: false
      });
    });
    
    return newsItems;
  } catch (error) {
    console.error(`Error fetching RSS feed from ${url}:`, error);
    return [];
  }
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

export function getCategoryConfig(categoryName: string) {
  // This function is kept for backward compatibility
  // The actual implementation is in categorizer.ts
  return undefined;
}
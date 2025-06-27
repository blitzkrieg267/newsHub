import { NewsItem } from '../types';
import { categorizeNews } from './categorizer';

export async function fetchRSSFeed(url: string, sourceName: string): Promise<NewsItem[]> {
  try {
    // Use a CORS proxy for external RSS feeds
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    console.log(`Fetching RSS feed from ${sourceName}: ${url}`);
    
    const response = await fetch(proxyUrl);
    
    // Check if the fetch request was successful
    if (!response.ok) {
      console.error(`CORS proxy request failed for ${sourceName}: ${response.status} ${response.statusText}`);
      throw new Error(`CORS proxy returned ${response.status}: ${response.statusText}. The RSS feed may be temporarily unavailable.`);
    }
    
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error(`Failed to parse JSON response from CORS proxy for ${sourceName}:`, jsonError);
      throw new Error(`Invalid response from CORS proxy. The RSS feed service may be experiencing issues.`);
    }
    
    // Check if the proxy response contains the expected contents field
    if (!data || !data.contents) {
      console.error(`CORS proxy returned empty or invalid data for ${sourceName}:`, data);
      throw new Error(`CORS proxy returned empty content. The RSS feed at ${url} may be unavailable or the proxy service is experiencing issues.`);
    }
    
    // Check if the contents field is empty or just whitespace
    if (!data.contents.trim()) {
      console.error(`CORS proxy returned empty contents for ${sourceName}`);
      throw new Error(`RSS feed returned empty content. The feed at ${url} may be temporarily unavailable.`);
    }
    
    const parser = new DOMParser();
    let xmlDoc;
    
    try {
      xmlDoc = parser.parseFromString(data.contents, 'text/xml');
    } catch (parseError) {
      console.error(`Failed to parse XML for ${sourceName}:`, parseError);
      throw new Error(`Invalid XML format in RSS feed. The feed may be corrupted or not a valid RSS feed.`);
    }
    
    // Check for XML parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.error(`XML parsing error for ${sourceName}:`, parserError.textContent);
      throw new Error(`RSS feed contains invalid XML. The feed may be corrupted.`);
    }
    
    const items = xmlDoc.querySelectorAll('item');
    
    if (items.length === 0) {
      console.warn(`No RSS items found for ${sourceName}. The feed may be empty or use a different format.`);
      return []; // Return empty array instead of throwing error for empty feeds
    }
    
    const newsItems: NewsItem[] = [];
    const seenLinks = new Set<string>(); // Track seen links to prevent duplicates
    
    // Calculate date one year ago from now
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    items.forEach((item, index) => {
      try {
        const title = item.querySelector('title')?.textContent || '';
        const description = item.querySelector('description')?.textContent || '';
        const link = item.querySelector('link')?.textContent || '';
        const pubDateString = item.querySelector('pubDate')?.textContent || '';
        
        // Skip items without essential fields
        if (!title.trim() || !link.trim()) {
          console.log(`Skipping article from ${sourceName}: missing title or link`);
          return;
        }
        
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
      } catch (itemError) {
        console.error(`Error processing RSS item from ${sourceName}:`, itemError);
        // Continue processing other items
      }
    });
    
    // Sort by publication date (newest first) before returning
    newsItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    
    console.log(`Successfully fetched ${newsItems.length} recent articles from ${sourceName} (within past year)`);
    return newsItems;
  } catch (error) {
    console.error(`Error fetching RSS feed from ${url}:`, error);
    
    // Provide more specific error messages based on error type
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error(`Network error: Unable to reach the RSS feed or CORS proxy. This could be due to network connectivity issues, the RSS feed being temporarily unavailable, or the CORS proxy service being down.`);
    }
    
    // Re-throw the error with the original message if it's already descriptive
    if (error instanceof Error && error.message.includes('CORS proxy') || error.message.includes('RSS feed')) {
      throw error;
    }
    
    // Generic fallback error message
    throw new Error(`Failed to fetch RSS feed from ${sourceName}. The feed may be temporarily unavailable or experiencing issues.`);
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
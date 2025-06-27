import { NewsItem } from '../types';
import { categorizeNews } from './categorizer';

export async function fetchRSSFeed(url: string, sourceName: string): Promise<NewsItem[]> {
  try {
    // Use multiple CORS proxy services for better reliability
    const proxyUrls = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://cors-anywhere.herokuapp.com/${url}`
    ];
    
    console.log(`Fetching RSS feed from ${sourceName}: ${url}`);
    
    let data;
    let lastError;
    
    // Try each proxy service until one works
    for (let i = 0; i < proxyUrls.length; i++) {
      try {
        console.log(`Trying proxy ${i + 1}/${proxyUrls.length} for ${sourceName}`);
        const response = await fetch(proxyUrls[i], {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NewsHub/1.0)',
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        if (i === 0) {
          // allorigins.win returns JSON
          data = await response.json();
          if (!data || !data.contents) {
            throw new Error('Empty response from proxy');
          }
          data = data.contents;
        } else {
          // Other proxies return the content directly
          data = await response.text();
        }
        
        if (!data || !data.trim()) {
          throw new Error('Empty content received');
        }
        
        console.log(`Successfully fetched from ${sourceName} using proxy ${i + 1}`);
        break;
      } catch (error) {
        lastError = error;
        console.warn(`Proxy ${i + 1} failed for ${sourceName}:`, error instanceof Error ? error.message : error);
        
        // If this is the last proxy, we'll throw the error
        if (i === proxyUrls.length - 1) {
          throw error;
        }
      }
    }
    
    if (!data) {
      throw new Error('All proxy services failed');
    }
    
    const parser = new DOMParser();
    let xmlDoc;
    
    try {
      xmlDoc = parser.parseFromString(data, 'text/xml');
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
            return;
          }
          
          // Also skip future dates (likely invalid)
          const now = new Date();
          if (pubDate > now) {
            return;
          }
        } catch (error) {
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
      console.warn(`Network error for ${sourceName}, skipping...`);
      return []; // Return empty array instead of throwing to allow other feeds to load
    }
    
    if (error instanceof Error && error.message.includes('timeout')) {
      console.warn(`Timeout error for ${sourceName}, skipping...`);
      return []; // Return empty array for timeout errors
    }
    
    // For other errors, also return empty array to be more resilient
    console.warn(`Error loading ${sourceName}, skipping:`, error instanceof Error ? error.message : error);
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
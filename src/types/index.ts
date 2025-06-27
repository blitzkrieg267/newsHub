export interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  category: string;
  source: string;
  image?: string;
  isFavorite?: boolean;
}

export interface RSSFeed {
  id: string;
  url: string;
  title: string;
  category?: string;
  isActive: boolean;
}

export interface CategoryConfig {
  name: string;
  color: string;
  keywords: string[];
  icon: string;
}

export interface DappierSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  published_date?: string;
  image_url?: string;
}

export interface DappierResponse {
  results: DappierSearchResult[];
  query: string;
  total_results: number;
}
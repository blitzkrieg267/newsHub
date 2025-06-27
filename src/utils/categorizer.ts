import { CategoryConfig } from '../types';

export const categoryConfigs: CategoryConfig[] = [
  {
    name: 'Technology',
    color: 'bg-blue-500',
    keywords: ['tech', 'technology', 'software', 'ai', 'artificial intelligence', 'computer', 'digital', 'internet', 'cybersecurity', 'blockchain', 'cryptocurrency', 'cyber', 'security', 'data breach', 'malware', 'network', 'cloud'],
    icon: 'Cpu'
  },
  {
    name: 'Sports',
    color: 'bg-green-500',
    keywords: ['sports', 'football', 'basketball', 'soccer', 'tennis', 'baseball', 'hockey', 'olympics', 'championship', 'match', 'game', 'athlete'],
    icon: 'Trophy'
  },
  {
    name: 'Politics',
    color: 'bg-red-500',
    keywords: ['politics', 'government', 'election', 'president', 'congress', 'senate', 'policy', 'vote', 'campaign', 'democracy', 'legislation'],
    icon: 'Vote'
  },
  {
    name: 'Business',
    color: 'bg-purple-500',
    keywords: ['business', 'economy', 'finance', 'market', 'stock', 'investment', 'company', 'corporate', 'earnings', 'revenue', 'startup'],
    icon: 'Briefcase'
  },
  {
    name: 'Health',
    color: 'bg-pink-500',
    keywords: ['health', 'medical', 'medicine', 'hospital', 'doctor', 'treatment', 'disease', 'wellness', 'fitness', 'nutrition'],
    icon: 'Heart'
  },
  {
    name: 'Weather',
    color: 'bg-orange-500',
    keywords: ['weather', 'storm', 'hurricane', 'temperature', 'climate', 'rain', 'snow', 'forecast', 'meteorology'],
    icon: 'Cloud'
  },
  {
    name: 'Entertainment',
    color: 'bg-indigo-500',
    keywords: ['entertainment', 'movie', 'film', 'music', 'celebrity', 'hollywood', 'tv', 'television', 'streaming', 'concert'],
    icon: 'Film'
  }
];

export function categorizeNews(title: string, description: string): string {
  const content = `${title} ${description}`.toLowerCase();
  
  for (const config of categoryConfigs) {
    for (const keyword of config.keywords) {
      if (content.includes(keyword.toLowerCase())) {
        return config.name;
      }
    }
  }
  
  return 'General';
}

export function getCategoryConfig(categoryName: string): CategoryConfig | undefined {
  return categoryConfigs.find(config => config.name === categoryName);
}
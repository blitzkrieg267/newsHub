import React from 'react';
import { Filter, X } from 'lucide-react';
import { categoryConfigs } from '../utils/categorizer';

interface CategoryFilterProps {
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  categoryCounts: Record<string, number>;
}

export default function CategoryFilter({ 
  selectedCategory, 
  onCategoryChange, 
  categoryCounts 
}: CategoryFilterProps) {
  const allCategories = ['General', ...categoryConfigs.map(c => c.name)];
  
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-8">
      <div className="flex items-center mb-4">
        <Filter className="mr-2 text-gray-700" size={20} />
        <h3 className="text-lg font-semibold text-gray-900">Filter by Category</h3>
        {selectedCategory && (
          <button
            onClick={() => onCategoryChange(null)}
            className="ml-auto flex items-center px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-full text-sm transition-colors"
          >
            Clear
            <X size={14} className="ml-1" />
          </button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCategoryChange(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            selectedCategory === null
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({Object.values(categoryCounts).reduce((a, b) => a + b, 0)})
        </button>
        
        {allCategories.map(category => {
          const count = categoryCounts[category] || 0;
          const config = categoryConfigs.find(c => c.name === category);
          
          if (count === 0) return null;
          
          return (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedCategory === category
                  ? `${config?.color || 'bg-gray-600'} text-white shadow-lg`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category} ({count})
            </button>
          );
        })}
      </div>
    </div>
  );
}
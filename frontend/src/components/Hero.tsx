import React from 'react';
import { Search, X } from 'lucide-react';
import type { Category } from '../types';

interface HeroProps {
  activeCategory: number | 'All';
  setActiveCategory: React.Dispatch<React.SetStateAction<number | 'All'>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  categories: Category[];
}

export default function Hero({
  activeCategory,
  setActiveCategory,
  searchQuery,
  setSearchQuery,
  categories,
}: HeroProps) {
  return (
    <div className="flex flex-col gap-5 py-6 sm:py-8">
      <div className="bg-white rounded-3xl p-6 sm:p-10 flex flex-col gap-4 sm:gap-5 shadow-sm border border-gray-100">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
          Find what you need on campus
        </h1>
        <div className="relative w-full max-w-2xl">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search textbooks, laptops, chairs..."
            className="w-full pl-11 pr-10 py-3.5 sm:py-4 rounded-xl border-2 border-gray-100 bg-gray-50 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors text-gray-900 text-sm sm:text-base"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        <button
          type="button"
          onClick={() => setActiveCategory('All')}
          className={`px-4 sm:px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeCategory === 'All'
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          All
        </button>

        {categories.map((cat) => (
          <button
            type="button"
            key={cat.category_id}
            onClick={() => setActiveCategory(cat.category_id)}
            className={`px-4 sm:px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.category_id
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}

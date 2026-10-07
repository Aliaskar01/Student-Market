import React from 'react';

interface HeroProps {
  activeCategory: number | "All";
  setActiveCategory: React.Dispatch<React.SetStateAction<number | "All">>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  categories: any[];
}

export default function Hero({ activeCategory, setActiveCategory, searchQuery, setSearchQuery, categories }: HeroProps) {
  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="bg-white rounded-3xl p-10 flex flex-col gap-5 shadow-sm border border-gray-100">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Find what you need on campus</h1>
        <div className="relative w-full max-w-2xl">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search textbooks, laptops, chairs..." 
            className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-100 bg-gray-50 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors text-gray-900"
          />
          <span className="absolute left-4 top-4 text-gray-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {/* Render the default 'All' button */}
        <button 
          onClick={() => setActiveCategory("All")}
          className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeCategory === "All" 
              ? "bg-blue-100 text-blue-700 border border-blue-200" 
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          All
        </button>

        {/* Render database categories */}
        {categories.map((cat) => (
          <button 
            key={cat.category_id}
            onClick={() => setActiveCategory(cat.category_id)}
            className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.category_id 
                ? "bg-blue-100 text-blue-700 border border-blue-200" 
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
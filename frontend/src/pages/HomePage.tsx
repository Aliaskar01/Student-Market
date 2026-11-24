import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import Hero from '../components/Hero';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import type { Category, Listing } from '../types';

const CONDITION_OPTIONS = ['New', 'Like new', 'Good', 'Used'];

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<number | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [condition, setCondition] = useState('All');
  const [appliedFilters, setAppliedFilters] = useState({
    min: '',
    max: '',
    condition: 'All',
  });
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Debounce keyword search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load categories once
  useEffect(() => {
    apiFetch<Category[]>('/api/categories', { skipAuth: true })
      .then(setCategories)
      .catch(() => {
        // Handled cleanly if backend unreachable
      });
  }, []);

  const loadListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (activeCategory !== 'All') params.set('category_id', String(activeCategory));
    if (appliedFilters.min !== '') params.set('min_price', appliedFilters.min);
    if (appliedFilters.max !== '') params.set('max_price', appliedFilters.max);
    if (appliedFilters.condition !== 'All') {
      params.set('condition', appliedFilters.condition);
    }
    params.set('sort', sortBy);

    try {
      const data = await apiFetch<Listing[]>(`/api/listings?${params.toString()}`);
      setProducts(data);
    } catch {
      setError('Could not load marketplace listings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, debouncedSearch, appliedFilters, sortBy, isAuthenticated]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const handleApplyFilters = () => {
    setAppliedFilters({
      min: minPrice.trim(),
      max: maxPrice.trim(),
      condition,
    });
    setMobileFiltersOpen(false);
  };

  const handleResetFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setCondition('All');
    setAppliedFilters({ min: '', max: '', condition: 'All' });
    setActiveCategory('All');
    setSearchQuery('');
    setMobileFiltersOpen(false);
  };

  const handleToggleFavorite = async (
    listingId: number,
    currentlyFavorited: boolean
  ) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/' } });
      return;
    }
    try {
      await apiFetch(`/api/favorites/${listingId}`, {
        method: currentlyFavorited ? 'DELETE' : 'POST',
      });
      setProducts((prev) =>
        prev.map((item) =>
          item.listing_id === listingId
            ? { ...item, is_favorited: !currentlyFavorited }
            : item
        )
      );
    } catch {
      // Ignore transient errors
    }
  };

  const activeFilterCount =
    (appliedFilters.min ? 1 : 0) +
    (appliedFilters.max ? 1 : 0) +
    (appliedFilters.condition !== 'All' ? 1 : 0);

  return (
    <>
      <Hero
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        categories={categories}
      />

      {/* Mobile Filter & Sort Quick Bar */}
      <div className="flex lg:hidden items-center justify-between gap-3 mb-4">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((prev) => !prev)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 shadow-xs"
        >
          <SlidersHorizontal className="w-4 h-4 text-blue-600" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>

        <select
          aria-label="Sort listings"
          value={sortBy}
          onChange={(e) =>
            setSortBy(e.target.value as 'newest' | 'price_asc' | 'price_desc')
          }
          className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-blue-600"
        >
          <option value="newest">Newest first</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 mt-2 lg:mt-4">
        {/* Sidebar Filters (collapsible on mobile, always visible on lg+) */}
        <aside
          className={`${
            mobileFiltersOpen ? 'flex' : 'hidden'
          } lg:flex col-span-1 border border-gray-100 bg-white rounded-2xl p-6 h-max flex-col gap-5 shadow-xs lg:sticky lg:top-24`}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-lg">Filters</h3>
            <div className="flex items-center gap-3">
              {(activeFilterCount > 0 || activeCategory !== 'All' || searchQuery) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="lg:hidden p-1 text-gray-400 hover:text-gray-700"
                aria-label="Close filters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="min-price" className="text-sm font-medium text-gray-700">
              Min price
            </label>
            <input
              id="min-price"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="0 ₸"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-600 text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="max-price" className="text-sm font-medium text-gray-700">
              Max price
            </label>
            <input
              id="max-price"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="150 000 ₸"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-600 text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Condition</label>
            <div className="flex flex-wrap gap-2">
              {CONDITION_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setCondition(condition === opt ? 'All' : opt)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    condition === opt
                      ? 'bg-blue-100 text-blue-600 border-blue-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyFilters}
            className="w-full py-2.5 mt-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
          >
            Apply filters
          </button>
        </aside>

        {/* Listings Area */}
        <div className="col-span-1 lg:col-span-3">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-sm font-bold text-gray-700">
              {loading
                ? 'Loading listings...'
                : `${products.length} listing${products.length === 1 ? '' : 's'} · student items near campus`}
            </h2>

            {/* Desktop Sort Dropdown */}
            <div className="hidden lg:flex items-center gap-2">
              <label htmlFor="desktop-sort" className="text-xs font-medium text-gray-500">
                Sort by
              </label>
              <select
                id="desktop-sort"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as 'newest' | 'price_asc' | 'price_desc')
                }
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:border-blue-600"
              >
                <option value="newest">Newest first</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-6 mb-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={loadListings}
                className="px-3 py-1.5 bg-white border border-red-200 rounded-lg font-bold text-xs hover:bg-red-100"
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-3 animate-pulse"
                >
                  <div className="w-full aspect-[4/3] rounded-xl bg-gray-100" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-5 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
                {products.map((product, idx) => (
                  <ProductCard
                    key={product.listing_id}
                    product={product}
                    index={idx}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
              {products.length === 0 && !error && (
                <div className="py-12 px-6 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 flex flex-col items-center gap-3">
                  <p className="font-medium">No items found matching your filters.</p>
                  {(activeFilterCount > 0 || activeCategory !== 'All' || searchQuery) && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

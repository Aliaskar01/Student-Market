import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { apiFetch } from '../lib/api';
import type { Listing } from '../types';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Listing[]>('/api/favorites')
      .then(setFavorites)
      .finally(() => setLoading(false));
  }, []);

  const handleToggleFavorite = async (listingId: number) => {
    await apiFetch(`/api/favorites/${listingId}`, { method: 'DELETE' });
    setFavorites((prev) => prev.filter((item) => item.listing_id !== listingId));
  };

  return (
    <div className="max-w-5xl mx-auto py-8 sm:py-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Saved items</h1>
      <p className="text-sm text-gray-500 mb-6 sm:mb-8">
        Listings you bookmarked to check back on later.
      </p>

      {loading ? (
        <div className="py-12 text-center text-gray-500 text-sm">Loading saved items...</div>
      ) : favorites.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center gap-3">
          <p className="text-gray-500 font-medium">You haven't saved any items yet.</p>
          <Link
            to="/"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl"
          >
            Browse marketplace
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
          {favorites.map((item, idx) => (
            <ProductCard
              key={item.listing_id}
              product={item}
              index={idx}
              onToggleFavorite={() => handleToggleFavorite(item.listing_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

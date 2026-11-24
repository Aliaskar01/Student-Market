import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Image as ImageIcon } from 'lucide-react';
import { ApiError, apiFetch, resolveMediaUrl } from '../lib/api';
import type { Listing } from '../types';

const pastelColors = ['bg-blue-100', 'bg-green-100', 'bg-orange-100', 'bg-purple-100'];

export default function MyListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<Listing[]>('/api/listings/my')
      .then(setListings)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Unable to load your listings.')
      )
      .finally(() => setLoading(false));
  }, []);

  const handleToggleStatus = async (product: Listing) => {
    const nextStatus = product.status === 'Active' ? 'Sold' : 'Active';
    setBusyId(product.listing_id);
    setError(null);
    try {
      const updated = await apiFetch<Listing>(`/api/listings/${product.listing_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setListings((prev) =>
        prev.map((item) => (item.listing_id === product.listing_id ? updated : item))
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (listingId: number) => {
    setBusyId(listingId);
    setError(null);
    try {
      await apiFetch(`/api/listings/${listingId}`, { method: 'DELETE' });
      setListings((prev) => prev.filter((item) => item.listing_id !== listingId));
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete listing.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My listings</h1>
        <Link
          to="/sell"
          className="w-full sm:w-auto text-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
        >
          + New listing
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-6 sm:mb-8">
        Manage active items and keep marketplace information accurate.
      </p>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm font-medium">
            Loading your listings...
          </div>
        ) : listings.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-medium flex flex-col items-center gap-3">
            <span>You don't have any listings yet.</span>
            <Link
              to="/sell"
              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100"
            >
              Publish your first item
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            {listings.map((product) => {
              const fallbackColor = pastelColors[product.listing_id % pastelColors.length];
              const thumb =
                product.photos && product.photos.length > 0
                  ? resolveMediaUrl(product.photos[0].image_reference)
                  : null;
              const updatedLabel = new Date(product.updated_at).toLocaleDateString();

              return (
                <div
                  key={product.listing_id}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors rounded-xl"
                >
                  <Link
                    to={`/product/${product.listing_id}`}
                    className={`w-full sm:w-16 h-40 sm:h-16 rounded-xl ${fallbackColor} flex-shrink-0 overflow-hidden flex items-center justify-center`}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-500/40" />
                    )}
                  </Link>

                  <div className="flex flex-col flex-grow min-w-0">
                    <Link
                      to={`/product/${product.listing_id}`}
                      className="font-bold text-gray-900 hover:underline text-base truncate"
                    >
                      {product.title}
                    </Link>
                    <span className="text-xs text-gray-500 font-medium mt-1">
                      {product.category_name} · Updated {updatedLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="font-bold text-gray-900 whitespace-nowrap sm:w-28 sm:text-right">
                      {Number(product.price).toLocaleString('ru-RU')} ₸
                    </div>

                    <div className="flex sm:justify-center">
                      <span
                        className={`px-3 py-1 text-xs font-bold rounded-full border ${
                          product.status === 'Active'
                            ? 'bg-blue-50 text-blue-600 border-blue-100'
                            : product.status === 'Sold'
                            ? 'bg-green-50 text-green-700 border-green-100'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {product.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-1 sm:mt-0">
                    <Link
                      to={`/edit/${product.listing_id}`}
                      className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === product.listing_id}
                      onClick={() => handleToggleStatus(product)}
                      className="px-3.5 py-2 text-xs font-bold text-blue-600 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      {product.status === 'Active' ? 'Mark sold' : 'Activate'}
                    </button>

                    {confirmDeleteId === product.listing_id ? (
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          disabled={busyId === product.listing_id}
                          onClick={() => handleDelete(product.listing_id)}
                          className="px-3 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(product.listing_id)}
                        className="px-3.5 py-2 text-xs font-bold text-red-600 bg-white border border-gray-200 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

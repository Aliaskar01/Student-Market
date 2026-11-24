import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Image as ImageIcon } from 'lucide-react';
import { resolveMediaUrl } from '../lib/api';
import type { Listing } from '../types';

const pastelColors = ['bg-blue-100', 'bg-green-100', 'bg-orange-100', 'bg-purple-100'];

export default function ProductCard({
  product,
  index,
  onToggleFavorite,
}: {
  product: Listing;
  index: number;
  onToggleFavorite?: (listingId: number, currentlyFavorited: boolean) => void;
}) {
  const fallbackColor = pastelColors[index % pastelColors.length];
  const primaryPhotoUrl =
    product.photos && product.photos.length > 0
      ? resolveMediaUrl(product.photos[0].image_reference)
      : null;

  const handleFavClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(product.listing_id, product.is_favorited);
  };

  return (
    <Link
      to={`/product/${product.listing_id}`}
      className="flex flex-col gap-3 p-4 bg-white border border-gray-100 rounded-2xl transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer group"
    >
      {/* Product Photo or Pastel Placeholder */}
      <div
        className={`relative w-full aspect-[4/3] rounded-xl ${fallbackColor} flex items-center justify-center overflow-hidden`}
      >
        {primaryPhotoUrl ? (
          <img
            src={primaryPhotoUrl}
            alt={product.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
          />
        ) : (
          <ImageIcon className="w-8 h-8 text-gray-500/40" />
        )}

        {onToggleFavorite && (
          <button
            type="button"
            onClick={handleFavClick}
            aria-label={product.is_favorited ? 'Remove from saved' : 'Save listing'}
            className={`absolute top-2.5 right-2.5 p-2 rounded-full shadow-sm backdrop-blur-sm transition-colors ${
              product.is_favorited
                ? 'bg-red-50 text-red-600'
                : 'bg-white/90 text-gray-500 hover:text-red-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${product.is_favorited ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col">
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
          {product.title}
        </h3>
        <span className="font-bold text-lg text-gray-900 mt-1">
          {Number(product.price).toLocaleString('ru-RU')} ₸
        </span>
        <span className="text-xs text-gray-500 mt-1 font-medium line-clamp-1">
          {product.category_name} · {product.condition || 'Not specified'}
        </span>
      </div>
    </Link>
  );
}

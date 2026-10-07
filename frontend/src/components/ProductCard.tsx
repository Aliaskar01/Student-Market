import { Link } from 'react-router-dom';

const pastelColors = ['bg-blue-100', 'bg-green-100', 'bg-orange-100', 'bg-purple-100'];

export default function ProductCard({
  product,
  index,
}: {
  product: {
    listing_id: number;
    title: string;
    price: number | string;
    category_id: number;
    condition: string | null;
  };
  index: number;
}) {
  const fallbackColor = pastelColors[index % pastelColors.length];

  return (
    <Link 
      to={`/product/${product.listing_id}`} 
      className="flex flex-col gap-3 p-4 bg-white border border-gray-100 rounded-2xl transition-all hover:shadow-md hover:-translate-y-1 cursor-pointer block"
    >
      {/* Colored Rectangle Placeholder */}
      <div className={`w-full aspect-[4/3] rounded-xl ${fallbackColor} flex items-center justify-center overflow-hidden`}>
      </div>
      
      {/* Details */}
      <div className="flex flex-col">
        <h3 className="font-semibold text-gray-900 text-sm">{product.title}</h3>
        <span className="font-bold text-lg text-gray-900 mt-1">
          {Number(product.price).toLocaleString('ru-RU')} ₸
        </span>
        <span className="text-xs text-gray-500 mt-1 font-medium">
          Category ID: {product.category_id} · {product.condition || 'Not specified'}
        </span>
      </div>
    </Link>
  );
}
import { useParams, Link } from 'react-router-dom';

// We now accept the live products array as a prop
export default function ProductDetails({ products }: { products: any[] }) {
  const { id } = useParams();
  
  // Find the product matching the listing_id in the URL
  const product = products.find(p => p.listing_id === Number(id));

  if (!product) {
    return <div className="py-20 text-center text-2xl font-bold text-gray-400">Loading or Product not found...</div>;
  }

  const pastelColors = ['bg-blue-100', 'bg-green-100', 'bg-orange-100', 'bg-purple-100'];
  const fallbackColor = pastelColors[product.listing_id % pastelColors.length];

  return (
    <div className="py-6">
      <Link to="/" className="text-sm font-medium text-blue-600 hover:underline mb-6 inline-block">
        ← Back to results
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-4">
        {/* Left: Images */}
        <div className="flex flex-col gap-4">
          <div className={`w-full aspect-square rounded-2xl ${fallbackColor} flex items-center justify-center`}></div>
          <div className="flex gap-4">
            <div className={`w-24 h-24 rounded-xl ${pastelColors[0]} opacity-80 cursor-pointer`}></div>
            <div className={`w-24 h-24 rounded-xl ${pastelColors[1]} opacity-80 cursor-pointer`}></div>
            <div className={`w-24 h-24 rounded-xl ${pastelColors[2]} opacity-80 cursor-pointer`}></div>
          </div>
        </div>

        {/* Right: Product Info */}
        <div className="flex flex-col">
          <span className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full w-max mb-4">
            Category ID: {product.category_id}
          </span>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{product.title}</h1>
          <span className="text-3xl font-bold text-blue-600 mb-2">
            {Number(product.price).toLocaleString('ru-RU')} ₸
          </span>
          <p className="text-sm text-gray-500 mb-8">Condition: {product.condition || 'Not specified'}</p>

          <h3 className="font-bold text-gray-900 mb-2">Description</h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-8">
            {product.description || 'No description provided.'}
          </p>

          {/* Seller Box */}
          <div className="border border-gray-200 rounded-2xl p-5 mb-8 flex flex-col gap-1">
            <span className="text-xs text-gray-400 font-medium">Seller</span>
            <span className="font-bold text-gray-900">Seller ID: {product.seller_id} · Student seller</span>
            <span className="text-sm text-gray-500 mt-1">Usually replies within a few hours</span>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl text-center transition-colors">
              Contact seller
            </button>
            <button className="flex-1 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 font-bold py-3 px-6 rounded-xl transition-colors">
              Buy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
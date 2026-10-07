import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockProducts } from '../data/mockData';

export default function ProductDetails() {
  const { id } = useParams();
  const product = mockProducts.find(p => p.id === Number(id));

  if (!product) {
    return <div className="py-20 text-center text-2xl font-bold text-gray-400">Product not found</div>;
  }

  // Pastel fallback color generator based on ID
  const pastelColors = ['bg-blue-100', 'bg-green-100', 'bg-orange-100', 'bg-purple-100'];
  const fallbackColor = pastelColors[product.id % pastelColors.length];

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
            {product.category}
          </span>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{product.title}</h1>
          <span className="text-3xl font-bold text-blue-600 mb-2">
            {product.price.toLocaleString('ru-RU')} ₸
          </span>
          <p className="text-sm text-gray-500 mb-8">Condition: {product.condition}</p>

          <h3 className="font-bold text-gray-900 mb-2">Description</h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-8">
            {product.description}
          </p>

          {/* Seller Box */}
          <div className="border border-gray-200 rounded-2xl p-5 mb-8 flex flex-col gap-1">
            <span className="text-xs text-gray-400 font-medium">Seller</span>
            <span className="font-bold text-gray-900">{product.sellerName} · Student seller</span>
            <span className="text-sm text-gray-500 mt-1">Usually replies within a few hours</span>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <a href={`mailto:dummy@university.edu?subject=Interested in ${product.title}`} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl text-center transition-colors">
              Contact seller
            </a>
            <button className="flex-1 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 font-bold py-3 px-6 rounded-xl transition-colors">
              Buy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
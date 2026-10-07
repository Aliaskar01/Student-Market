import React from 'react';
import { Link } from 'react-router-dom';

type MyListingsProps = {
  products: any[];
  currentUser: { id: number; name: string; initials: string; email: string };
  onDelete: (listing_id: number) => void;
};

const pastelColors = ['bg-blue-100', 'bg-green-100', 'bg-orange-100', 'bg-purple-100'];

export default function MyListings({ products, currentUser, onDelete }: MyListingsProps) {
  const userProducts = products.filter(p => p.seller_id === currentUser.id);

  return (
    <div className="max-w-4xl mx-auto py-10">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold text-gray-900">My listings</h1>
        <Link to="/sell" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
          + New listing
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-8">Manage active items and keep marketplace information accurate.</p>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
        {userProducts.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-medium">
            You don't have any active listings yet.
          </div>
        ) : (
          <div className="flex flex-col">
            {userProducts.map((product) => {
              const fallbackColor = pastelColors[product.listing_id % pastelColors.length];
              
              return (
                <div key={product.listing_id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors rounded-xl">
                  
                  <Link to={`/product/${product.listing_id}`} className={`w-16 h-16 rounded-xl ${fallbackColor} flex-shrink-0 hidden sm:block`}></Link>
                  
                  <div className="flex flex-col flex-grow">
                    <Link to={`/product/${product.listing_id}`} className="font-bold text-gray-900 hover:underline text-base">
                      {product.title}
                    </Link>
                    <span className="text-xs text-gray-500 font-medium mt-1">
                      Category ID: {product.category_id} · Updated today
                    </span>
                  </div>

                  <div className="font-bold text-gray-900 whitespace-nowrap sm:w-28 sm:text-right">
                    {Number(product.price).toLocaleString('ru-RU')} ₸
                  </div>

                  <div className="w-20 flex sm:justify-center">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full border border-blue-100">
                      {product.status || 'Active'}
                    </span>
                  </div>

                  <div className="flex gap-2 mt-3 sm:mt-0">
                    <button className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      Edit
                    </button>
                    <button 
                      onClick={() => onDelete(product.listing_id)} 
                      className="px-4 py-2 text-xs font-bold text-red-600 bg-white border border-gray-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
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
import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import ProductCard from './components/ProductCard';

type Product = {
  id: number;
  title: string;
  price: number;
  category: string;
  condition: string;
};

type HomePageProps = {
  mockProducts: Product[];
};

// Extracted Home Page Logic
function HomePage({ mockProducts }: HomePageProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter products dynamically based on search text and category button clicked
  const filteredProducts = mockProducts.filter(product => {
    const matchesCategory = activeCategory === "All" || product.category === activeCategory;
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <Hero 
        activeCategory={activeCategory} 
        setActiveCategory={setActiveCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <div className="mt-4">
        <h2 className="text-sm font-bold text-gray-700 mb-4">
          {filteredProducts.length} listings · student items near campus
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product, idx) => (
            <ProductCard key={product.id} product={product} index={idx} />
          ))}
        </div>
        {filteredProducts.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            No items found matching "{searchQuery}" in {activeCategory}.
          </div>
        )}
      </div>
    </>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState({ 
    name: 'Aibar K.', 
    initials: 'AK',
    email: 'aibar@university.edu'
  });

  const mockProducts = [
    { id: 1, title: 'Calculator', price: 12000, category: 'Books', condition: 'Used' },
    { id: 2, title: 'Logitech MX Keys Mini', price: 35000, category: 'Electronics', condition: 'Good' },
    { id: 3, title: 'IKEA study chair', price: 18500, category: 'Furniture', condition: 'Used' },
    { id: 4, title: 'Data Structures textbook', price: 10500, category: 'Books', condition: 'Good' },
    { id: 5, title: 'Uni hoodie, size M', price: 9000, category: 'Clothes', condition: 'Like new' },
    { id: 6, title: 'Desk lamp', price: 7500, category: 'Furniture', condition: 'Good' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navigation user={currentUser} />
      
      <main className="max-w-6xl mx-auto px-6 pb-16">
        <Routes>
          <Route path="/" element={<HomePage mockProducts={mockProducts} />} />
          <Route path="/sell" element={<div className="py-20 text-center text-2xl font-bold text-gray-400">Sell Page UI (Create Listing) goes here</div>} />
          <Route path="/my-listings" element={<div className="py-20 text-center text-2xl font-bold text-gray-400">My Listings UI goes here</div>} />
          <Route path="/login" element={<div className="py-20 text-center text-2xl font-bold text-gray-400">Login/Register UI goes here</div>} />
          <Route path="/product/:id" element={<div className="py-20 text-center text-2xl font-bold text-gray-400">Single Product Detail UI goes here</div>} />
          <Route path="/other" element={<div className="py-20 text-center text-2xl font-bold text-gray-400">Other Page UI goes here</div>} />
        </Routes>
      </main>
    </div>
  );
}
import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import ProductCard from './components/ProductCard';
import ProductDetails from './pages/ProductDetails';
import CreateListing from './pages/CreateListing';
import MyListings from './components/MyListings';
import { mockProducts, Product } from './data/mockData';
import StudentProfile from './pages/StudentProfile';
import AuthPage from './pages/AuthPage';

type HomePageProps = {
  products: Product[];
};

function HomePage({ products }: HomePageProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Sidebar Filter Form State
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [condition, setCondition] = useState("All");
  
  // Applied Filters State (Updates only when clicking "Apply filters")
  const [appliedFilters, setAppliedFilters] = useState({ min: 0, max: Infinity, condition: "All" });

  const handleApplyFilters = () => {
    setAppliedFilters({
      min: minPrice === "" ? 0 : Number(minPrice),
      max: maxPrice === "" ? Infinity : Number(maxPrice),
      condition: condition
    });
  };

  // Filter Logic
  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === "All" || product.category === activeCategory;
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice = product.price >= appliedFilters.min && product.price <= appliedFilters.max;
    
    // Case-insensitive check for condition (e.g., matches "Used" inside "Used - Good")
    const matchesCondition = appliedFilters.condition === "All" || 
      product.condition.toLowerCase().includes(appliedFilters.condition.toLowerCase());
    
    return matchesCategory && matchesSearch && matchesPrice && matchesCondition;
  });

  return (
    <>
      <Hero 
        activeCategory={activeCategory} setActiveCategory={setActiveCategory}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-4">
        {/* Left Sidebar Filters */}
        <div className="col-span-1 border border-gray-100 bg-white rounded-2xl p-6 h-max flex flex-col gap-6">
          <h3 className="font-bold text-gray-900 text-lg">Filters</h3>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Min price</label>
            <input 
              type="number" placeholder="0 ₸" value={minPrice} onChange={e => setMinPrice(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Max price</label>
            <input 
              type="number" placeholder="150 000 ₸" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Condition</label>
            <div className="flex gap-2">
              <button 
                onClick={() => setCondition(condition === "New" ? "All" : "New")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  condition === "New" ? "bg-blue-100 text-blue-600 border-blue-200" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                }`}
              >New</button>
              <button 
                onClick={() => setCondition(condition === "Used" ? "All" : "Used")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  condition === "Used" ? "bg-blue-100 text-blue-600 border-blue-200" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                }`}
              >Used</button>
            </div>
          </div>

          <button onClick={handleApplyFilters} className="w-full py-2.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm">
            Apply filters
          </button>
        </div>

        {/* Right Product Grid */}
        <div className="col-span-1 lg:col-span-3">
          <h2 className="text-sm font-bold text-gray-700 mb-4">
            {filteredProducts.length} listings · student items near campus
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredProducts.map((product, idx) => (
              <ProductCard key={product.id} product={product} index={idx} />
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="py-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
              No items found matching your filters.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [currentUser] = useState({ name: 'Aibar K.', initials: 'AK', email: 'aibar@university.edu' });

  // State holding all products
  const [products, setProducts] = useState<Product[]>(mockProducts);

  // Add a product (Used in CreateListing)
  const handleAddProduct = (newProduct: Product) => {
    setProducts([newProduct, ...products]);
  };

  // 2. Delete a product (Used in MyListings)
  const handleDeleteProduct = (id: number) => {
    setProducts(products.filter(product => product.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navigation user={currentUser} />
      
      <main className="max-w-6xl mx-auto px-6 pb-16">
        <Routes>
          <Route path="/" element={<HomePage products={products} />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/sell" element={<CreateListing addProduct={handleAddProduct} />} />
          
          <Route 
            path="/my-listings" 
            element={<MyListings products={products} currentUser={currentUser} onDelete={handleDeleteProduct} />} 
          />
          
          <Route 
            path="/profile" 
            element={<StudentProfile user={currentUser} />} 
          />
          <Route path="/login" element={<AuthPage />} />
        </Routes>
      </main>
    </div>
  );
}
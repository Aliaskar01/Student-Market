import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import ProductCard from './components/ProductCard';
import ProductDetails from './pages/ProductDetails';
import CreateListing from './pages/CreateListing';
import MyListings from './components/MyListings'; 
import StudentProfile from './pages/StudentProfile';
import AuthPage from './pages/AuthPage';

function HomePage({ products, categories }: { products: any[], categories: any[] }) {
  // activeCategory is now either "All" or a category_id number
  const [activeCategory, setActiveCategory] = useState<number | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [condition, setCondition] = useState("All");
  const [appliedFilters, setAppliedFilters] = useState({ min: 0, max: Infinity, condition: "All" });

  const handleApplyFilters = () => {
    setAppliedFilters({
      min: minPrice === "" ? 0 : Number(minPrice),
      max: maxPrice === "" ? Infinity : Number(maxPrice),
      condition: condition
    });
  };

  const filteredProducts = products.filter(product => {
    // Database strict matching on category_id
    const matchesCategory = activeCategory === "All" || product.category_id === activeCategory; 
    
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice = Number(product.price) >= appliedFilters.min && Number(product.price) <= appliedFilters.max;
    
    // Safety check for null condition strings before calling toLowerCase()
    const matchesCondition = appliedFilters.condition === "All" || 
      (product.condition && product.condition.toLowerCase().includes(appliedFilters.condition.toLowerCase()));
    
    return matchesCategory && matchesSearch && matchesPrice && matchesCondition;
  });

  return (
    <>
      <Hero 
        activeCategory={activeCategory} setActiveCategory={setActiveCategory}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        categories={categories}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-4">
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

        <div className="col-span-1 lg:col-span-3">
          <h2 className="text-sm font-bold text-gray-700 mb-4">
            {filteredProducts.length} listings · student items near campus
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredProducts.map((product, idx) => (
              <ProductCard key={product.listing_id} product={product} index={idx} />
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
  const [currentUser] = useState({ id: 1, name: 'Aibar K.', initials: 'AK', email: 'aibar@university.edu' });

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Fetch from PostgreSQL via FastAPI on load
  useEffect(() => {
    fetch('http://localhost:8000/api/listings')
      .then(response => response.json())
      .then(data => setProducts(data))
      .catch(error => console.error("Error fetching listings:", error));

    fetch('http://localhost:8000/api/categories')
      .then(response => response.json())
      .then(data => setCategories(data))
      .catch(error => console.error("Error fetching categories:", error));
  }, []);

  const handleAddProduct = (newProduct: any) => {
    setProducts([newProduct, ...products]);
  };

  const handleDeleteProduct = (listing_id: number) => {
    setProducts(products.filter(product => product.listing_id !== listing_id));
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navigation user={currentUser} />
      
      <main className="max-w-6xl mx-auto px-6 pb-16">
        <Routes>
          {/* Pass categories down to the HomePage */}
          <Route path="/" element={<HomePage products={products} categories={categories} />} />
          <Route path="/product/:id" element={<ProductDetails products={products} />} />
          <Route path="/sell" element={<CreateListing addProduct={handleAddProduct} />} />
          <Route 
            path="/my-listings" 
            element={<MyListings products={products} currentUser={currentUser} onDelete={handleDeleteProduct} />} 
          />
          <Route path="/profile" element={<StudentProfile user={currentUser} />} />
          <Route path="/login" element={<AuthPage />} />
        </Routes>
      </main>
    </div>
  );
}
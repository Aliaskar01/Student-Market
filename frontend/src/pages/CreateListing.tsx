import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type CreateListingProps = {
  addProduct: (product: any) => void;
};

export default function CreateListing({ addProduct }: CreateListingProps) {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: '', 
    price: '', 
    category_id: 1, // Default fallback
    condition: 'Good', 
    description: ''
  });

  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const conditions = ["New", "Like new", "Good", "Used"];

  // Fetch real categories from the database when the page loads
  useEffect(() => {
    fetch('http://localhost:8000/api/categories')
      .then(res => res.json())
      .then(data => {
        setDbCategories(data);
        // Automatically select the first category if data exists
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, category_id: data[0].category_id }));
        }
      })
      .catch(err => console.error("Error fetching categories:", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct the payload exactly as FastAPI expects it
    const payload = {
      title: formData.title,
      price: Number(formData.price),
      category_id: Number(formData.category_id),
      condition: formData.condition,
      usage_state: formData.condition, // Mirroring condition for now
      description: formData.description,
      status: "Active",
      seller_id: 1 // Hardcoded to match our mock student user (id: 1) in the DB
    };

    try {
      const response = await fetch('http://localhost:8000/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const newListing = await response.json();
        // Update local React state instantly so the homepage grid refreshes
        addProduct(newListing); 
        navigate('/'); 
      } else {
        const errorData = await response.text();
        console.error("Failed to create listing:", errorData);
        alert("Error creating listing. Ensure you have created at least one Student (id: 1) and Category in the database via Swagger!");
      }
    } catch (error) {
      console.error("Network error:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a listing</h1>
      <p className="text-sm text-gray-500 mb-8">Add the essential details students need before contacting you.</p>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-6">
        
        {/* Title and Price Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-900">Title</label>
            <input 
              required
              type="text" 
              value={formData.title}
              placeholder="e.g. Physics textbook" 
              className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-sm text-gray-900"
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-900">Price (₸)</label>
            <input 
              required
              type="number" 
              value={formData.price}
              placeholder="e.g. 12000" 
              className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-sm text-gray-900"
              onChange={(e) => setFormData({...formData, price: e.target.value})}
            />
          </div>
        </div>

        {/* Category and Condition Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-900">Category</label>
            <select 
              className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none bg-white text-sm text-gray-900"
              value={formData.category_id}
              onChange={(e) => setFormData({...formData, category_id: Number(e.target.value)})}
            >
              {dbCategories.length === 0 && <option value={1}>Loading categories...</option>}
              {dbCategories.map(cat => (
                <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-900">Condition</label>
            <select 
              className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none bg-white text-sm text-gray-900"
              value={formData.condition}
              onChange={(e) => setFormData({...formData, condition: e.target.value})}
            >
              {conditions.map(cond => <option key={cond} value={cond}>{cond}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-gray-900">Description</label>
          <textarea 
            required
            rows={3}
            value={formData.description}
            placeholder="Describe item details, defects and pickup notes" 
            className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none resize-none transition-colors text-sm text-gray-900"
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
        </div>

        {/* Photo Upload Area (Visual Only For Now) */}
        <div className="border-2 border-dashed border-gray-200 bg-gray-50 rounded-2xl p-10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span className="font-bold text-gray-900 text-sm mt-2">Add product photos</span>
          <span className="text-xs text-gray-500">Upload at least one clear photo</span>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-4">
          <button type="button" onClick={() => navigate('/')} className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm">
            Publish listing
          </button>
        </div>
      </form>
    </div>
  );
}
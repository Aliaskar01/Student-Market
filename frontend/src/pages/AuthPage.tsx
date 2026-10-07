import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const navigate = useNavigate();
  // State to toggle between Login and Register modes
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For the MVP frontend demo, just redirect to the home page
    // Later, Bolat will wire this up to the FastAPI backend!
    navigate('/');
  };

  return (
    <div className="py-8">
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Blue Panel */}
        <div className="w-full md:w-5/12 bg-blue-600 p-10 md:p-14 flex flex-col justify-center text-white">
          <h2 className="text-xl font-bold tracking-tight">Student Market</h2>
          <h1 className="text-4xl md:text-5xl font-bold mt-10 leading-tight">
            Buy and sell within your student community.
          </h1>
          <p className="text-blue-100 mt-6 text-sm md:text-base leading-relaxed">
            Focused listings, simple search and student-to-student contact — without losing offers in group chats.
          </p>
        </div>

        {/* Right Form Panel */}
        <div className="w-full md:w-7/12 p-10 md:p-16 flex flex-col justify-center">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            {isLogin ? 'Welcome back' : 'Student-only marketplace'}
          </span>
          
          <h2 className="text-3xl font-bold text-gray-900 mt-2">
            {isLogin ? 'Sign in to Student Market' : 'Create your student account'}
          </h2>
          
          <p className="text-sm text-gray-500 mt-2 mb-8">
            {isLogin
              ? 'Use your university email to access the marketplace.'
              : 'Register with your university email. Student verification stays lightweight for the MVP.'}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Show Full Name only on Register */}
            {!isLogin && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-900">Full name</label>
                <input type="text" placeholder="Your name" required className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-sm text-gray-900" />
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-900">University email</label>
              <input type="email" placeholder="name@university.edu" required className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-sm text-gray-900" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-900">Password</label>
              <input type="password" placeholder="••••••••" required className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-sm text-gray-900" />
            </div>

            {/* Show Confirm Password & Terms only on Register */}
            {!isLogin && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-gray-900">Confirm password</label>
                  <input type="password" placeholder="Repeat password" required className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-sm text-gray-900" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" id="terms" required className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600" />
                  <label htmlFor="terms" className="text-sm text-gray-500">I agree to the terms of use</label>
                </div>
              </>
            )}

            <button type="submit" className="w-full py-3.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm">
              {isLogin ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-8 text-sm text-gray-500">
            {isLogin ? 'New here? ' : 'Already have an account? '}
            <button onClick={() => setIsLogin(!isLogin)} className="font-bold text-blue-600 hover:underline">
              {isLogin ? 'Create student account' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
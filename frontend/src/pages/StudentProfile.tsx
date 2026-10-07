import { useState } from 'react';

type UserProps = {
  user: { name: string; initials: string; email: string };
};

export default function StudentProfile({ user }: UserProps) {
  // State for Personal Information form
  const [personalInfo, setPersonalInfo] = useState({
    name: user.name,
    university: 'Kazakh-British Technical University', // Mock university
    email: user.email,
  });

  return (
    <div className="max-w-4xl mx-auto py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">My profile</h1>
      <p className="text-sm text-gray-500 mb-8">Manage your personal information and account security.</p>

      {/* Card 1: Personal Information */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
        
        {/* Header: Avatar and Role */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xl font-bold">
            {user.initials}
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900">{user.name}</span>
            <span className="text-sm text-gray-500 font-medium">Student account</span>
          </div>
        </div>

        <hr className="my-8 border-gray-100" />

        <h2 className="text-lg font-bold text-gray-900 mb-6">Personal information</h2>
        
        <form className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-900">Name</label>
              <input 
                type="text" 
                value={personalInfo.name}
                onChange={(e) => setPersonalInfo({...personalInfo, name: e.target.value})}
                className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-sm text-gray-900"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-900">University</label>
              <input 
                type="text" 
                placeholder="Enter your university"
                value={personalInfo.university}
                onChange={(e) => setPersonalInfo({...personalInfo, university: e.target.value})}
                className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-sm text-gray-900"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-900">University email</label>
            <input 
              type="email" 
              value={personalInfo.email}
              onChange={(e) => setPersonalInfo({...personalInfo, email: e.target.value})}
              className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-sm text-gray-900"
            />
            <span className="text-xs text-gray-500 mt-1">Use your university email for your Student Market account.</span>
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button type="button" className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="button" className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm">
              Save changes
            </button>
          </div>
        </form>
      </div>

      {/* Card 2: Account Security */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Account security</h2>
        <p className="text-sm text-gray-500 mb-6">Keep your account secure with a strong, unique password.</p>

        <form className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-900">Current password</label>
              <input 
                type="password" 
                placeholder="Enter your current password" 
                className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-sm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-900">New password</label>
              <input 
                type="password" 
                placeholder="Enter a new password" 
                className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-sm"
              />
            </div>
          </div>

          <div className="mt-2">
            <button type="button" className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm">
              Change password
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
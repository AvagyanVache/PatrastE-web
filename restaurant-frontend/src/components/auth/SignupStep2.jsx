import { ArrowLeft, Upload, MapPin } from 'lucide-react';
import AuthBackground from './AuthBackground';
export default function SignupStep2() {
  return (
    <AuthBackground>
      {/* Header */}
      <div className="p-8 flex items-center gap-6">
        <button className="bg-gray-800 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <h1 className="text-5xl font-bold text-black">PatrastE</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-6 px-4">
        <div className="max-w-2xl mx-auto bg-white/95 backdrop-blur rounded-3xl shadow-2xl">
          <div className="p-8 max-h-screen overflow-y-auto">
            <h2 className="text-3xl font-bold text-black mb-2">Sign Up - Step 2 of 2</h2>
            <p className="text-gray-700 mb-6">Complete your restaurant profile</p>

            <div className="space-y-5">
              <input placeholder="Restaurant Name" className="w-full px-4 py-4 rounded-xl border border-gray-300" />
              <input placeholder="Enter Contact Phone" className="w-full px-4 py-4 rounded-xl border border-gray-300" />

              {/* Dropdown */}
              <select className="w-full px-4 py-4 rounded-xl border border-gray-300 bg-white">
                <option>Select Your FoodPlace category</option>
                <option>Restaurant</option>
                <option>Cafe</option>
                <option>Fast Food</option>
              </select>

              <input placeholder="API Link (Optional)" className="w-full px-4 py-4 rounded-xl border border-gray-300" />
              <input placeholder="Enter Restaurant Address" className="w-full px-4 py-4 rounded-xl border border-gray-300" />

              <button className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
                <MapPin className="w-5 h-5" /> Add Address
              </button>

              <div className="bg-gray-100 rounded-xl p-4 min-h-32">
                <p className="font-bold text-black mb-2">Added Addresses</p>
                {/* Your RecyclerView will go here as a list */}
                <p className="text-gray-500 text-sm">No addresses added yet</p>
              </div>

              <div className="flex items-center justify-center gap-6 mt-8">
                <p className="text-xl font-bold text-black">Upload Logo</p>
                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-24 h-24 flex items-center justify-center">
                  <Upload className="w-12 h-12 text-gray-400" />
                </div>
              </div>

              <button className="w-full mt-8 bg-indigo-600 text-white font-bold py-5 rounded-xl text-lg hover:bg-indigo-700 transition">
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
}
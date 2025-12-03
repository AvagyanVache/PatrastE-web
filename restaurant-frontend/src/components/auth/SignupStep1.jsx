import { ArrowLeft } from 'lucide-react';
import AuthBackground from './AuthBackground';
export default function SignupStep1() {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <AuthBackground>
      {/* Top Bar */}
      <div className="p-8 flex items-center gap-8">
        <button className="bg-gray-800 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <h1 className="text-5xl font-bold text-black flex-1 text-center -ml-16">PatrastE</h1>
      </div>

      {/* Form Card */}
      <div className="px-4 pb-6">
        <div className="max-w-2xl mx-auto bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8">
          <h2 className="text-3xl font-bold text-black mb-2">Sign Up - Step 1 of 2</h2>
          <p className="text-gray-600 mb-6">Please fill up your information</p>

          <div className="space-y-5">
            <input type="email" placeholder="Enter your Email" className="w-full px-4 py-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600" />

            <div className="relative">
              <input type={showPass ? "text" : "password"} placeholder="Enter your Password" className="w-full px-4 py-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 pr-12" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-5">
                {showPass ? <EyeOff className="w-5 h-5 text-gray-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
              </button>
            </div>

            <div className="relative">
              <input type={showConfirm ? "text" : "password"} placeholder="Confirm your Password" className="w-full px-4 py-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 pr-12" />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-5">
                {showConfirm ? <EyeOff className="w-5 h-5 text-gray-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
              </button>
            </div>

            <button className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition text-lg">
              Continue
            </button>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
}
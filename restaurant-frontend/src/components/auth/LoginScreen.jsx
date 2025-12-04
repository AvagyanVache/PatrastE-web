// src/components/auth/LoginScreen.jsx
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { auth } from '../../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import AuthBackground from './AuthBackground';

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // AuthContext will handle redirect based on role
    } catch (error) {
      alert("Login failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      <div className="text-center pt-12">
        <h1 className="text-4xl font-bold text-black">PatrastE</h1>
      </div>

      <div className="flex-1 flex items-end pb-6 px-4">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8">
              <h2 className="text-3xl font-bold text-black mb-2">Welcome</h2>
              <p className="text-gray-600 mb-6">Please enter your login information below</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter your Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
                
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 pr-12"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2">
                    {showPassword ? <EyeOff className="w-5 h-5 text-gray-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
                  </button>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-sm text-gray-600">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="text-sm font-medium text-black hover:underline">Forgot password?</Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>

              <div className="mt-4 text-center">
                <span className="text-sm text-gray-700">
                  First Time Here? <Link to="/signup" className="font-bold text-black hover:underline">Sign up!</Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
}
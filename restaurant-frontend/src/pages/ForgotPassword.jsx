// src/pages/ForgotPassword.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth'; // 🛑 CORE LOGIC IMPORT
import { auth } from '../firebase'; // Assuming 'auth' is exported from your firebase setup
import Swal from 'sweetalert2'; // For modern alerts
import { Loader2, ArrowLeft } from 'lucide-react';
import AuthBackground from '../components/auth/AuthBackground'; // Re-use the background

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!email.trim()) {
      Swal.fire('Error', 'Please enter your email address.', 'error');
      setLoading(false);
      return;
    }

    try {
      // 1. Firebase API call to send the reset link
      await sendPasswordResetEmail(auth, email.trim());

      // 2. Success Feedback
      Swal.fire({
        title: 'Success! 📧',
        text: 'A password reset link has been sent to your registered email address.',
        icon: 'success',
        confirmButtonText: 'Continue to Login'
      });
      
      // 3. Navigate back to the login page (or main page)
      navigate('/login'); 
      
    } catch (error) {
      // 4. Handle Errors
      console.error("Password reset error:", error);
      let errorMessage = "Failed to send reset email. Please try again.";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No user found with that email address. Check the email and try again.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "The email address is not valid.";
      } else if (error.code === 'auth/missing-email') {
        errorMessage = "Please enter an email address.";
      }
      
      Swal.fire('Error', errorMessage, 'error');
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
        <div className="flex-1 flex items-center justify-center pb-6 px-4">
            <div className="w-full max-w-md mx-auto">
                <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl overflow-hidden">
                    <div className="p-8">
                        <div className="flex items-center mb-6">
                            <button 
                                onClick={() => navigate('/login')} 
                                className="text-gray-600 hover:text-black transition-colors"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <h2 className="text-3xl font-bold text-black ml-4">
                                Trouble with logging in?
                            </h2>
                        </div>
                        
                        <p className="text-gray-600 mb-6">
                            We'll send you a link to your email to change the password.
                        </p>
                        
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your Email"
                                required
                                className="w-full px-4 py-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                            />

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full mt-6 bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center`}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        Sending Reset Link...
                                    </>
                                ) : (
                                    "Reset Password"
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </AuthBackground>
  );
}
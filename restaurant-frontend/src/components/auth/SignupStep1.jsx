import { useState, useEffect } from 'react'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import AuthBackground from './AuthBackground'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../firebase' 
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  applyActionCode 
} from 'firebase/auth'

export default function SignupStep1() {
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const navigate = useNavigate()

  const validate = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      setError("Please enter a valid email")
      return false
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return false
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return false
    }
    return true
  }

  const handleContinue = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!validate()) return

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      await sendEmailVerification(user)
      setIsVerifying(true)
      alert("Verification email sent! Please verify your email.")

      const interval = setInterval(async () => {
        await user.reload()
        if (user.emailVerified) {
          clearInterval(interval)
          localStorage.setItem('signupTemp', JSON.stringify({ 
            email, 
            password, 
            uid: user.uid 
          }))
          navigate('/signup-step2')
        }
      }, 3000) 

    } catch (err) {
      setError("Sign-up failed: " + err.message)
      setIsVerifying(false)
    }
  }

  return (
    <AuthBackground>
      <div className="p-8 flex items-center gap-8">
        <button onClick={() => navigate(-1)} className="bg-gray-800 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <h1 className="text-5xl font-bold text-black flex-1 text-center -ml-16">PatrastE</h1>
      </div>

      <div className="px-4 pb-6">
        <div className="max-w-2xl mx-auto bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8">
          <h2 className="text-3xl font-bold text-black mb-2">Sign Up - Step 1 of 2</h2>
          <p className="text-gray-600 mb-6">
            {isVerifying ? "Waiting for email verification..." : "Please fill up your information"}
          </p>

          {error && <p className="text-red-500 mb-4">{error}</p>}

          <form onSubmit={handleContinue} className="space-y-5">
            <input
              type="email"
              placeholder="Enter your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isVerifying}
              required
              className="w-full px-4 py-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-600"
            />

            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                placeholder="Enter your Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isVerifying}
                required
                className="w-full px-4 py-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-600 pr-12"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-5">
                {showPass ? <EyeOff className="w-5 h-5 text-gray-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
              </button>
            </div>

            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm your Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isVerifying}
                required
                className="w-full px-4 py-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-600 pr-12"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-5">
                {showConfirm ? <EyeOff className="w-5 h-5 text-gray-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
              </button>
            </div>

            <button 
              type="submit" 
              disabled={isVerifying}
              className={`w-full font-bold py-4 rounded-xl transition text-lg ${isVerifying ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 text-white'}`}
            >
              {isVerifying ? "Verify Email..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </AuthBackground>
  )
}
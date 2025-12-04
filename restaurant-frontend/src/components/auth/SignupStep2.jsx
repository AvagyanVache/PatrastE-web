// src/components/auth/SignupStep2.jsx
import { useState } from 'react'
import { ArrowLeft, Upload, MapPin } from 'lucide-react'
import AuthBackground from './AuthBackground'
import { auth, db } from '../../firebase'
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'

export default function SignupStep2() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Form fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [category, setCategory] = useState('')
  const [apiLink, setApiLink] = useState('')
  const [address, setAddress] = useState('')

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)

    const tempData = JSON.parse(localStorage.getItem('signupTemp') || '{}')
    if (!tempData.email || !tempData.password) {
      alert("Session expired. Please start again.")
      navigate('/signup-step1')
      return
    }

    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, tempData.email, tempData.password)
      const user = userCredential.user

      // 2. Create users doc with role: "restaurant"
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: "restaurant",
        restaurantId: user.uid,  // Important: link user → FoodPlaces
        createdAt: new Date()
      })

      // 3. Create FoodPlaces document (same structure as Android)
      await setDoc(doc(db, "FoodPlaces", user.uid), {
        uid: user.uid,
        restaurantName: name,
        phone: phone,
        category: category,
        apiLink: apiLink || "",
        address: address,
        isApproved: false,        // Admin must approve
        createdAt: new Date(),
        rating: 0,
        totalRatings: 0
      })

      // 4. Send verification email
      await sendEmailVerification(user)

      localStorage.removeItem('signupTemp')
      alert("Account created! Please check your email to verify. Your restaurant is pending approval.")
      navigate('/login')
    } catch (err) {
      alert("Error: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthBackground>
      <div className="p-8 flex items-center gap-6">
        <button onClick={() => navigate('/signup-step1')} className="bg-gray-800 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <h1 className="text-5xl font-bold text-black">PatrastE</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-6 px-4">
        <div className="max-w-2xl mx-auto bg-white/95 backdrop-blur rounded-3xl shadow-2xl">
          <div className="p-8">
            <h2 className="text-3xl font-bold text-black mb-2">Sign Up - Step 2 of 2</h2>
            <p className="text-gray-700 mb-6">Complete your restaurant profile</p>

            <form onSubmit={handleSignup} className="space-y-5">
              <input placeholder="Restaurant Name" required onChange={(e) => setName(e.target.value)} className="w-full px-4 py-4 rounded-xl border border-gray-300" />
              <input placeholder="Enter Contact Phone" required onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-4 rounded-xl border border-gray-300" />
              
              <select required onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-4 rounded-xl border border-gray-300 bg-white">
                <option value="">Select Category</option>
                <option>Restaurant</option>
                <option>Cafe</option>
                <option>Fast Food</option>
              </select>

              <input placeholder="API Link (Optional)" onChange={(e) => setApiLink(e.target.value)} className="w-full px-4 py-4 rounded-xl border border-gray-300" />
              <input placeholder="Enter Restaurant Address" required onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-4 rounded-xl border border-gray-300" />

              <button type="submit" disabled={loading} className="w-full mt-8 bg-indigo-600 text-white font-bold py-5 rounded-xl text-lg hover:bg-indigo-700 transition disabled:opacity-50">
                {loading ? "Creating Account..." : "Sign Up"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AuthBackground>
  )
}
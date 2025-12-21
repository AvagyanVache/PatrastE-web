// src/components/RestaurantPending.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'

export default function RestaurantPending() {
  const [status, setStatus] = useState('pending') // 'pending', 'approved', 'rejected'
  const [restaurantData, setRestaurantData] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  // Get restaurantId from navigation state or localStorage
  const restaurantId = location.state?.restaurantId || 
    JSON.parse(localStorage.getItem('pendingRestaurant') || '{}').restaurantId

  useEffect(() => {
    if (!restaurantId) {
      console.error('No restaurant ID found')
      navigate('/signup-step1')
      return
    }

    console.log('Setting up listener for restaurant:', restaurantId)

    // Setup real-time listener (matches Android setupApprovalListener)
    const restaurantRef = doc(db, "FoodPlaces", restaurantId)
    
    const unsubscribe = onSnapshot(
      restaurantRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data()
          setRestaurantData(data)
          
          console.log('Restaurant data:', data)
          console.log('isApproved status:', data.isApproved)
          
          const isApproved = data.isApproved
          
          if (isApproved === true) {
            console.log('Restaurant approved! Redirecting...')
            setStatus('approved')
            
            // Wait 2 seconds to show success message, then navigate
            setTimeout(() => {
              localStorage.removeItem('pendingRestaurant')
              
              navigate('/restaurant-dashboard', { 
                state: { 
                  restaurantId: restaurantId,
                  userRole: 'restaurant'
                },
                replace: true
              })
            }, 2000)
          } else if (isApproved === false) {
            setStatus('pending')
          } else if (data.rejectionReason) {
            setStatus('rejected')
          }
        } else {
          console.error('Restaurant document not found')
          setStatus('error')
        }
      },
      (error) => {
        console.error('Error listening to restaurant approval:', error)
        setStatus('error')
      }
    )

    // Cleanup listener on unmount
    return () => {
      console.log('Cleaning up listener')
      unsubscribe()
    }
  }, [restaurantId, navigate])

  const handleLogout = () => {
    auth.signOut()
    localStorage.removeItem('pendingRestaurant')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-600 to-orange-400 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8">
        
        {/* Pending Status */}
        {status === 'pending' && (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <Clock className="w-24 h-24 text-orange-600 animate-pulse" />
                <div className="absolute inset-0 animate-ping">
                  <Clock className="w-24 h-24 text-orange-300 opacity-75" />
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-3xl font-bold text-black mb-2">
                Approval Pending
              </h2>
              <p className="text-gray-600">
                Your restaurant "{restaurantData?.name || restaurantId}" is waiting for admin approval
              </p>
            </div>

            <div className="bg-orange-50 border-l-4 border-orange-600 p-4 rounded-lg text-left">
              <p className="text-sm text-gray-700">
                <strong>What's next?</strong>
              </p>
              <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Admin will review your restaurant details</li>
                <li>You'll be notified once approved</li>
                <li>This page will automatically redirect when approved</li>
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleLogout}
                className="w-full bg-gray-600 text-white font-bold py-3 rounded-xl hover:bg-gray-700 transition"
              >
                Logout
              </button>
              <p className="text-xs text-gray-500">
                You can close this page and come back later. Your approval status is being monitored.
              </p>
            </div>
          </div>
        )}

        {/* Approved Status */}
        {status === 'approved' && (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle className="w-24 h-24 text-green-600 animate-bounce" />
            </div>
            
            <div>
              <h2 className="text-3xl font-bold text-green-600 mb-2">
                Approved! 🎉
              </h2>
              <p className="text-gray-600">
                Your restaurant has been approved. Redirecting to dashboard...
              </p>
            </div>

            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          </div>
        )}

        {/* Rejected Status */}
        {status === 'rejected' && (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <AlertCircle className="w-24 h-24 text-red-600" />
            </div>
            
            <div>
              <h2 className="text-3xl font-bold text-red-600 mb-2">
                Application Rejected
              </h2>
              <p className="text-gray-600">
                Unfortunately, your restaurant application was not approved.
              </p>
              {restaurantData?.rejectionReason && (
                <p className="text-sm text-gray-500 mt-2">
                  Reason: {restaurantData.rejectionReason}
                </p>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="w-full bg-gray-600 text-white font-bold py-3 rounded-xl hover:bg-gray-700 transition"
            >
              Back to Login
            </button>
          </div>
        )}

        {/* Error Status */}
        {status === 'error' && (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <AlertCircle className="w-24 h-24 text-gray-600" />
            </div>
            
            <div>
              <h2 className="text-3xl font-bold text-black mb-2">
                Something went wrong
              </h2>
              <p className="text-gray-600">
                Unable to check approval status. Please contact support.
              </p>
            </div>

            <button
              onClick={() => navigate('/signup-step1')}
              className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl hover:bg-orange-700 transition"
            >
              Start Over
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
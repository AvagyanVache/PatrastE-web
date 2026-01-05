import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { CheckCircle, Clock, AlertCircle , RefreshCw} from 'lucide-react'

export default function RestaurantPending() {
  const [status, setStatus] = useState('pending') 
  const [restaurantData, setRestaurantData] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  const restaurantId = location.state?.restaurantId || 
    JSON.parse(localStorage.getItem('pendingRestaurant') || '{}').restaurantId

  useEffect(() => {
    if (!restaurantId) {
      console.error('No restaurant ID found')
      navigate('/signup-step1')
      return
    }

    console.log('Setting up listener for restaurant:', restaurantId)
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
<div className="bg-orange-50 border border-orange-200 p-5 rounded-2xl text-left relative overflow-hidden">
      <div className="absolute top-0 right-0 p-2 opacity-10">
        <RefreshCw size={40} className="rotate-12" />
      </div>
      
      <p className="text-sm font-bold text-orange-800 flex items-center gap-2">
        <RefreshCw size={16} className="animate-spin-slow" /> 
        Taking longer than expected?
      </p>
      <p className="mt-2 text-sm text-orange-700 leading-relaxed">
        Our admins are usually fast, but sometimes the connection needs a little nudge. If you've been waiting for a while, try refreshing the page to sync the latest status.
      </p>
      
      <button 
        onClick={() => window.location.reload()}
        className="mt-3 text-sm font-extrabold text-orange-600 hover:text-orange-800 underline transition-all"
      >
        Refresh now
      </button>
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
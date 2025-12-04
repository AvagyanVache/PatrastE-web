// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginScreen from './components/auth/LoginScreen'
import SignupStep1 from './components/auth/SignupStep1'
import SignupStep2 from './components/auth/SignupStep2'
import MenuManagementPage from './pages/MenuManagementPage'
import { useAuth } from './context/AuthContext'
import { auth } from './firebase'
import { signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import NavBar from './components/NavBar' 
import OrderManagementPage from './pages/OrderManagementPage'
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) return <div className="flex items-center justify-center h-screen text-3xl bg-gray-100">Loading...</div>
  if (!user) return <Navigate to="/login" replace />

  // --- 🛠️ UPDATED CHECK ---
  const isRestaurant = user.role === "restaurant";
  
  // Check the boolean 'isApproved' field which is now on the user object
  // Note: Firestore booleans are fetched as true/false, not strings like "approved"
  const isApproved = user.isApproved === true; 

  if (isRestaurant && !isApproved && window.location.pathname !== "/restaurant-pending") {
    // Redirect if they are a restaurant AND NOT approved
    return <Navigate to="/restaurant-pending" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />

  return children
}

function RestaurantPending() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-600 to-white-600 flex items-center justify-center text-white text-4xl text-center p-8">
      Your restaurant is pending admin approval.<br/>We'll notify you soon!
    </div>
  )
}

function Home() {
  return <div className="p-10 text-3xl">Customer Home Page</div>
}

// Debug + Logout Bar (will show on every page when logged in)
function AuthDebugBar() {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-black/90 text-white p-4 z-50 shadow-2xl">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div>
          <span className="font-bold">Logged in as:</span> {user.email || user.uid}
          {' | '}
          <span className="text-yellow-400 font-bold">Role: {user.role || 'unknown'}</span>
          {user.restaurantId && <span className="text-green-400"> | restaurantId: {user.restaurantId}</span>}
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-bold transition"
        >
          LOGOUT
        </button>
      </div>
    </div>
  )
}
function RestaurantLayout({ children }) {
    return (
        <>
            <NavBar />
            <div className="pt-16">
                {children}
            </div>
        </>
    );
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-orange-600 to-white-600 text-white text-4xl">
        Loading App...
      </div>
    )
  }

  return (
    <>
      {/* NOTE: AuthDebugBar is fixed at the top (z-50) and has a p-4 padding.
        The RestaurantLayout adds pt-16 (4rem) to push content down.
        The DebugBar itself adds a small visual overlap because it is 4rem tall.
        For a clean look, we'll keep the DebugBar but remember it sits *above* all content.
      */}
      <AuthDebugBar />

      <Routes>
        <Route path="/login" element={!user ? <LoginScreen /> : <Navigate to="/" replace />} />
        <Route path="/signup" element={<SignupStep1 />} />
        <Route path="/signup-step2" element={<SignupStep2 />} />

        {/* --- Restaurant Protected Routes --- */}
        <Route
          path="/restaurant-dashboard"
          element={
            <ProtectedRoute allowedRoles={["restaurant"]}>
              <RestaurantLayout>
                <MenuManagementPage />
              </RestaurantLayout>
            </ProtectedRoute>
          }
        />

        {/* NEW ROUTE: Order Management */}
        <Route
          path="/orders"
          element={
            <ProtectedRoute allowedRoles={["restaurant"]}>
              <RestaurantLayout>
                <OrderManagementPage /> 
              </RestaurantLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/restaurant-pending"
          element={
            <ProtectedRoute allowedRoles={["restaurant"]}>
              <RestaurantPending />
            </ProtectedRoute>
          }
        />

        {/* Smart root redirect */}
        <Route path="/" element={
          user?.role === "restaurant"
            ? <Navigate to="/restaurant-dashboard" replace />
            : user?.role === "user"
              ? <Home />
              : <Navigate to="/login" replace />
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
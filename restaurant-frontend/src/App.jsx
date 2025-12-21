import { Routes, Route, Navigate } from 'react-router-dom'
import LoginScreen from './components/auth/LoginScreen'
import SignupStep1 from './components/auth/SignupStep1'
import SignupStep2 from './components/auth/SignupStep2'
import MenuManagementPage from './pages/MenuManagementPage'
import ProfilePage from './pages/ProfilePage' 
import { useAuth } from './context/AuthContext'
import { auth } from './firebase'
import ForgotPassword from './pages/ForgotPassword';
import { signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import NavBar from './components/NavBar' 
import OrderManagementPage from './pages/OrderManagementPage'
import RestaurantPending from './components/RestaurantPending'

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


function Home() {
  return <div className="p-10 text-3xl">Customer Home Page</div>
}

// REMOVED: AuthDebugBar is no longer needed, so the component definition is removed.
// function AuthDebugBar() { /* ... content removed ... */ }

function RestaurantLayout({ children }) {
    return (
        <>
            <NavBar />
            {/* Since the AuthDebugBar is gone, the content no longer needs pt-16,
              but we'll keep a small padding to ensure content doesn't hug the top. */}
            <div className="pt-10"> 
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
      {/* REMOVED the <AuthDebugBar /> component call here, 
        which was causing the fixed container at the top. */}

      <Routes>
        <Route path="/login" element={!user ? <LoginScreen /> : <Navigate to="/" replace />} />
        <Route path="/signup" element={<SignupStep1 />} />
        <Route path="/signup-step2" element={<SignupStep2 />} />
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/restaurant-pending" element={<RestaurantPending />} />

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
<Route
  path="/profile" // This path is used in NavBar
  element={
    <ProtectedRoute allowedRoles={["restaurant"]}>
      <RestaurantLayout>
        <ProfilePage /> {/* Renders the profile content */}
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
// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          
          if (userDoc.exists()) {
            // Start with base user data
            let userData = { uid: firebaseUser.uid, ...userDoc.data() };

            // 1. FETCH AND MERGE: Get restaurant approval status
            if (userData.role === "restaurant" && userData.restaurantId) {
              
              // Use the restaurantId from the user document, fallback to uid if necessary
              const restaurantIdToUse = userData.restaurantId || firebaseUser.uid; 
              const foodPlaceDoc = await getDoc(doc(db, "FoodPlaces", restaurantIdToUse));
              
              // CRITICAL: Attach isApproved status to the user object
              if (foodPlaceDoc.exists()) {
                // Ensure the status is attached, defaulting to false if the field is missing
                userData.isApproved = foodPlaceDoc.data().isApproved === true;
              } else {
                // If the FoodPlace document doesn't exist, they are definitely not approved
                userData.isApproved = false;
              }
            }

            // 2. SET STATE: Update the global user state with the merged data
            // This makes `user.isApproved` available in ProtectedRoute
            setUser(userData); 

            // 3. REDIRECTION LOGIC: Only execute when coming from login/signup
            const path = window.location.pathname;
            if (path.includes('/login') || path.includes('/signup')) {
              if (userData.role === "restaurant") {
                // Now check the 'isApproved' status attached to the userData object
                if (userData.isApproved) {
                  navigate("/restaurant-dashboard", { replace: true });
                } else {
                  navigate("/restaurant-pending", { replace: true });
                }
              } else if (userData.role === "user") {
                navigate("/", { replace: true });
              }
            }

          } else {
            setUser(null);
          }
        } catch (err) {
          console.error("Auth error:", err);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
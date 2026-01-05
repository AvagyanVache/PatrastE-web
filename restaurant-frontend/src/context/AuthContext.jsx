import { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from '../firebase'
import { onAuthStateChanged,signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

const logout = async () => {
    try {
      await signOut(auth);
      navigate("/", { replace: true }); 
      console.log("User signed out and redirected.");
    } catch (error) {
      console.error("Error during sign out:", error);
      throw error;
    }
  };
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          
          if (userDoc.exists()) {
            let userData = { uid: firebaseUser.uid, ...userDoc.data() };

            if (userData.role === "restaurant" && userData.restaurantId) {
              
              const restaurantIdToUse = userData.restaurantId || firebaseUser.uid; 
              const foodPlaceDoc = await getDoc(doc(db, "FoodPlaces", restaurantIdToUse));
              
              if (foodPlaceDoc.exists()) {
                userData.isApproved = foodPlaceDoc.data().isApproved === true;
              } else {
                userData.isApproved = false;
              }
            }

            setUser(userData); 

            const path = window.location.pathname;
            if (path.includes('/login') || path.includes('/signup')) {
              if (userData.role === "restaurant") {
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
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
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
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
          if (userDoc.exists()) {
            const userData = { uid: firebaseUser.uid, ...userDoc.data() }
            setUser(userData)

            // ONLY redirect when coming from login/signup
            const path = window.location.pathname
            if (path.includes('/login') || path.includes('/signup')) {
              if (userData.role === "restaurant") {
                const foodPlaceDoc = await getDoc(doc(db, "FoodPlaces", userData.restaurantId || firebaseUser.uid))
                if (foodPlaceDoc.exists() && foodPlaceDoc.data()?.isApproved) {
                  navigate("/restaurant-dashboard", { replace: true })
                } else {
                  navigate("/restaurant-pending", { replace: true })
                }
              } else if (userData.role === "user") {
                navigate("/", { replace: true })
              }
            }
          } else {
            setUser(null)
          }
        } catch (err) {
          console.error("Auth error:", err)
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [navigate])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
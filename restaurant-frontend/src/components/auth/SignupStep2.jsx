// src/components/auth/SignupStep2.jsx
import { useState } from 'react'
import { ArrowLeft, Upload, MapPin, X } from 'lucide-react'
import AuthBackground from './AuthBackground'
import { auth, db, storage } from '../../firebase'
import { doc, setDoc, getDoc, collection, addDoc, query, limit, getDocs } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useNavigate } from 'react-router-dom'
import { onSnapshot } from "firebase/firestore"
import { useEffect } from "react"
export default function SignupStep2() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Form fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [category, setCategory] = useState('Restaurant/Cafe')
  const [apiLink, setApiLink] = useState('')
  const [addressInput, setAddressInput] = useState('')
  const [addresses, setAddresses] = useState([])
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)

  const categories = [
    'Restaurant/Cafe',
    'Fast Food',
    'Coffee Shop',
    'Bakery',
    'Bar & Grill',
    'Other'
  ]

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const addAddress = async () => {
    if (!addressInput.trim()) {
      alert('Please enter an address')
      return
    }

    // Simple geocoding using Nominatim (free alternative to Google Geocoding)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressInput)}`
      )
      const data = await response.json()
      
      if (data && data.length > 0) {
        const location = data[0]
        setAddresses([...addresses, {
          address: addressInput,
          latitude: parseFloat(location.lat),
          longitude: parseFloat(location.lon)
        }])
        setAddressInput('')
      } else {
        alert('Could not find coordinates for this address')
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      alert('Error geocoding address')
    }
  }

  const removeAddress = (index) => {
    setAddresses(addresses.filter((_, i) => i !== index))
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!name.trim()) {
      alert('Restaurant name is required')
      return
    }
    if (addresses.length === 0) {
      alert('At least one restaurant address is required')
      return
    }
    if (!phone.trim()) {
      alert('Contact phone number is required')
      return
    }
    if (apiLink && !apiLink.match(/^https?:\/\/.+/)) {
      alert('Please enter a valid API URL')
      return
    }

    setLoading(true)

    // Get the current authenticated user (created in Step 1)
    const user = auth.currentUser
    
    if (!user) {
      alert("Session expired. Please start again.")
      navigate('/signup-step1')
      setLoading(false)
      return
    }

    try {
      // 1. Check if restaurant name was previously deleted
      const deletedDoc = await getDoc(doc(db, "System", "DeletedRestaurants"))
      if (deletedDoc.exists()) {
        const deletedNames = deletedDoc.data().deletedRestaurantNames || []
        if (deletedNames.includes(name)) {
          alert('This restaurant was previously deleted. Please use a different name.')
          setLoading(false)
          return
        }
      }

      // 2. Check if restaurant name already exists
      const existingRestaurant = await getDoc(doc(db, "FoodPlaces", name))
      if (existingRestaurant.exists()) {
        alert('A restaurant with this name already exists.')
        setLoading(false)
        return
      }

      // 3. Upload logo if provided
      let logoUrl = null
      try {
        if (logoFile) {
          const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_')
          const logoRef = ref(storage, `restaurant_logos/${sanitizedName}_logo.jpg`)
          await uploadBytes(logoRef, logoFile)
          logoUrl = await getDownloadURL(logoRef)
        }

        // 4. Create users document (matches Android structure)
        await setDoc(doc(db, "users", user.uid), {
          name: name,
          email: user.email,
          role: "restaurant",
          restaurantId: name,  // Important: link user → FoodPlaces using restaurant name
          phoneNumber: phone,
          profilePictureUrl: logoUrl || "",
          createdAt: new Date()
        })

        // 5. Create FoodPlaces document using restaurant name as ID (matches Android)
        const restaurantData = {
          name: name,
          email: user.email,
          uid: user.uid,
          role: "restaurant",
          category: category,
          contactPhone: phone,
          isApproved: false,
          createdAt: new Date()
        }

        if (apiLink) {
          restaurantData.apiLink = apiLink
        }
        if (logoUrl) {
          restaurantData.logoUrl = logoUrl
        }

        await setDoc(doc(db, "FoodPlaces", name), restaurantData)

        // 6. Add addresses as subcollection (matches Android structure)
        for (const address of addresses) {
          await addDoc(collection(db, "FoodPlaces", name, "Addresses"), {
            address: address.address,
            latitude: address.latitude,
            longitude: address.longitude,
            isAvailable: true
          })
        }

        // 7. Setup approval listener (simplified - you'd implement full logic in a separate component)
        localStorage.setItem('pendingRestaurant', JSON.stringify({
          restaurantId: name,
          uid: user.uid
        }))
setupApprovalListener(name, apiLink)

        localStorage.removeItem('signupTemp')
        alert("Restaurant profile created! Your restaurant is pending approval.")
        
        // Navigate to pending approval page
        navigate('/restaurant-pending', { state: { restaurantId: name } })
        
      } catch (firestoreError) {
        // If anything fails, we could optionally delete the auth user here
        // but since verification already happened, it's better to just show error
        console.error('Firestore/Storage error:', firestoreError)
        alert("Error creating restaurant profile: " + firestoreError.message)
        setLoading(false)
        return
      }
      
    } catch (err) {
      console.error('Signup error:', err)
      alert("Error: " + err.message)
    } finally {
      setLoading(false)
    }
  }
const fetchMenuFromApiAndSave = async (restaurantName, apiLink) => {
  try {
    // Check if menu already exists
    const menuItemsRef = collection(db, "FoodPlaces", restaurantName, "Menu", "DefaultMenu", "Items")
    const existingItemsSnapshot = await getDocs(query(menuItemsRef, limit(1)))
    
    if (!existingItemsSnapshot.empty) {
      console.log("Menu already exists in Firestore, skipping API fetch")
      return
    }

    // Fetch menu from API
    console.log("Fetching menu from:", apiLink)
    const response = await fetch(apiLink)
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Handle JSONBin.io response structure (data is wrapped in 'record' object)
    let menuItems = data
    if (data.record) {
      menuItems = data.record
    }
    
    console.log("API Response:", menuItems)

    if (!Array.isArray(menuItems) || menuItems.length === 0) {
      console.log("No menu items in API response")
      return
    }

    console.log(`Processing ${menuItems.length} menu items...`)

    // Process each menu item
    const uploadPromises = menuItems.map(async (item) => {
      let itemName = item.name?.trim() || `Item_${Math.random().toString(36).substr(2, 9)}`
      const sanitizedItemName = itemName.replace(/[^a-zA-Z0-9]/g, '_')

      const itemData = {
        "Item Name": itemName,
        "Item Price": String(item.price || 0),
        "Prep Time": item.prepTime || 10,
        "Item Description": item.description || "No description available",
        "Available": true,
        "Item Img": ""
      }

      // Upload image if URL is valid
      if (item.image && item.image.startsWith('http')) {
        try {
          console.log(`Uploading image for ${itemName}...`)
          const imageResponse = await fetch(item.image)
          const imageBlob = await imageResponse.blob()
          
          const imageId = Math.random().toString(36).substr(2, 9)
          const imageRef = ref(storage, `menu_images/${restaurantName}/${imageId}.jpg`)
          await uploadBytes(imageRef, imageBlob)
          itemData["Item Img"] = await getDownloadURL(imageRef)
          console.log(`Image uploaded for ${itemName}`)
        } catch (imgError) {
          console.error(`Failed to upload image for ${itemName}:`, imgError)
        }
      }

      // Save to Firestore
      const itemRef = doc(db, "FoodPlaces", restaurantName, "Menu", "DefaultMenu", "Items", sanitizedItemName)
      await setDoc(itemRef, itemData)
      console.log(`Saved menu item: ${itemName}`)
      
      return itemData
    })

    await Promise.all(uploadPromises)
    console.log("All menu items saved successfully")
    
  } catch (error) {
    console.error("Error fetching/saving menu:", error)
    console.error("Error details:", error.message)
    throw error
  }
}
const setupApprovalListener = (restaurantName, apiLink) => {
  const restaurantRef = doc(db, "FoodPlaces", restaurantName)
  
  const unsubscribe = onSnapshot(restaurantRef, async (snapshot) => {
    if (snapshot.exists()) {
      const isApproved = snapshot.data().isApproved
      
      if (isApproved) {
        console.log(`Restaurant ${restaurantName} approved`)
        unsubscribe() // Stop listening
        
        if (apiLink && apiLink.trim()) {
          try {
            await fetchMenuFromApiAndSave(restaurantName, apiLink)
            alert(`Menu loaded for ${restaurantName}`)
            navigate('/dashboard', { 
              state: { 
                userRole: 'restaurant', 
                restaurantId: restaurantName 
              } 
            })
          } catch (error) {
            alert("Restaurant approved but menu loading failed")
            navigate('/dashboard', { 
              state: { 
                userRole: 'restaurant', 
                restaurantId: restaurantName 
              } 
            })
          }
        } else {
          alert(`Restaurant approved: ${restaurantName}`)
          navigate('/dashboard', { 
            state: { 
              userRole: 'restaurant', 
              restaurantId: restaurantName 
            } 
          })
        }
      }
    }
  })
}
  return (
    <AuthBackground>
      <div className="p-8 flex items-center gap-6">
        <button 
          onClick={() => navigate('/signup-step1')} 
          className="bg-gray-800 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-gray-700 transition"
        >
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
              {/* Restaurant Name */}
              <input 
                placeholder="Restaurant Name" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)} 
                className="w-full px-4 py-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
              />

              {/* Contact Phone */}
              <input 
                placeholder="Enter Contact Phone" 
                required 
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)} 
                className="w-full px-4 py-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
              />
              
              {/* Category Dropdown */}
              <select 
                required 
                value={category}
                onChange={(e) => setCategory(e.target.value)} 
                className="w-full px-4 py-4 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Logo Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-orange-500 transition">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                  id="logo-upload"
                />
                <label htmlFor="logo-upload" className="cursor-pointer">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="w-24 h-24 mx-auto rounded-lg object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-12 h-12 text-gray-400" />
                      <span className="text-gray-600">Upload Restaurant Logo (Optional)</span>
                    </div>
                  )}
                </label>
              </div>

              {/* API Link */}
              <input 
                placeholder="API Link (Optional)" 
                value={apiLink}
                onChange={(e) => setApiLink(e.target.value)} 
                className="w-full px-4 py-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
              />

              {/* Address Input */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input 
                    placeholder="Enter Restaurant Address" 
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)} 
                    className="flex-1 px-4 py-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                  />
                  <button 
                    type="button"
                    onClick={addAddress}
                    className="px-6 py-4 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition flex items-center gap-2"
                  >
                    <MapPin className="w-5 h-5" />
                    Add
                  </button>
                </div>

                {/* Address List */}
                {addresses.length > 0 && (
                  <div className="space-y-2 bg-gray-50 p-4 rounded-xl">
                    <p className="font-semibold text-sm text-gray-700">Added Addresses:</p>
                    {addresses.map((addr, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{addr.address}</p>
                          <p className="text-xs text-gray-500">Lat: {addr.latitude.toFixed(6)}, Lng: {addr.longitude.toFixed(6)}</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeAddress(index)}
                          className="text-red-500 hover:text-red-700 transition"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full mt-8 bg-orange-600 text-white font-bold py-5 rounded-xl text-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating Account..." : "Complete Sign Up"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AuthBackground>
  )
}
// src/pages/MenuManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Upload, Clock, FileText, ToggleLeft, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import MenuFormModal from '../components/MenuFormModal';

export default function MenuManagementPage() {
  const { user } = useAuth();
  const [restaurantId, setRestaurantId] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});

  // Function to get restaurant ID by owner
  async function getRestaurantIdByOwner(uid) {
    console.log("🔍 Searching for restaurant with uid:", uid);
    
    try {
      const q = query(
        collection(db, "FoodPlaces"),
        where("uid", "==", uid)
      );

      const snapshot = await getDocs(q);
      console.log("📊 Query results - found documents:", snapshot.size);

      if (snapshot.empty) {
        console.error("❌ No restaurant found for this user");
        
        // DEBUG: Let's see ALL restaurants to help diagnose
        const allRestaurants = await getDocs(collection(db, "FoodPlaces"));
        console.log("🏪 All restaurants in database:", allRestaurants.size);
        allRestaurants.forEach(doc => {
          console.log("  - Restaurant:", doc.id, "uid:", doc.data().uid);
        });
        
        return null;
      }

      const restaurantDoc = snapshot.docs[0];
      console.log("✅ Restaurant found:", restaurantDoc.id);
      console.log("📄 Restaurant data:", restaurantDoc.data());
      
      return restaurantDoc.id;
    } catch (error) {
      console.error("💥 Error in getRestaurantIdByOwner:", error);
      throw error;
    }
  }

  // Load restaurant ID when user is available
  useEffect(() => {
    console.log("👤 User state changed:", user ? user.uid : "No user");
    
    if (!user) {
      console.log("⏹️ No user, stopping loading");
      setIsLoading(false);
      setDebugInfo({ error: "No user logged in" });
      return;
    }

    setDebugInfo({ uid: user.uid, email: user.email });

    getRestaurantIdByOwner(user.uid)
      .then(id => {
        console.log("✅ Restaurant ID retrieved:", id);
        setRestaurantId(id);
        setDebugInfo(prev => ({ ...prev, restaurantId: id }));
      })
      .catch(err => {
        console.error("💥 Error getting restaurant ID:", err);
        setIsLoading(false);
        setDebugInfo(prev => ({ ...prev, error: err.message }));
      });
  }, [user]);

  // Load menu items function
  const loadMenuItems = async () => {
    if (!restaurantId) {
      console.error("⏹️ Cannot load menu: restaurantId is null");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const path = `FoodPlaces/${restaurantId}/Menu/DefaultMenu/Items`;
    console.log("📂 Loading menu from path:", path);

    try {
      const itemsRef = collection(db, path);
      const snapshot = await getDocs(itemsRef);

      console.log("📊 Menu items found:", snapshot.size);

      let items = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        console.log("🍔 Item:", docSnap.id, data);
        items.push({ id: docSnap.id, ...data });
      });

      console.log("✅ Setting menu items:", items.length);
      setMenuItems(items);
      setDebugInfo(prev => ({ ...prev, itemCount: items.length }));
    } catch (err) {
      console.error("💥 Failed to load menu:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      alert("Failed to load menu: " + err.message);
      setDebugInfo(prev => ({ ...prev, loadError: err.message }));
    }

    setIsLoading(false);
  };

  // Load menu items when restaurant ID changes
  useEffect(() => {
    console.log("🔄 Restaurant ID changed:", restaurantId);
    if (!restaurantId) {
      console.log("⏹️ No restaurant ID, skipping menu load");
      return;
    }
    loadMenuItems();
  }, [restaurantId]);

  const handleDelete = async (id, imgUrl) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      if (imgUrl) {
        await deleteObject(ref(storage, imgUrl)).catch(() => {});
      }
      await deleteDoc(doc(db, `FoodPlaces/${restaurantId}/Menu/DefaultMenu/Items`, id));
      loadMenuItems();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-600 to-white-600 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-4xl font-bold animate-pulse mb-4">
            Loading Menu...
          </div>
          <div className="text-white text-sm bg-black/30 p-4 rounded-lg max-w-md">
            <pre className="text-left text-xs overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // Show error if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-600 to-white-600 flex items-center justify-center">
        <div className="text-white text-4xl font-bold">
          Please log in to manage your menu
        </div>
      </div>
    );
  }

  // Show error if no restaurant ID found
  if (!restaurantId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-white text-4xl font-bold mb-6">
            No restaurant found for your account
          </div>
          <div className="text-white text-lg mb-4">
            User ID: {user.uid}
          </div>
          <div className="text-white text-sm bg-black/30 p-4 rounded-lg max-w-2xl">
            <div className="mb-2">Debug Info:</div>
            <pre className="text-left text-xs overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
          <div className="text-white text-base mt-6">
            Make sure your FoodPlaces document has a "uid" field matching: {user.uid}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-600 to-white-600 relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'url(/background4.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      <div className="relative z-10 p-6 pb-24">
        {/* Header */}
        <div className="text-center mb-8 mt-12">
          <h1 className="text-5xl font-bold text-white drop-shadow-lg">Menu Management</h1>
          <p className="text-white text-xl mt-2">Restaurant: {restaurantId}</p>
          <button 
            onClick={() => console.log("Debug:", debugInfo)}
            className="text-white text-sm underline mt-2"
          >
            Show Debug Info
          </button>
        </div>

        {/* Add Button */}
        <button
          onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
          className="w-full bg-white text-orange-600 font-bold text-xl py-5 rounded-2xl shadow-2xl hover:bg-gray-100 transition mb-8 flex items-center justify-center gap-3"
        >
          <Plus size={32} />
          Add New Item
        </button>

        {/* Menu Items Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {menuItems.map((item) => (
            <div key={item.id} className="group bg-white/95 backdrop-blur rounded-xl shadow-xl overflow-hidden flex flex-col transition-shadow duration-300 hover:shadow-2xl">
              
              {String(item["Item Img"] || '') ? (
                <img src={String(item["Item Img"])} alt={String(item["Item Name"] || 'Menu Item')} className="w-full h-32 object-cover" />
              ) : (
                <div className="bg-gray-200 border-2 border-dashed rounded-t-xl w-full h-32 flex items-center justify-center">
                  <Upload className="w-10 h-10 text-gray-400" />
                </div>
              )}

              <div className="p-4 flex flex-col flex-grow">
                {/* 2. Title and Compact Details */}
                <h3 className="text-xl font-bold text-gray-800 mb-2">{String(item["Item Name"] || 'Untitled Item')}</h3>
                
                {/* Price, Time, and Status on a single line for compactness */}
                <div className="flex justify-between items-center text-sm text-gray-600 border-b pb-2 mb-2">
                  
                  {/* Price */}
                  <p className="font-semibold text-orange-600">
                    ֏{String(item["Item Price"] || '0.00')}
                  </p>
                  
                  {/* Prep Time */}
                  <p className="flex items-center gap-1">
                    <Clock size={16} className="text-black-500" /> {String(item["Prep Time"] || '0')} min
                  </p>
                  
                  {/* Status - Use color and icon for quick visibility */}
                  <p className={`flex items-center gap-1 font-medium ${item.Available ? 'text-green-600' : 'text-red-600'}`}>
                    <ToggleLeft size={16} /> {item.Available ? "Available" : "Unavailable"}
                  </p>
                </div>

                {/* Description (Conditional) */}
                {item["Item Description"] && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                    {String(item["Item Description"])}
                  </p>
                )}
              
                {/* 3. Action Buttons (Hidden by Default) */}
                <div className="mt-auto pt-2 flex justify-end gap-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300">
                  <button
                    onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                    className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition shadow-lg"
                    title="Edit Item"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item["Item Img"])}
                    className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-lg"
                    title="Delete Item"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {menuItems.length === 0 && (
          <div className="text-center mt-32">
            <div className="bg-yellow-500 text-white text-5xl font-bold p-16 rounded-3xl inline-block shadow-2xl">
              NO MENU ITEMS<br/>
              <span className="text-2xl">Click "Add New Item" to get started</span>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <MenuFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={editingItem}
        restaurantId={restaurantId}
        onSuccess={loadMenuItems}
      />
    </div>
  );
}
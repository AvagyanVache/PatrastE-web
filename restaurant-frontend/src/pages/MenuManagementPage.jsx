// src/pages/MenuManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase'; // Import your Firebase setup
// Import Firebase functions for web
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch, query } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { MenuFormModal } from '../components/MenuFormModal'; // We'll create this next
import { MenuItem } from '../components/MenuItem'; // We'll create this next

const RESTAURANT_ID = "Your_Restaurant_ID_Here"; // Get this from props or context

function MenuManagementPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null); // For handling the update logic

  // Maps to loadMenuItems() in Android
  const loadMenuItems = async () => {
    setIsLoading(true);
    const menuCollectionRef = collection(db, `FoodPlaces/${RESTAURANT_ID}/Menu/DefaultMenu/Items`);
    try {
      const q = query(menuCollectionRef);
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({
        // Mapping Android's MenuDomain fields to JS object
        documentId: doc.id,
        itemName: doc.data()["Item Name"],
        itemPrice: doc.data()["Item Price"],
        prepTime: doc.data()["Prep Time"],
        itemDescription: doc.data()["Item Description"],
        itemImg: doc.data()["Item Img"] || "",
        isAvailable: doc.data()["Available"] ?? true,
      }));
      setMenuItems(items);
    } catch (error) {
      console.error("Failed to load menu: ", error);
      alert("Failed to load menu: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMenuItems();
  }, []);

  // --- CRUD Operations (Simplified) ---

  const handleOpenAddModal = () => {
    setItemToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditItem = (item) => {
    setItemToEdit(item);
    setIsModalOpen(true);
  };

  const handleDeleteItem = async (documentId, itemImg) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      // 1. Delete Image from Storage (Similar to your Android logic)
      if (itemImg) {
        const imageRef = ref(storage, itemImg);
        await deleteObject(imageRef).catch(err => {
          console.warn("Could not delete image, continuing with item deletion:", err);
          // Don't fail the entire operation if image deletion fails (it might not exist)
        });
      }

      // 2. Delete Document from Firestore
      const itemDocRef = doc(db, `FoodPlaces/${RESTAURANT_ID}/Menu/DefaultMenu/Items`, documentId);
      await deleteDoc(itemDocRef);

      alert("Item deleted successfully!");
      loadMenuItems(); // Reload the list
    } catch (error) {
      console.error("Failed to delete item:", error);
      alert("Failed to delete item: " + error.message);
    }
  };

  if (isLoading) {
    return <div>Loading Menu...</div>;
  }

  return (
    <div className="menu-management-page">
      <h2>Menu Management</h2>
      <button onClick={handleOpenAddModal} className="add-item-btn">
        Add New Item
      </button>

      {/* This section replaces the RecyclerView */}
      <div className="menu-list">
        {menuItems.map(item => (
          <MenuItem
            key={item.documentId}
            item={item}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
          />
        ))}
      </div>

      <MenuFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        itemToEdit={itemToEdit}
        restaurantId={RESTAURANT_ID}
        onSaveSuccess={loadMenuItems}
      />
    </div>
  );
}

export default MenuManagementPage;
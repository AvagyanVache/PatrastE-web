// src/components/MenuFormModal.jsx (Simplified structure)
import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const MenuFormModal = ({ isOpen, onClose, itemToEdit, restaurantId, onSaveSuccess }) => {
    // State to manage form inputs and the file selected for upload
    const [form, setForm] = useState({});
    const [imageFile, setImageFile] = useState(null);

    // Populate form if editing
    useEffect(() => {
        if (itemToEdit) {
            setForm({
                itemName: itemToEdit.itemName,
                itemPrice: itemToEdit.itemPrice,
                prepTime: String(itemToEdit.prepTime),
                itemDescription: itemToEdit.itemDescription,
                isAvailable: itemToEdit.isAvailable,
                originalDocumentId: itemToEdit.documentId,
            });
            setImageFile(null); // Clear file input on edit
        } else {
            // Reset form for new item
            setForm({
                itemName: '', itemPrice: '', prepTime: '', itemDescription: '', isAvailable: true, originalDocumentId: null
            });
            setImageFile(null);
        }
    }, [itemToEdit, isOpen]);

    const handleFileChange = (e) => {
        // This is how you handle image selection on the web
        setImageFile(e.target.files[0]);
    };

    // Maps to addItem, updateItemInFirestore, uploadImageAndSaveItem, etc.
    const handleSubmit = async (e) => {
        e.preventDefault();
        const { itemName, itemPrice, prepTime, itemDescription, isAvailable, originalDocumentId } = form;

        if (!itemName || !itemPrice || !prepTime) {
            alert("Name, price, and prep time are required");
            return;
        }

        const sanitizedName = itemName.replace(/[^a-zA-Z0-9]/g, '_');
        let imageUrl = itemToEdit?.itemImg || ""; // Keep existing image URL if not uploading new one

        try {
            // Check for duplicate name if adding a new item or renaming an existing one
            if (!itemToEdit || sanitizedName !== originalDocumentId) {
                const docRef = doc(db, `FoodPlaces/${restaurantId}/Menu/DefaultMenu/Items`, sanitizedName);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    alert("Item name already exists or sanitizes to an existing ID.");
                    return;
                }
            }
            
            // 1. Upload new image if selected (Web SDK)
            if (imageFile) {
                // Image compression is complex in web, usually handled by server or a dedicated library. 
                // For simplicity here, we skip explicit client-side compression.
                const imageRef = ref(storage, `menu_images/${restaurantId}/${sanitizedName}.jpg`);
                await uploadBytes(imageRef, imageFile);
                imageUrl = await getDownloadURL(imageRef);

                // Delete old image if it existed and was renamed/replaced
                if (itemToEdit && itemToEdit.itemImg) {
                   const oldImageRef = ref(storage, itemToEdit.itemImg);
                   await deleteObject(oldImageRef).catch(err => console.warn("Failed to delete old image:", err));
                }
            }
            
            // 2. Prepare Data and Batch Write (Web SDK)
            const itemData = {
                "Item Name": itemName,
                "Item Price": itemPrice,
                "Prep Time": parseInt(prepTime, 10),
                "Item Description": itemDescription || "",
                "Item Img": imageUrl,
                "Available": isAvailable,
            };

            const batch = writeBatch(db);
            const newItemDocRef = doc(db, `FoodPlaces/${restaurantId}/Menu/DefaultMenu/Items`, sanitizedName);

            // If updating and the name changed, delete the old document
            if (itemToEdit && sanitizedName !== originalDocumentId) {
                const oldItemDocRef = doc(db, `FoodPlaces/${restaurantId}/Menu/DefaultMenu/Items`, originalDocumentId);
                batch.delete(oldItemDocRef);
            }

            // Set/Update the new/existing document
            batch.set(newItemDocRef, itemData);

            await batch.commit();
            alert(`Item ${itemToEdit ? 'updated' : 'added'} successfully!`);
            
            onSaveSuccess(); // Reload parent list
            onClose(); // Close the modal

        } catch (error) {
            console.error("Save/Update failed: ", error);
            alert(`Failed to save item: ${error.message}`);
        }
    };
    
    // ... JSX for rendering the form inputs inside the modal ...
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h3>{itemToEdit ? "Edit Menu Item" : "Add New Menu Item"}</h3>
                <form onSubmit={handleSubmit}>
                    {/* Input fields corresponding to your Android EditTexts */}
                    <input type="text" value={form.itemName} onChange={e => setForm({...form, itemName: e.target.value})} placeholder="Item Name" required />
                    <input type="number" step="0.01" value={form.itemPrice} onChange={e => setForm({...form, itemPrice: e.target.value})} placeholder="Item Price" required />
                    <input type="number" value={form.prepTime} onChange={e => setForm({...form, prepTime: e.target.value})} placeholder="Prep Time (minutes)" required />
                    <textarea value={form.itemDescription} onChange={e => setForm({...form, itemDescription: e.target.value})} placeholder="Item Description" />

                    {/* Web file input for image selection */}
                    <label>Upload Image:</label>
                    <input type="file" onChange={handleFileChange} accept="image/*" />
                    
                    {/* Availability Switch */}
                    <label>
                        <input type="checkbox" checked={form.isAvailable} onChange={e => setForm({...form, isAvailable: e.target.checked})} />
                        Available
                    </label>

                    <div className="modal-actions">
                        <button type="submit">{itemToEdit ? "Update" : "Add"}</button>
                        <button type="button" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
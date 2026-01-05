import React, { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import { db, storage } from '../firebase';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export default function MenuFormModal({ isOpen, onClose, item, restaurantId, onSuccess }) {
  const [form, setForm] = useState({
    itemName: '', itemPrice: '', prepTime: '', itemDescription: '', isAvailable: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(item?.["Item Img"] || null);

  useEffect(() => {
    if (item) {
      setForm({
        itemName: item["Item Name"] || '',
        itemPrice: item["Item Price"] || '',
        prepTime: String(item["Prep Time"] || ''), 
        itemDescription: item["Item Description"] || '',
        isAvailable: item.Available ?? true
      });
      setPreview(item["Item Img"] || null);
    } else {
      setForm({ itemName: '', itemPrice: '', prepTime: '', itemDescription: '', isAvailable: true });
      setPreview(null);
    }
    setImageFile(null);
  }, [item, isOpen]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  const safeId = restaurantId.replace(/\s+/g, '_');

  if (!form.itemName || !form.itemPrice || !form.prepTime) {
    alert("Name, Price, and Prep Time are required!");
    return;
  }

  const sanitizedId = form.itemName.trim().replace(/[^a-zA-Z0-9]/g, '_');
  let imageUrl = preview;

  try {
    if (imageFile) {
      const imageRef = ref(storage, `menu_images/${safeId}/${Date.now()}_${sanitizedId}`);
      await uploadBytes(imageRef, imageFile);
      imageUrl = await getDownloadURL(imageRef);

      if (item?.["Item Img"]) {
        await deleteObject(ref(storage, item["Item Img"])).catch(() => {});
      }
    }

    const batch = writeBatch(db);

    if (item && sanitizedId !== item.id) {
      const oldRef = doc(db, `FoodPlaces/${restaurantId}/Menu/DefaultMenu/Items`, item.id);

      batch.delete(oldRef);
    }

    const newRef = doc(db, `FoodPlaces/${restaurantId}/Menu/DefaultMenu/Items`, sanitizedId);
    batch.set(newRef, {
      "Item Name": form.itemName,
      "Item Price": form.itemPrice,
      "Prep Time": parseInt(form.prepTime),
      "Item Description": form.itemDescription,
      "Item Img": imageUrl,
      "Available": form.isAvailable
    });

    await batch.commit();
    alert("Saved successfully!");
    onSuccess();
    onClose();
  } catch (err) {
    console.error(err);
    alert("Save failed: " + err.message);
  }
};


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">{item ? "Edit" : "Add"} Menu Item</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={32} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              type="text"
              placeholder="Item Name"
              value={form.itemName}
              onChange={e => setForm({...form, itemName: e.target.value})}
              className="w-full px-6 py-4 rounded-xl border-2 border-gray-300 focus:border-orange-600 focus:outline-none text-lg"
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                step="0.01"
                placeholder="Price"
                value={form.itemPrice}
                onChange={e => setForm({...form, itemPrice: e.target.value})}
                className="px-6 py-4 rounded-xl border-2 border-gray-300 focus:border-orange-600 focus:outline-none text-lg"
                required
              />
              <input
                type="number"
                placeholder="Prep Time (min)"
                value={form.prepTime}
                onChange={e => setForm({...form, prepTime: e.target.value})}
                className="px-6 py-4 rounded-xl border-2 border-gray-300 focus:border-orange-600 focus:outline-none text-lg"
                required
              />
            </div>

            <textarea
              placeholder="Description (optional)"
              value={form.itemDescription}
              onChange={e => setForm({...form, itemDescription: e.target.value})}
              rows="3"
              className="w-full px-6 py-4 rounded-xl border-2 border-gray-300 focus:border-orange-600 focus:outline-none text-lg resize-none"
            />

            <div className="space-y-4">
              {preview && (
                <img src={preview} alt="Preview" className="w-full h-64 object-cover rounded-2xl" />
              )}
              <label className="block">
                <div className="border-2 border-dashed border-gray-400 rounded-2xl p-8 text-center cursor-pointer hover:border-orange-600 transition">
                  <Upload className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                  <p className="text-lg">Click to upload image</p>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </div>
              </label>
            </div>

            <label className="flex items-center gap-3 text-lg">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={e => setForm({...form, isAvailable: e.target.checked})}
                className="w-6 h-6"
              />
              <span>Available for order</span>
            </label>

            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                className="flex-1 bg-orange-600 text-white font-bold py-5 rounded-xl text-xl hover:bg-orange-700 transition"
              >
                {item ? "Update Item" : "Add Item"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-800 font-bold py-5 rounded-xl text-xl hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
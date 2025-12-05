import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase';
import { doc, getDoc, updateDoc, collection, onSnapshot, getDocs, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Mail, Utensils, Phone, Clock, MapPin, Save, Upload, Edit3,XCircle, PlusCircle, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

// Initial structure for operating hours derived from XML
const initialHours = {
    Monday: 'Closed', Tuesday: 'Closed', Wednesday: 'Closed',
    Thursday: 'Closed', Friday: 'Closed', Saturday: 'Closed', Sunday: 'Closed'
};

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ProfilePage() {
    const { user, logout } = useAuth();
    const restaurantDocId = user?.restaurantId;
    const [restaurantData, setRestaurantData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [nameInput, setNameInput] = useState('');
    const [phoneInput, setPhoneInput] = useState('');
    const [hoursInput, setHoursInput] = useState(initialHours);
    const [logoFile, setLogoFile] = useState(null);
    const [isHoursOpen, setIsHoursOpen] = useState(false); // For toggling hours visibility
const [addresses, setAddresses] = useState([]);
    const [newAddressInput, setNewAddressInput] = useState('');
const [isPhoneEditing, setIsPhoneEditing] = useState(false);
    const restaurantId = user?.restaurantId; // Assuming restaurantId is available on the user object
useEffect(() => {
    if (!restaurantDocId) {
        setError("Restaurant identifier (restaurantId) is missing from the user context.");
        return;
    }

    const docRef = doc(db, "FoodPlaces", restaurantDocId);

    const unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setRestaurantData(data);

             setNameInput(data.name || ""); 
                setPhoneInput(data.contactPhone || ""); 
                setHoursInput({ ...initialHours, ...(data.operatingHours || {}) });
                setAddresses(data.addresses || []);
                setError("");
            } else {
                setError("Restaurant does not exist or was removed.");
            }
        },
        (err) => {
            console.error("Firestore listen failed:", err);
            setError("Failed to fetch restaurant information.");
        }
    );

    return () => unsubscribe();
}, [restaurantDocId]);



    // Handle form input changes for hours
    const handleHoursChange = (day, value) => {
        setHoursInput(prev => ({ ...prev, [day]: value }));
    };

    // Handle logo file selection
    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
        }
    };

    // Upload logo to storage and update Firestore
    const uploadLogo = async (file) => {
        const logoRef = ref(storage, `restaurant_logos/${restaurantDocId}_logo`);
        await uploadBytes(logoRef, file);
        return await getDownloadURL(logoRef);
    };

const handleAddAddress = () => {
        const trimmedAddress = newAddressInput.trim();
        // Prevent adding empty or duplicate addresses
        if (trimmedAddress && !addresses.includes(trimmedAddress)) {
            setAddresses(prev => [...prev, trimmedAddress]);
            setNewAddressInput('');
        }
    };

    const handleDeleteAddress = (addressToDelete) => {
        setAddresses(prev => prev.filter(addr => addr !== addressToDelete));
    };
        const handleSave = async () => {
      if (!restaurantDocId || isSaving) return; 
        setIsSaving(true);
        setError('');

        try {
            const updates = {
              name: nameInput.trim(), 
                contactPhone: phoneInput.trim(), 
                operatingHours: hoursInput, // Use camelCase field name
                addresses: addresses,
            };

            // 2a. Handle Logo Update
            let logoUrl = restaurantData?.logoUrl;
            if (logoFile) {
                logoUrl = await uploadLogo(logoFile);
                updates.logoUrl = logoUrl;
                // Optional: Update user's profile picture URL in the users collection
              
            }

            // 2b. Update Restaurant Document
           const docRef = doc(db, "FoodPlaces", restaurantDocId);
            await updateDoc(docRef, updates);

            setLogoFile(null); // Clear file input after successful upload
            alert('Profile updated successfully!');// Use alert temporarily
        } catch (e) {
            console.error("Error saving profile:", e);
            setError(`Failed to save changes: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // --- Loading and Error States ---
    if (!user) {
        return <div className="min-h-screen pt-16 flex items-center justify-center text-gray-700">Please log in.</div>;
    }
if (!restaurantDocId) {
    return (
        <div className="min-h-screen pt-16 flex items-center justify-center text-gray-700">
            No restaurantId found in user profile.
        </div>
    );
}


    if (error) { // Show specific error if the ID is missing or fetch failed
        return (
            <div className="min-h-screen pt-16 flex items-center justify-center">
                 <div className="bg-red-100 text-red-700 p-6 rounded-xl text-xl text-center shadow-lg">{error}</div>
            </div>
        );
    }
    if (!restaurantData) {
        return (
            <div className="min-h-screen pt-16 flex items-center justify-center">
                <div className="text-gray-500 text-xl">Loading profile data...</div>
            </div>
        );
    }
    
    // --- Render Component ---

    return (
        <div className="min-h-screen bg-gray-50 pt-16 pb-12">
            <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-2xl border border-gray-100">
                <div className="flex justify-end mb-6">
                    <button 
                        onClick={logout}
                        className="flex items-center gap-2 text-white font-bold bg-red-500 hover:bg-red-600 p-3 rounded-xl transition shadow-md"
                    >
                        <LogOut size={20} /> 
                        Log Out
                    </button>
                </div>
                <h1 className="text-4xl font-extrabold text-orange-600 mb-8 text-center border-b pb-4">
                    Restaurant Profile
                </h1>

                {error && (
                    <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-center">{error}</div>
                )}

                {/* Profile Header & Logo */}
                <div className="flex flex-col items-center mb-10">
                    <div className="relative w-32 h-32 rounded-full border-4 border-orange-500 bg-gray-200 shadow-xl overflow-hidden">
                        <img 
                            src={logoFile ? URL.createObjectURL(logoFile) : (restaurantData?.logoUrl || "https://placehold.co/128x128/f97316/ffffff?text=Logo")}
                            alt="Restaurant Logo"
                            className="w-full h-full object-cover"
                        />
                        <input
                            type="file"
                            id="logoUpload"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoChange}
                        />
                        <label 
                            htmlFor="logoUpload" 
                            className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                            title="Tap to change logo"
                        >
                            <Upload className="text-white w-8 h-8"/>
                        </label>
                    </div>
                    <p className="text-gray-500 mt-2 text-sm">Tap logo to change</p>
                </div>


                {/* Restaurant Details Section */}
                <div className="space-y-6">
                    
                    {/* Name */}
                  <div className="flex items-center p-4 bg-gray-100 rounded-lg"> {/* Changed color to gray-100 */}
                        <Utensils className="w-6 h-6 text-gray-500 mr-4 flex-shrink-0" /> {/* Changed icon color */}
                        <div className="flex-grow">
                            <label htmlFor="nameInput" className="text-sm font-bold text-gray-700 block">Restaurant Name</label>
                            <p className="w-full text-lg font-semibold text-gray-900 py-1"> 
                                {nameInput} {/* Display name as static text */}
                            </p>
                        </div>
                    </div>

                    {/* Phone */}
                   <div className={`flex items-start p-4 rounded-lg shadow-inner transition duration-300 ${isPhoneEditing ? 'bg-orange-100 border border-orange-300' : 'bg-gray-50'}`}>
                        <Phone className={`w-6 h-6 mr-4 flex-shrink-0 transition ${isPhoneEditing ? 'text-orange-600' : 'text-gray-500'}`} />
                        <div className="flex-grow">
                            <label htmlFor="phoneInput" className="text-sm font-bold text-gray-700 block">Contact Phone</label>
                            {isPhoneEditing ? (
                                <input 
                                    id="phoneInput"
                                    type="tel"
                                    value={phoneInput}
                                    onChange={(e) => setPhoneInput(e.target.value)}
                                    className="w-full text-lg font-semibold text-gray-900 border-b border-orange-600 bg-transparent focus:outline-none"
                                />
                            ) : (
                                <p className="text-lg font-semibold text-gray-900">{phoneInput || 'N/A'}</p>
                            )}
                        </div>
                        
                        {/* EDIT TOGGLE ICON */}
                        <button
                            onClick={() => setIsPhoneEditing(!isPhoneEditing)}
                            className="flex-shrink-0 ml-4 p-1 rounded-full hover:bg-orange-200 transition"
                            title={isPhoneEditing ? "Stop Editing" : "Edit Phone Number"}
                        >
                            <Edit3 className={`w-5 h-5 transition ${isPhoneEditing ? 'text-orange-600' : 'text-gray-400'}`} />
                        </button>
                    </div>
                    
                    {/* Email (Read-only from User Context) */}
                    <div className="flex items-center p-4 bg-gray-100 rounded-lg">
                        <Mail className="w-6 h-6 text-gray-500 mr-4 flex-shrink-0" />
                        <div className="flex-grow">
                            <p className="text-sm font-bold text-gray-700">Account Email (Owner)</p>
                            <p className="text-lg text-gray-800">{user.email}</p>
                        </div>
                    </div>
                </div>

                {/* Operating Hours Section */}
                <div className="mt-10 border border-gray-200 rounded-xl p-6 shadow-lg">
                    <div 
                        className="flex justify-between items-center cursor-pointer"
                        onClick={() => setIsHoursOpen(!isHoursOpen)}
                    >
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                            <Clock className="w-6 h-6 text-orange-600 mr-3" />
                            Operating Hours
                        </h2>
                        <Edit3 className="w-5 h-5 text-gray-500 hover:text-orange-600 transition" />
                    </div>
                    
                    {isHoursOpen && (
                        <div className="mt-4 space-y-3 pt-4 border-t border-gray-100">
                            {dayOrder.map(day => (
                                <div key={day} className="flex items-center justify-between">
                                    <label className="w-1/4 font-medium text-gray-700">{day}</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 09:00-17:00 or Closed"
                                        value={hoursInput[day] || ''}
                                        onChange={(e) => handleHoursChange(day, e.target.value)}
                                        className="w-3/4 p-2 border border-gray-300 rounded-md focus:border-orange-500 focus:ring focus:ring-orange-200 transition"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

          {/* Addresses Section (Updated for editing/adding) */}
<div className="mt-10 border border-gray-200 rounded-xl p-6 shadow-lg">
    <h2 className="text-2xl font-bold text-gray-800 flex items-center mb-4">
        <MapPin className="w-6 h-6 text-orange-600 mr-3" />
        Restaurant Address(es)
    </h2>
    
    {/* Display Existing Addresses */}
    <div className="space-y-3">
        {addresses.length === 0 ? (
            <p className="text-gray-500 italic p-2 border-l-4 border-gray-300">No addresses added yet.</p>
        ) : (
            addresses.map((addr, index) => (
                <div 
                    key={index} 
                    className="flex justify-between items-center p-3 border border-gray-200 bg-white rounded-lg shadow-sm"
                >
                    <span className="text-base text-gray-700">{addr}</span>
                    <button 
                        onClick={() => handleDeleteAddress(addr)}
                        className="text-red-500 hover:text-red-700 transition"
                        title="Remove address"
                    >
                        <XCircle className="w-5 h-5" />
                    </button>
                </div>
            ))
        )}
    </div>

    {/* Add New Address Input */}
    <div className="mt-6 pt-4 border-t border-gray-100 flex gap-2">
        <input
            type="text"
            placeholder="Enter new address (e.g., 123 Main St, City)"
            value={newAddressInput}
            onChange={(e) => setNewAddressInput(e.target.value)}
            className="flex-grow p-2 border border-gray-300 rounded-l-md focus:border-orange-500 focus:ring focus:ring-orange-200 transition"
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAddress();
                }
            }}
        />
        <button
            onClick={handleAddAddress}
            disabled={!newAddressInput.trim()}
            className="flex-shrink-0 flex items-center gap-1 bg-orange-600 text-white font-medium py-2 px-4 rounded-r-md hover:bg-orange-700 transition disabled:bg-gray-400"
            title="Add Address"
        >
            <PlusCircle className="w-5 h-5" />
            Add
        </button>
    </div>
</div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="mt-10 w-full flex items-center justify-center gap-3 bg-orange-600 text-white font-bold py-4 rounded-xl shadow-xl hover:bg-orange-700 transition disabled:bg-gray-400"
                >
                    <Save className="w-6 h-6" />
                    {isSaving ? 'Saving Changes...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );}
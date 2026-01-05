import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase';
import { doc, getDoc, updateDoc, collection, onSnapshot, getDocs, setDoc, writeBatch, deleteDoc} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Mail, Utensils, Phone, Clock, MapPin, Save, Upload, Edit3,XCircle, PlusCircle, LogOut, CheckCircle } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
const MapPlaceholder = ({ lat, lng, address }) => {
    return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3 text-sm text-blue-800">
            {address ? (
                <>
                    <p className="font-bold">Map Preview for: {address}</p>
                    <p>Coordinates: Lat **{lat.toFixed(4)}**, Lng **{lng.toFixed(4)}**</p>
                    <div className="w-full h-40 bg-gray-200 flex items-center justify-center mt-2 rounded">
                    </div>
                </>
            ) : (
                <p>Enter and validate an address to see a map preview.</p>
            )}
        </div>
    );
};
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
    const [addresses, setAddresses] = useState([]);
    const [isAddressesLoaded, setIsAddressesLoaded] = useState(false);
    const restaurantId = user?.restaurantId; 
    const [isLocallyModified, setIsLocallyModified] = useState(false);

    const addressesCollectionRef = restaurantDocId 
        ? collection(db, "FoodPlaces", restaurantDocId, "Addresses") 
        : null;

   
    const [isHoursOpen, setIsHoursOpen] = useState(false); 
const [addressesToDelete, setAddressesToDelete] = useState([]);    const [newAddressInput, setNewAddressInput] = useState('');
    const [validationMessage, setValidationMessage] = useState('');
    const [validatedAddress, setValidatedAddress] = useState(null);
const [isPhoneEditing, setIsPhoneEditing] = useState(false);
const geocodeAddress = async (address) => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
            const location = data[0];
            return {
                address: address,
                lat: parseFloat(location.lat),
                lng: parseFloat(location.lon)
            };
        } else {
            return null;
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
};
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



    const handleHoursChange = (day, value) => {
        setHoursInput(prev => ({ ...prev, [day]: value }));
    };

useEffect(() => {
    if (!addressesCollectionRef) return;

    const unsubscribe = onSnapshot(
        addressesCollectionRef,
        async (querySnapshot) => {
            const fetchedAddresses = [];
            const geocodePromises = []; 

            if (!querySnapshot.empty) {
                querySnapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    const currentAddress = {
                        id: docSnap.id, 
                        address: data.address || "",
                        lat: data.latitude || 0.0, 
                        lng: data.longitude || 0.0,
                        isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
                    };

if (currentAddress.address && (currentAddress.lat === 0.0 || currentAddress.lng === 0.0)) {
    geocodePromises.push(
        geocodeAddress(currentAddress.address).then(result => { 
            if (result) {
                currentAddress.lat = result.lat;
                currentAddress.lng = result.lng;
            }
            return currentAddress;
        })
    );
} else {
                        geocodePromises.push(Promise.resolve(currentAddress));
                    }
                });
            }

            const resolvedAddresses = await Promise.all(geocodePromises);
            
            resolvedAddresses.forEach(addr => fetchedAddresses.push(addr));

setAddresses(prev => {
                const unsaved = prev.filter(a => !a.id || a.id === null);

                const newlySavedAddresses = fetchedAddresses.map(a => a.address);
                const uniqueUnsaved = unsaved.filter(a => !newlySavedAddresses.includes(a.address));

                return [...fetchedAddresses, ...uniqueUnsaved];
            });
            
            setIsAddressesLoaded(true); 
        },
        (err) => {
            console.error("Firestore listen failed for addresses subcollection:", err);
            setError("Failed to fetch address list.");
        }
    );

    return () => unsubscribe();
}, [addressesCollectionRef]);


    const getNewEmptyAddress = (addressText = '') => ({
        id: null, 
        address: addressText,
        lat: 0.0,
        lng: 0.0,
        isAvailable: true,
    });    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
        }
    };

    const uploadLogo = async (file) => {
        const logoRef = ref(storage, `restaurant_logos/${restaurantDocId}_logo`);
        await uploadBytes(logoRef, file);
        return await getDownloadURL(logoRef);
    };

const checkAddressInMap = async () => {
    const trimmedAddress = newAddressInput.trim();
    if (!trimmedAddress) {
        setValidationMessage("Please enter an address to validate.");
        return;
    }

    setValidationMessage('Validating address...');
    setValidatedAddress(null);

    try {
        const result = await geocodeAddress(trimmedAddress);

        if (result && result.lat !== 0.0) {
            setValidatedAddress({...result, id:null, isAvailable:true});
            setValidationMessage(`Address validated successfully. Coordinates found: ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}.`);
        } else {
            setValidationMessage("Address could not be found or validated. Please try a different format.");
        }
    } catch (e) {
        console.error("Geocoding failed:", e);
        setValidationMessage("An error occurred during validation.");
    }
};
    
const handleAddressInputChange = async (index, newAddress) => {
    const tempAddresses = [...addresses];
    tempAddresses[index].address = newAddress;
    setAddresses(tempAddresses);

    if (newAddress.trim() !== '') {
        const geocoded = await geocodeAddress(newAddress);
        
        setAddresses(prev => {
            const updated = [...prev];
            if (geocoded) {
                updated[index].lat = geocoded.lat;
                updated[index].lng = geocoded.lng;
            } else {
                updated[index].lat = 0.0;
                updated[index].lng = 0.0;
            }
            return updated;
        });
    } else {
        setAddresses(prev => {
            const updated = [...prev];
            updated[index].lat = 0.0;
            updated[index].lng = 0.0;
            return updated;
        });
    }

    setValidationMessage('');
};
    const handleAvailabilityToggle = (index, isChecked) => {
        const updatedAddresses = [...addresses];
        updatedAddresses[index].isAvailable = isChecked;
        setAddresses(updatedAddresses);
    };

  const handleDeleteAddress = async (index) => {
    const addressToDelete = addresses[index];
    const isExisting = addressToDelete.id;

    const updatedAddresses = addresses.filter((_, i) => i !== index);
    
    if (updatedAddresses.length === 0) {
        setAddresses([getNewEmptyAddress()]); 
    } else {
        setAddresses(updatedAddresses);
    }

    if (isExisting && addressesCollectionRef) {
        setIsSaving(true); 
        setError('');
        try {
            const addrDocRef = doc(addressesCollectionRef, addressToDelete.id);
            await deleteDoc(addrDocRef); 
            alert('Address deleted successfully!');
        } catch (e) {
            console.error("Error deleting address:", e);
            setError(`Failed to delete address: ${e.message}.`);
            setAddresses(prev => [...prev, addressToDelete]); 
        } finally {
            setIsSaving(false);
        }
    }
};

    const addNewAddressField = () => {
        setAddresses(prev => [...prev, getNewEmptyAddress()]);
    };

    const handleAddValidatedAddress = () => {
        if (!validatedAddress) {
            setValidationMessage("Please validate the address first.");
            return;
        }

        const isDuplicate = addresses.some(addr => addr.address === validatedAddress.address);
        if (isDuplicate) {
            setValidationMessage("This address has already been added.");
            return;
        }

        setAddresses(prev => [...prev, validatedAddress]);
        
        setNewAddressInput('');
        setValidatedAddress(null);
        setValidationMessage('');
    }; 
    
const handleSave = async () => {
    if (!restaurantDocId || isSaving) return;
    setIsSaving(true);
    setError('');

    try {
        const mainDocRef = doc(db, "FoodPlaces", restaurantDocId);
        const batch = writeBatch(db); 

        const mainUpdates = {
            name: nameInput,
            contactPhone: phoneInput,
            operatingHours: hoursInput,
         };
        let logoUrl = restaurantData?.logoUrl;
        if (logoFile) {
             logoUrl = await uploadLogo(logoFile);
             mainUpdates.logoUrl = logoUrl;
        }
        batch.update(mainDocRef, mainUpdates);

     const processedAddresses = await Promise.all(addresses.map(async (addr) => {
            let finalLat = addr.lat;
            let finalLng = addr.lng;

            if (addr.address.trim() !== '' && (finalLat === 0 || finalLng === 0)) {
                const result = await geocodeAddress(addr.address);
                if (result) {
                    finalLat = result.lat;
                    finalLng = result.lng;
                }
            }
            return { ...addr, lat: finalLat, lng: finalLng };
        }));

        processedAddresses.forEach(addr => {
            if (addr.address.trim() === '') return;

            const firestoreData = {
                address: addr.address,
                latitude: addr.lat, 
                longitude: addr.lng,
                isAvailable: addr.isAvailable,
            };

            if (addr.id) {
                const addrDocRef = doc(addressesCollectionRef, addr.id);
                batch.update(addrDocRef, firestoreData);
            } else {
                const newDocRef = doc(addressesCollectionRef);
                batch.set(newDocRef, firestoreData);
            }
        });

        await batch.commit();

        setLogoFile(null);
        alert('Profile and Addresses updated successfully!');

    } catch (e) {
        console.error("Error saving profile:", e);
        setError(`Failed to save changes: ${e.message}`);
    } finally {
        setIsSaving(false);
    }
};

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

    if (error) { 
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
if (!restaurantDocId) {
    return (
        <div className="min-h-screen pt-16 flex items-center justify-center text-gray-700">
            No restaurantId found in user profile.
        </div>
    );
}


    if (error) { 
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
    

   return (
    <div className="relative min-h-screen pt-16 pb-12 overflow-hidden">

        <div
            className="absolute inset-0 opacity-100 -z-10"
            style={{
                backgroundImage: "url(/background4.jpg)",
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
        />
        <div className="max-w-4xl mx-auto p-6 bg-white/95 rounded-xl shadow-2xl border border-gray-100 relative z-10">

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


                <div className="space-y-6">
                    
                  <div className="flex items-center p-4 bg-gray-100 rounded-lg"> 
                        <Utensils className="w-6 h-6 text-gray-500 mr-4 flex-shrink-0" /> 
                        <div className="flex-grow">
                            <label htmlFor="nameInput" className="text-sm font-bold text-gray-700 block">Restaurant Name</label>
                            <p className="w-full text-lg font-semibold text-gray-900 py-1"> 
                                {nameInput}
                            </p>
                        </div>
                    </div>

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
                        
                        <button
                            onClick={() => setIsPhoneEditing(!isPhoneEditing)}
                            className="flex-shrink-0 ml-4 p-1 rounded-full hover:bg-orange-200 transition"
                            title={isPhoneEditing ? "Stop Editing" : "Edit Phone Number"}
                        >
                            <Edit3 className={`w-5 h-5 transition ${isPhoneEditing ? 'text-orange-600' : 'text-gray-400'}`} />
                        </button>
                    </div>
                    
                    <div className="flex items-center p-4 bg-gray-100 rounded-lg">
                        <Mail className="w-6 h-6 text-gray-500 mr-4 flex-shrink-0" />
                        <div className="flex-grow">
                            <p className="text-sm font-bold text-gray-700">Account Email (Owner)</p>
                            <p className="text-lg text-gray-800">{user.email}</p>
                        </div>
                    </div>
                </div>

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

       <div className="mt-10 border border-gray-200 rounded-xl p-6 shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center mb-4">
                        <MapPin className="w-6 h-6 text-orange-600 mr-3" />
                        Restaurant Address(es)
                    </h2>

                    <div className="space-y-4 pt-2">
                        {addresses.map((addr, index) => (
                            <div 
                                key={addr.id || `new-${index}`} 
                                className="p-3 border border-gray-200 bg-white rounded-lg shadow-sm"
                            >
                                <div className="flex gap-2 mb-2 items-center">
<input
    type="text"
    placeholder="Enter full address"
    value={addr.address}
    onChange={(e) => {
        const updated = [...addresses];
        updated[index].address = e.target.value;
        setAddresses(updated);
    }}
    onBlur={async (e) => {
        const result = await geocodeAddress(e.target.value);
        if (result) {
            const updated = [...addresses];
            updated[index].lat = result.lat;
            updated[index].lng = result.lng;
            setAddresses(updated);
        }
    }}
    className="flex-grow p-2 border border-gray-300 rounded-md focus:border-orange-500"
/>
                                    <span className="text-xs text-gray-500 flex-shrink-0 w-32 text-right">
                                        Lat: {addr.lat.toFixed(4)}<br/>Lng: {addr.lng.toFixed(4)}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                    <label className="flex items-center text-sm font-medium text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={addr.isAvailable}
                                            onChange={(e) => handleAvailabilityToggle(index, e.target.checked)}
                                            className="mr-2 h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                        />
                                        Available for Delivery/Pickup
                                    </label>
                                    
                                    <button 
                                        onClick={() => handleDeleteAddress(index)}
                                        className="text-red-500 hover:text-red-700 transition"
                                        title="Remove address"
                                    >
                                        <XCircle className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                  <div className="mt-6 pt-4 border-t border-gray-100">
    <button
        type="button" 
        onClick={addNewAddressField}
        className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-300 transition"
        title="Add Another Address Field"
    >
        <PlusCircle className="w-5 h-5" />
        Add Another Address Field
    </button>
</div>
                </div>
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
    );
}
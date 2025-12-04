// src/pages/OrderManagementPage.jsx
import React, { useState, useEffect } from 'react';
import OrderItem from '../components/OrderItem';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  onSnapshot, 
  runTransaction,
  serverTimestamp,
  getDoc,
  deleteDoc,
  orderBy // <--- ADD THIS IMPORT
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2'; // For modern, better dialogs
import { Clock, Loader2, ClipboardList } from 'lucide-react';

export default function OrderManagementPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [orderHistory, setOrderHistory] = useState([]); // NEW STATE
  const [historyLoading, setHistoryLoading] = useState(false);
  const [restaurantId, setRestaurantId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Utility Functions (Copied from MenuManagementPage) ---
  async function getRestaurantIdByOwner(uid) {
    try {
      const q = query(collection(db, "FoodPlaces"), where("uid", "==", uid));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return snapshot.docs[0].id;
    } catch (error) {
      console.error("Error in getRestaurantIdByOwner:", error);
      throw error;
    }
  }

  // --- 1. Load Restaurant ID ---
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setError("Please log in to manage orders.");
      return;
    }
    getRestaurantIdByOwner(user.uid)
      .then(id => {
        setRestaurantId(id);
        if (!id) {
          setIsLoading(false);
          setError("No restaurant found for your account.");
        }
      })
      .catch(err => {
        setIsLoading(false);
        setError(`Error finding restaurant: ${err.message}`);
      });
  }, [user]);

  // --- 2. Load Pending Orders (Real-time listener) ---
  useEffect(() => {
    if (!restaurantId) return;

    setIsLoading(true);
    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef,
      where("restaurantId", "==", restaurantId),
      where("approvalStatus", "==", "pendingApproval")
    );

    // This is the real-time listener, equivalent to addSnapshotListener
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      try {
        // Use Promise.all to fetch all necessary details concurrently
        const fetchedOrders = await Promise.all(
          querySnapshot.docs.map(docSnap => fetchOrderData(docSnap))
        );
        setOrders(fetchedOrders);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading orders:", error);
        setError(`Error loading orders: ${error.message}`);
        setIsLoading(false);
      }
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, [restaurantId]);
  
  // --- 3. Order Actions ---

  // Equivalent to acceptOrder(String orderId)
  const acceptOrder = async (orderId) => {
  const orderDocRef = doc(db, "orders", orderId);

  try {
    let totalPrepTimeMinutes = 0;

    // STEP 1: Use transaction to atomically set status and server timestamp (startTime)
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(orderDocRef);

      if (!snapshot.exists()) {
        throw new Error("Order does not exist");
      }

      // Safe retrieval of totalPrepTime
      totalPrepTimeMinutes = snapshot.data().totalPrepTime;
      if (totalPrepTimeMinutes == null) {
        throw new Error("Total prep time is missing or null");
      }

      // The transaction updates:
      transaction.update(orderDocRef, {
        approvalStatus: "accepted",
        startTime: serverTimestamp(), // Sets the server timestamp
      });
      
      return totalPrepTimeMinutes; // Return the prep time for the next step
    });

    // STEP 2: Wait for the transaction to complete, then read the document to get the confirmed 'startTime'.
    // This replicates the Android success listener logic.
    const updatedSnapshot = await getDoc(orderDocRef);
    const startTimeTimestamp = updatedSnapshot.data()?.startTime;
    
    if (startTimeTimestamp) {
      // Calculate endTime based on the confirmed startTime
      const startTimeMs = startTimeTimestamp.toMillis();
      const totalPrepTimeMs = totalPrepTimeMinutes * 60 * 1000; // Convert minutes to milliseconds
      const endTimeMs = startTimeMs + totalPrepTimeMs;

      // STEP 3: Perform the final update to set endTime
      await updateDoc(orderDocRef, {
        endTime: new Date(endTimeMs) // Firestore converts Date objects to Timestamps
      });

      // Show success message
      Swal.fire('Accepted!', `Order #${orderId.substring(0, 8)} accepted. End time calculated.`, 'success');
      
    } else {
      // If startTime is unexpectedly null after transaction, log an error
      throw new Error("Server start time was null after transaction success.");
    }

  } catch (e) {
    console.error("Failed to accept order:", e);
    // Show error message
    Swal.fire('Error', `Failed to accept order. Check console for details.`, 'error');
  }
};

  // Equivalent to declineOrder(String orderId) and updateOrderDeclineStatus(...)
  const declineOrder = async (orderId) => {
    const { value: reason } = await Swal.fire({
      title: 'Select Reason for Declining Order',
      input: 'select',
      inputOptions: {
        'Out of stock': 'Out of stock',
        'Kitchen overload': 'Kitchen overload',
        'Order not feasible': 'Order not feasible',
        'Other': 'Other (Specify)'
      },
      inputPlaceholder: 'Select a reason',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'You need to select a reason!';
        }
      }
    });

    if (reason) {
      let finalReason = reason;

      if (reason === 'Other') {
        const { value: customReason } = await Swal.fire({
          title: 'Specify Decline Reason',
          input: 'text',
          inputPlaceholder: 'Enter reason for decline',
          showCancelButton: true,
          inputValidator: (value) => {
            if (!value) {
              return 'You need to enter a reason!';
            }
          }
        });

        if (customReason) {
          finalReason = customReason;
        } else {
          return; // Cancelled custom reason input
        }
      }

      // Update decline status
      const orderDocRef = doc(db, "orders", orderId);
      try {
        await updateDoc(orderDocRef, {
          approvalStatus: "declined",
          declineReason: finalReason,
        });

        // Delete order after 2 seconds (similar to your Java Handler().postDelayed)
        setTimeout(async () => {
          try {
            await deleteDoc(orderDocRef);
            Swal.fire('Declined!', 'Order declined and removed.', 'info');
          } catch (e) {
            console.error("Failed to delete order:", e);
            Swal.fire('Error', `Failed to delete order: ${e.message}`, 'error');
          }
        }, 2000);

      } catch (e) {
        console.error("Failed to decline order:", e);
        Swal.fire('Error', `Failed to decline order: ${e.message}`, 'error');
      }
    }
  };
  const fetchOrderData = async (docSnap) => {
    let order = { id: docSnap.id, ...docSnap.data(), orderId: docSnap.id };
    
    // Fetch Customer Details
    const customerId = order.userId;
    if (customerId) {
        try {
            const customerDoc = await getDoc(doc(db, "users", customerId));
            if (customerDoc.exists()) {
                const customerData = customerDoc.data();
                order.customerName = customerData.name || "Unknown Customer";
                order.customerPhone = customerData.phone || "N/A";
                order.customerEmail = customerData.email || "N/A";
            }
        } catch (e) {
            console.error("Error fetching customer details:", e);
        }
    }
    
    // Fetch Restaurant Location/Name (For completeness, though generally known in this view)
    if (order.restaurantId) {
        try {
            const resDoc = await getDoc(doc(db, "FoodPlaces", order.restaurantId));
            if (resDoc.exists()) {
                const resData = resDoc.data();
                order.restaurantName = resData.name || "N/A";
                order.restaurantAddress = resData.address || "Location Not Set";
            }
        } catch (e) {
            console.error("Error fetching restaurant details:", e);
        }
    }
    
    return order;
};


const loadOrderHistory = async () => {
    if (!restaurantId || historyLoading) return;
    setHistoryLoading(true);

    const q = query(
        collection(db, "orders"),
        where("restaurantId", "==", restaurantId),
        // Filter for orders that are no longer pending
        where("approvalStatus", "in", ["accepted", "declined"]), 
        orderBy("startTime", "desc") // Show most recent history first
    );

    try {
        const querySnapshot = await getDocs(q);
        const historyOrders = await Promise.all(
            querySnapshot.docs.map(docSnap => fetchOrderData(docSnap))
        );
        setOrderHistory(historyOrders);

    } catch (error) {
        console.error("Error loading order history:", error);
        Swal.fire('Error', 'Failed to load order history.', 'error');
    } finally {
        setHistoryLoading(false);
    }
};
  // --- Render Logic ---
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-16">
        <Loader2 className="w-10 h-10 animate-spin text-orange-600 mr-2" />
        <span className="text-xl font-medium text-orange-600">Loading Orders...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-6 pt-16">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <p className="text-xl font-bold text-red-600 mb-4">Error</p>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden pt-16">
      {/* Background Image */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'url(/background4.jpg)', 
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      <div className="relative z-10 p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 mt-4">
          <h1 className="text-4xl font-bold text-gray-800 drop-shadow-sm">
            <ClipboardList className="inline w-10 h-10 mr-2 text-orange-600" />
            Order Management
          </h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-6 bg-white p-2 rounded-xl shadow-md">
            <button
                onClick={() => setActiveTab('pending')}
                className={`px-8 py-3 text-lg font-bold rounded-l-lg transition-colors ${
                    activeTab === 'pending' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
                Pending Orders ({orders.length})
            </button>
            <button
                onClick={() => { setActiveTab('history'); loadOrderHistory(); }} // Trigger load on switch
                className={`px-8 py-3 text-lg font-bold rounded-r-lg transition-colors ${
                    activeTab === 'history' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
                Order History ({orderHistory.length})
            </button>
        </div>
        
        {/* Content based on Active Tab */}
        {/* === PENDING TAB === */}
        {activeTab === 'pending' && (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="text-center mt-20 p-10 bg-white rounded-xl shadow-lg border-t-4 border-green-500">
                  <p className="text-3xl font-bold text-green-600 mb-2">🎉 No Pending Orders</p>
                  <p className="text-gray-600">You're all caught up!</p>
                </div>
              ) : (
                orders.map((order) => (
                  <OrderItem 
                    key={order.id} 
                    order={order} 
                    onAccept={acceptOrder} 
                    onDecline={declineOrder} 
                  />
                ))
              )}
            </div>
        )}

        {/* === HISTORY TAB === */}
        {activeTab === 'history' && (
            <div className="space-y-4">
                {historyLoading ? (
                    <div className="text-center p-10 bg-white rounded-xl shadow-lg text-lg text-gray-500 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        Loading History...
                    </div>
                ) : orderHistory.length > 0 ? (
                    orderHistory.map(order => (
                        <OrderItem 
                            key={order.id} 
                            order={order} 
                            onAccept={null} // Pass null to hide action buttons
                            onDecline={null} // Pass null to hide action buttons
                        />
                    ))
                ) : (
                    <div className="text-center p-10 bg-white rounded-xl shadow-lg text-lg text-gray-500">
                        No previous orders found.
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}
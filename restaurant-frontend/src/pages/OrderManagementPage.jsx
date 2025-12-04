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
  deleteDoc
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2'; // For modern, better dialogs
import { Clock, Loader2, ClipboardList } from 'lucide-react';

export default function OrderManagementPage() {
  const { user } = useAuth();
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
      let fetchedOrders = [];
      for (const docSnap of querySnapshot.docs) {
        let order = { id: docSnap.id, ...docSnap.data(), orderId: docSnap.id };
        // Fetch restaurant details for each order (similar to your Java logic)
        try {
          const resDoc = await getDocs(query(
            collection(db, "FoodPlaces"), 
            where("name", "==", order.restaurantName) // Assuming restaurantName is available in order doc
          ));
          if (!resDoc.empty) {
            order.restaurantName = resDoc.docs[0].data().name;
          } else {
            // Fallback: If restaurantName is not in the order doc, use the ID 
            // and assume it's the current restaurant
            if (order.restaurantId === restaurantId) {
                order.restaurantName = "Your Restaurant";
            } else {
                order.restaurantName = "Unknown/Other Restaurant";
            }
          }
        } catch (e) {
            console.error("Error fetching restaurant details:", e);
            order.restaurantName = "Error Loading Name";
        }
        fetchedOrders.push(order);
      }
      setOrders(fetchedOrders);
      setIsLoading(false);
    }, (error) => {
      console.error("Error loading orders:", error);
      setError(`Error loading orders: ${error.message}`);
      setIsLoading(false);
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, [restaurantId]);
  
  // --- 3. Order Actions ---

  // Equivalent to acceptOrder(String orderId)
  const acceptOrder = async (orderId) => {
    const orderDocRef = doc(db, "orders", orderId);
    
    try {
      // Use Firestore Transaction for atomic update
      const totalPrepTimeMinutes = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(orderDocRef);
        
        if (!snapshot.exists()) {
          throw new Error("Order does not exist");
        }
        
        const totalPrepTimeMinutes = snapshot.data().totalPrepTime;
        if (totalPrepTimeMinutes == null) {
          throw new Error("Total prep time is missing");
        }
        
        transaction.update(orderDocRef, {
          approvalStatus: "accepted",
          startTime: serverTimestamp(),
        });
        
        return totalPrepTimeMinutes;
      });

      // After successful transaction, calculate and set endTime
      // Note: We need a slight delay to ensure 'startTime' is set and readable
      // In a more robust system, you might use a Cloud Function for this.
      // For now, we fetch the updated doc immediately after the transaction.
      const updatedSnapshot = await transaction.get(orderDocRef); // Re-fetch
      const startTime = updatedSnapshot.data().startTime;
        
      if (startTime) {
        // Calculate endTime in milliseconds, then convert to Firestore Timestamp (if needed)
        // Since Firestore serverTimestamp is more reliable, we'll calculate the value
        // based on the document's startTime. In web/JS, this is simpler:
        const startTimeMs = startTime.toMillis();
        const endTimeMs = startTimeMs + (totalPrepTimeMinutes * 60 * 1000); // Minutes to milliseconds
        
        // Update with the calculated end time
        await updateDoc(orderDocRef, {
          endTime: new Date(endTimeMs) // Firestore converts Date objects to Timestamps
        });
        
        Swal.fire('Accepted!', 'Order has been successfully accepted.', 'success');
      } else {
        throw new Error("Failed to retrieve server start time.");
      }
      
    } catch (e) {
      console.error("Failed to accept order:", e);
      Swal.fire('Error', `Failed to accept order: ${e.message}`, 'error');
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
      {/* Background Image (Matching your XML) */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          // Use a dummy image URL for the web version, replace with your actual asset
          backgroundImage: 'url(/background4.jpg)', 
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      <div className="relative z-10 p-6 max-w-4xl mx-auto">
        {/* Header (Matching your TextView) */}
        <div className="text-center mb-8 mt-4">
          <h1 className="text-4xl font-bold text-gray-800 drop-shadow-sm">
            <ClipboardList className="inline w-10 h-10 mr-2 text-orange-600" />
            Order Management
          </h1>
        </div>
        
        {/* RecyclerView Equivalent */}
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
      </div>
    </div>
  );
}
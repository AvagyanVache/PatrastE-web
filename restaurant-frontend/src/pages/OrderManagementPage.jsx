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
  orderBy 
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2'; 
import { Clock, Loader2, ClipboardList } from 'lucide-react';

export default function OrderManagementPage() {
  const { user } = useAuth();
  const [allCurrentOrders, setAllCurrentOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [orderHistory, setOrderHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [restaurantId, setRestaurantId] = useState(null);
  const [currentOrderFilter, setCurrentOrderFilter] = useState('pendingApproval'); 
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
const [filteredCurrentOrders, setFilteredCurrentOrders] = useState([]);

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

  useEffect(() => {
    if (!restaurantId) return;

    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef,
      where("restaurantId", "==", restaurantId),
      where("approvalStatus", "in", ["pendingApproval", "accepted"])
    );

   const unsubscribe = onSnapshot(q, (snapshot) => {
        fetchOrdersAndFilter(true); 
    }, (error) => {
        console.error("Listener error:", error);
    });

    return () => unsubscribe();
},[restaurantId]);
  
const loadOrderHistory = () => {
    fetchOrdersAndFilter(false); 
};
useEffect(() => {
    if (restaurantId) {
        fetchOrdersAndFilter(false); 
    }
}, [restaurantId]);
useEffect(() => {
    if (activeTab === 'pending') {
        const filtered = allCurrentOrders.filter(order => order.approvalStatus === currentOrderFilter);
        setFilteredCurrentOrders(filtered);
    }
}, [allCurrentOrders, activeTab, currentOrderFilter]); 
  const acceptOrder = async (orderId) => {
  const orderDocRef = doc(db, "orders", orderId);

  try {
    let totalPrepTimeMinutes = 0;

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(orderDocRef);

      if (!snapshot.exists()) {
        throw new Error("Order does not exist");
      }

      totalPrepTimeMinutes = snapshot.data().totalPrepTime;
      if (totalPrepTimeMinutes == null) {
        throw new Error("Total prep time is missing or null");
      }

      transaction.update(orderDocRef, {
        approvalStatus: "accepted",
        startTime: serverTimestamp(),
      });
      
      return totalPrepTimeMinutes; 
    });

    const updatedSnapshot = await getDoc(orderDocRef);
    const startTimeTimestamp = updatedSnapshot.data()?.startTime;
    
    if (startTimeTimestamp) {
      const startTimeMs = startTimeTimestamp.toMillis();
      const totalPrepTimeMs = totalPrepTimeMinutes * 60 * 1000; 
      const endTimeMs = startTimeMs + totalPrepTimeMs;

      await updateDoc(orderDocRef, {
        endTime: new Date(endTimeMs) 
      });

      Swal.fire('Accepted!', `Order #${orderId.substring(0, 8)} accepted. End time calculated.`, 'success');
      
    } else {
      throw new Error("Server start time was null after transaction success.");
    }

  } catch (e) {
    console.error("Failed to accept order:", e);
    Swal.fire('Error', `Failed to accept order. Check console for details.`, 'error');
  }
};
const declineOrder = async (orderId) => {
    const { value: formValues } = await Swal.fire({
      title: 'Select Reason for Declining',
      html: `
        <select id="swal-select" class="swal2-select" style="display: flex; width: 100%;">
          <option value="" disabled selected>Select a reason</option>
          <option value="Out of stock">Out of stock</option>
          <option value="Kitchen overload">Kitchen overload</option>
          <option value="Order not feasible">Order not feasible</option>
          <option value="Other">Other (Specify)</option>
        </select>
        <textarea id="swal-input-text" class="swal2-textarea" placeholder="Specify your reason here..." style="display: none;"></textarea>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Submit Decline',
      confirmButtonColor: '#ea580c',
      cancelButtonColor: '#6b7280',
      didOpen: () => {
        const select = Swal.getPopup().querySelector('#swal-select');
        const textarea = Swal.getPopup().querySelector('#swal-input-text');
        
        // Show textarea only when "Other" is selected
        select.onchange = () => {
          if (select.value === 'Other') {
            textarea.style.display = 'flex';
          } else {
            textarea.style.display = 'none';
          }
        };
      },
      preConfirm: () => {
        const selectValue = document.getElementById('swal-select').value;
        const textValue = document.getElementById('swal-input-text').value;

        if (!selectValue) {
          Swal.showValidationMessage('Please select a reason');
          return false;
        }
        if (selectValue === 'Other' && !textValue) {
          Swal.showValidationMessage('Please specify the "Other" reason');
          return false;
        }
        
        return selectValue === 'Other' ? textValue : selectValue;
      }
    });

    if (formValues) {
      const finalReason = formValues;
      const orderDocRef = doc(db, "orders", orderId);
      
      try {
        await updateDoc(orderDocRef, {
          approvalStatus: "declined",
          declineReason: finalReason,
        });

        Swal.fire({
          title: 'Order Declined',
          text: `Reason: ${finalReason}`,
          icon: 'info',
          confirmButtonColor: '#ea580c',
          timer: 2000
        });

        // Delay deletion so user/system can process the status change
        setTimeout(async () => {
          try {
            await deleteDoc(orderDocRef);
          } catch (e) {
            console.error("Cleanup error:", e);
          }
        }, 2000);
      } catch (e) {
        Swal.fire('Error', e.message, 'error');
      }
    }
  };
  const fetchOrderData = async (docSnap) => {
    let order = { id: docSnap.id, ...docSnap.data(), orderId: docSnap.id };
    
    const customerId = order.userId;
    if (customerId) {
        try {
            const customerDoc = await getDoc(doc(db, "users", customerId));
            if (customerDoc.exists()) {
                const customerData = customerDoc.data();
                order.customerName = customerData.name || "Unknown Customer";
                order.customerPhone = customerData.phoneNumber || "N/A";
                order.customerEmail = customerData.email || "N/A";
            }
        } catch (e) {
            console.error("Error fetching customer details:", e);
        }
    }
    
    order.restaurantAddress = order.selectedAddress || "Location Not Available";

if (order.restaurantId) {
    try {
        const resDoc = await getDoc(doc(db, "FoodPlaces", order.restaurantId));
        if (resDoc.exists()) {
            const resData = resDoc.data();
            order.restaurantName = resData.name || "N/A";
        }
    } catch (e) {
        console.error("Error fetching restaurant details:", e);
    }
}


    
    return order;
};


const fetchOrdersAndFilter = async (isCurrentOrders) => {
    if (!restaurantId) return;

    if (isCurrentOrders) {
        setIsLoading(true);
    } else {
        setHistoryLoading(true);
    }

    try {
       const serverTimeDocRef = doc(db, "serverTime", "current");
        await updateDoc(serverTimeDocRef, { timestamp: serverTimestamp() });
        const serverTimeDoc = await getDoc(serverTimeDocRef);
        const currentTimestamp = serverTimeDoc.data()?.timestamp;

        if (!currentTimestamp) {
             throw new Error("Failed to fetch accurate server timestamp.");
        }
        
        const currentTimeSeconds = currentTimestamp.seconds;

        const ordersRef = collection(db, "orders");
        
        const q = query(
            ordersRef,
            where("restaurantId", "==", restaurantId),
            where("approvalStatus", "in", ["pendingApproval", "accepted"]),
            orderBy("startTime", "desc") 
        );

       const querySnapshot = await getDocs(q);
        const ongoingOrders = [];
        const historicalOrders = [];

       for (const docSnap of querySnapshot.docs) {
            const order = await fetchOrderData(docSnap);
            
            const endTimeTimestamp = order.endTime;
            const endTimeSeconds = endTimeTimestamp ? endTimeTimestamp.seconds : Number.MAX_SAFE_INTEGER; 
            const isOngoing = endTimeSeconds > currentTimeSeconds;

            if (isOngoing) {
                ongoingOrders.push(order);
            } else {
                historicalOrders.push(order);
            }
        
        }
setAllCurrentOrders(ongoingOrders); 
setFilteredCurrentOrders(ongoingOrders.filter(order => order.approvalStatus === currentOrderFilter)); 
setOrderHistory(historicalOrders);
      } catch (error) {
        console.error("Error loading orders:", error);
    } finally {
        if (isCurrentOrders) {
            setIsLoading(false);
        } else {
            setHistoryLoading(false);
        }
    }
};
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
      <div 
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage: 'url(/background4.jpg)', 
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      <div className="relative z-10 p-6 max-w-4xl mx-auto">
        <div className="text-center mb-8 mt-4">
          <h1 className="text-4xl font-bold text-gray-800 drop-shadow-sm">
            <ClipboardList className="inline w-10 h-10 mr-2 text-orange-600" />
            Order Management
          </h1>
        </div>

       <div className="flex justify-center mb-6 bg-white p-2 rounded-xl shadow-md">
            <button
                onClick={() => setActiveTab('pending')}
                className={`px-8 py-3 text-lg font-bold rounded-l-lg transition-colors ${
                    activeTab === 'pending' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
                Current Orders ({allCurrentOrders.length})
            </button>
            <button
                onClick={() => { setActiveTab('history'); loadOrderHistory(); }} 
                className={`px-8 py-3 text-lg font-bold rounded-r-lg transition-colors ${
                    activeTab === 'history' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
                Order History ({orderHistory.length})
            </button>
        </div>
        
    {activeTab === 'pending' && (
            <div className="space-y-4">
                <div className="flex justify-start mb-6 bg-white p-1 rounded-xl shadow-md border border-gray-100">
                    <button
                        onClick={() => setCurrentOrderFilter('pendingApproval')}
                        className={`px-4 py-2 text-md font-semibold transition-colors rounded-lg ${
                            currentOrderFilter === 'pendingApproval' 
                                ? 'bg-red-500 text-white shadow-inner' 
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        Waiting for Approval ({allCurrentOrders.filter(o => o.approvalStatus === 'pendingApproval').length})
                    </button>
                    <button
                        onClick={() => setCurrentOrderFilter('accepted')}
                        className={`px-4 py-2 text-md font-semibold transition-colors rounded-lg ${
                            currentOrderFilter === 'accepted' 
                                ? 'bg-green-500 text-white shadow-inner' 
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        Accepted Orders ({allCurrentOrders.filter(o => o.approvalStatus === 'accepted').length})
                    </button>
                </div>

              {filteredCurrentOrders.length === 0 ? (
                <div className="text-center mt-10 p-10 bg-white rounded-xl shadow-lg border-t-4 border-green-500">
                  <p className="text-3xl font-bold text-green-600 mb-2">🎉 No {currentOrderFilter === 'pendingApproval' ? 'Orders Waiting' : 'Accepted Orders'}</p>
                  <p className="text-gray-600">You're all caught up!</p>
                </div>
              ) : (
             filteredCurrentOrders.map((order) => (
              <OrderItem 
                key={order.id} 
                order={order} 
                onAccept={order.approvalStatus === 'pendingApproval' ? acceptOrder : null} 
                onDecline={declineOrder} 
              />
            ))
              )}
            </div>
        )}

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
                            onAccept={null} 
                            onDecline={null} 
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
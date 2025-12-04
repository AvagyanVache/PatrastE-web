// src/components/OrderItem.jsx
import React from 'react';
import { Clock, DollarSign, MapPin, Check, X, Phone, Mail, User, ListChecks } from 'lucide-react';
import { format } from 'date-fns'; // Import date-fns for easy formatting

export default function OrderItem({ order, onAccept, onDecline }) {
  const orderId = order.orderId.substring(0, 8); // Shorten ID for display
  const itemsArray = order.items ? Object.values(order.items) : []; // Convert item object to array
  const isPending = order.approvalStatus === "pendingApproval";
  const isHistory = !isPending;

  // Function to format timestamps (if needed for history)
  const formatTimestamp = (timestamp) => {
      if (timestamp && timestamp.toDate) {
          return format(timestamp.toDate(), 'MMM dd, yyyy h:mm a');
      }
      return 'N/A';
  };
  
  // Conditional styling for history status
  const statusColor = {
      'accepted': 'border-green-500 bg-green-50',
      'declined': 'border-red-500 bg-red-50',
      'pendingApproval': 'border-orange-500 bg-white-50',
  }[order.approvalStatus] || 'border-gray-500 bg-gray-50';

  const statusText = {
      'accepted': 'Accepted',
      'declined': 'Declined',
      'pendingApproval': 'Pending Approval',
  }[order.approvalStatus] || 'Unknown Status';


  return (
    <div className={`shadow-lg rounded-xl p-5 border-l-8 ${statusColor} hover:shadow-xl transition-shadow mb-4`}>
      <div className="flex justify-between items-start mb-3 border-b pb-2">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Order ID: #{orderId}</h3>
          <p className="text-sm text-gray-500 flex items-center mt-1">
            <MapPin className="w-4 h-4 mr-1 text-red-500" /> 
            {order.restaurantName || 'Loading Restaurant...'}
          </p>
          {/* Display Restaurant Location (Address) */}
          <p className="text-xs text-gray-400 ml-5 mt-1">
            {order.restaurantAddress || 'Location Not Available'}
          </p>
        </div>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${isPending ? 'text-red-600 bg-red-100' : 'text-blue-600 bg-blue-100'}`}>
          {statusText}
        </span>
      </div>

      {/* Customer Details */}
      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-gray-600 text-sm border-b pb-3 mb-3">
        <p className="col-span-2 text-base font-semibold text-gray-700 flex items-center">
            <User className="w-4 h-4 mr-2" /> Customer Details
        </p>
        <p className="flex items-center gap-2">
          <span className="font-medium">Name:</span> {order.customerName || 'N/A'}
        </p>
        <p className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-blue-600" />
          {order.customerPhone || 'N/A'}
        </p>
        <p className="flex items-center gap-2 col-span-2">
          <Mail className="w-4 h-4 text-blue-600" />
          {order.customerEmail || 'N/A'}
        </p>
      </div>

      {/* Order Summary & Items List */}
      <div className="border-b pb-3 mb-3">
        <p className="text-base font-semibold text-gray-700 mb-2 flex items-center">
            <ListChecks className="w-4 h-4 mr-2" /> Items Breakdown
        </p>
        <ul className="space-y-1 text-sm pl-4">
          {itemsArray.map((item, index) => (
            <li key={index} className="flex justify-between border-b border-gray-100 pb-1">
              <span className="font-medium">
                {item.itemCount || item.quantity}x {item.name}
              </span>
              <span className="text-gray-500">${(item.price * (item.itemCount || item.quantity || 1)).toFixed(2)}</span>
            </li>
          ))}
          <li className="flex justify-between pt-2 text-base font-bold text-orange-600">
            <span>TOTAL:</span>
            <span>${order.totalPrice ? order.totalPrice.toFixed(2) : 'N/A'}</span>
          </li>
        </ul>
      </div>

      {/* Time & History Details */}
      <p className="flex items-center gap-2 text-sm font-medium mt-3">
        <Clock className="w-4 h-4 text-blue-600" /> 
        {isPending ? (
            <span>Estimated Preparation Time: {order.totalPrepTime || 'N/A'} min</span>
        ) : (
            <span>
                Start Time: {formatTimestamp(order.startTime)} 
                {order.endTime && ` | End Time: ${formatTimestamp(order.endTime)}`}
            </span>
        )}
      </p>

      {/* Decline Reason for History */}
      {order.approvalStatus === 'declined' && order.declineReason && (
          <p className="text-sm font-medium mt-2 p-2 bg-red-100 text-red-700 rounded-md">
              **Decline Reason:** {order.declineReason}
          </p>
      )}

      {/* Action Buttons: Only show if onAccept/onDecline are provided (i.e., for pending orders) */}
      {onAccept && onDecline && (
        <div className="mt-4 pt-4 border-t flex space-x-3">
          <button
            onClick={() => onAccept(order.orderId)}
            className="flex-1 bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-1"
          >
            <Check className="w-5 h-5" /> Accept
          </button>
          <button
            onClick={() => onDecline(order.orderId)}
            className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-1"
          >
            <X className="w-5 h-5" /> Decline
          </button>
        </div>
      )}
    </div>
  );
}
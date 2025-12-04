// src/components/OrderItem.jsx
import React from 'react';
import { Clock, DollarSign, MapPin, Check, X } from 'lucide-react';

export default function OrderItem({ order, onAccept, onDecline }) {
  const orderId = order.orderId.substring(0, 8); // Shorten ID for display
  const totalItems = order.items ? Object.values(order.items).reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;
  
  return (
    <div className="bg-white shadow-lg rounded-xl p-5 border-l-8 border-purple-500 hover:shadow-xl transition-shadow mb-4">
      <div className="flex justify-between items-start mb-3 border-b pb-2">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Order ID: #{orderId}</h3>
          <p className="text-sm text-gray-500 flex items-center mt-1">
            <MapPin className="w-4 h-4 mr-1" /> 
            {order.restaurantName || 'Loading Restaurant...'}
          </p>
        </div>
        <span className="text-sm font-semibold text-red-600 bg-red-100 px-3 py-1 rounded-full">
          Pending Approval
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-gray-600 text-sm">
        <p className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-600" />
          <span className="font-medium">Total:</span> ${order.totalPrice ? order.totalPrice.toFixed(2) : 'N/A'}
        </p>
        <p className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          <span className="font-medium">Prep Time:</span> {order.totalPrepTime || 'N/A'} mins
        </p>
        <p className="col-span-2">
          <span className="font-medium">Customer:</span> {order.customerName || 'Unknown'}
        </p>
        <p className="col-span-2">
          <span className="font-medium">Items:</span> {totalItems} total
          {/* You might want a modal or dropdown to show individual items */}
        </p>
      </div>

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
    </div>
  );
}
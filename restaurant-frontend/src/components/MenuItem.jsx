// src/components/MenuItem.jsx
import React from 'react';

export const MenuItem = ({ item, onEdit, onDelete }) => {
  return (
    <div className="menu-item-card">
      <img src={item.itemImg} alt={item.itemName} className="item-image" />
      <div className="item-details">
        <h3>{item.itemName}</h3>
        <p>Price: ${item.itemPrice}</p>
        <p>Prep Time: {item.prepTime} min</p>
        <p>Status: {item.isAvailable ? 'Available' : 'Unavailable'}</p>
      </div>
      <div className="item-actions">
        <button onClick={() => onEdit(item)}>Edit</button>
        <button onClick={() => onDelete(item.documentId, item.itemImg)}>Delete</button>
      </div>
    </div>
  );
};
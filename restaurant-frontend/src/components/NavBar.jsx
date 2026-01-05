import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Utensils, ClipboardList, User } from 'lucide-react'; 
export default function NavBar() {
  const location = useLocation();

  const navItems = [
    { name: 'Menu Management', path: '/restaurant-dashboard', icon: Utensils },
    { name: 'Order Management', path: '/orders', icon: ClipboardList },
    { name: 'Profile', path: '/profile', icon: User }, 
  ];

  const getActivePath = (currentPath) => {
    if (currentPath === '/') return '/restaurant-dashboard';
    return currentPath;
  };

  const currentPath = getActivePath(location.pathname);

  return (
    <nav className="bg-white shadow-lg fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-orange-600">PatrastE</span>
          </div>
          <div className="flex items-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  (item.path === '/restaurant-dashboard' && currentPath === item.path) || currentPath.startsWith(item.path)
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                <item.icon className="w-5 h-5 mr-1" />
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
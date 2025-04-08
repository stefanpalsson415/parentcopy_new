// src/components/shared/MobileNavigation.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const MobileNavigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const toggleMenu = () => setIsOpen(!isOpen);

  const navigateTo = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div className="md:hidden">
      <button 
        onClick={toggleMenu}
        className="p-2 focus:outline-none"
        aria-label="Toggle navigation menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="flex justify-end p-4">
            <button onClick={toggleMenu} className="p-2">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex flex-col items-center space-y-6 pt-4">
            <button 
              onClick={() => navigateTo('/how-it-works')}
              className="text-lg font-medium px-4 py-2"
            >
              How It Works
            </button>
            <button
              onClick={() => navigateTo('/about-us')}
              className="text-lg font-medium px-4 py-2"
            >
              About Us
            </button>
            <button 
              onClick={() => navigateTo('/family-command-center')}
              className="text-lg font-medium px-4 py-2"
            >
              Family Command Center
            </button>
            <button 
              onClick={() => navigateTo('/ai-assistant')}
              className="text-lg font-medium px-4 py-2"
            >
              AI Assistant
            </button>
            <button 
              onClick={() => navigateTo('/family-memory')}
              className="text-lg font-medium px-4 py-2"
            >
              Family Memory
            </button>
            <button 
              onClick={() => navigateTo('/blog')}
              className="text-lg font-medium px-4 py-2"
            >
              Blog
            </button>
            
            <div className="pt-6">
              {currentUser ? (
                <button 
                  onClick={() => navigateTo('/login', { state: { directAccess: true } })}
                  className="w-full px-6 py-3 bg-black text-white rounded"
                >
                  Jump Back In
                </button>
              ) : (
                <div className="flex flex-col space-y-4">
                  <button 
                    onClick={() => navigateTo('/login')}
                    className="w-full px-6 py-3 border border-gray-800 rounded"
                  >
                    Log In
                  </button>
                  <button 
                    onClick={() => navigateTo('/onboarding')}
                    className="w-full px-6 py-3 bg-black text-white rounded"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileNavigation;
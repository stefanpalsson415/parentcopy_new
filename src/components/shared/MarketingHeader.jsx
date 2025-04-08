// src/components/shared/MarketingHeader.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const MarketingHeader = ({ activeLink = null, links = [] }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Default navigation links if none provided
  const defaultLinks = [
    { text: 'How It Works', path: '/how-it-works' },
    { text: 'About Us', path: '/about-us' },
    { text: 'Family Command Center', path: '/family-command-center' },
    { text: 'AI Assistant', path: '/ai-assistant' },
    { text: 'Family Memory', path: '/family-memory' },
    { text: 'Blog', path: '/blog' }
  ];

  // Use provided links or defaults
  const navLinks = links.length > 0 ? links : defaultLinks;
  
  return (
    <header className="px-6 py-4 border-b bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <h1 
          className="text-3xl font-light cursor-pointer" 
          onClick={() => navigate('/')}
        >
          Allie
        </h1>
        
        {/* Mobile menu button */}
        <div className="md:hidden">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        
        {/* Desktop navigation */}
        <nav className="hidden md:flex space-x-8">
          {navLinks.map((link, index) => (
            <button 
              key={index}
              onClick={() => navigate(link.path)}
              className={`${
                activeLink === link.path 
                  ? "text-black font-medium border-b-2 border-black" 
                  : "text-gray-800 hover:text-blue-600 hover:underline transition-colors"
              }`}
            >
              {link.text}
            </button>
          ))}
          
          {currentUser ? (
            <button 
              onClick={() => navigate('/login', { state: { directAccess: true, fromLanding: true } })}
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
            >
              Jump Back In
            </button>
          ) : (
            <>
              <button 
                onClick={() => navigate('/login')}
                className="px-4 py-2 border border-gray-800 rounded hover:bg-gray-100"
              >
                Log In
              </button>
              <button 
                onClick={() => navigate('/onboarding')}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
              >
                Sign Up
              </button>
            </>
          )}
        </nav>
      </div>
      
      {/* Mobile menu (full screen) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white md:hidden">
          <div className="flex justify-between p-4">
            <h1 className="text-2xl font-light">Allie</h1>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex flex-col items-center space-y-5 pt-4">
            {navLinks.map((link, index) => (
              <button 
                key={index}
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate(link.path);
                }}
                className={`text-lg px-4 py-2 ${
                  activeLink === link.path 
                    ? "font-medium text-black" 
                    : "text-gray-700"
                }`}
              >
                {link.text}
              </button>
            ))}
            
            <div className="pt-6 w-full px-8 space-y-4">
              {currentUser ? (
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login', { state: { directAccess: true, fromLanding: true } });
                  }}
                  className="w-full px-6 py-3 bg-black text-white rounded"
                >
                  Jump Back In
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/login');
                    }}
                    className="w-full px-6 py-3 border border-gray-800 rounded"
                  >
                    Log In
                  </button>
                  <button 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/onboarding');
                    }}
                    className="w-full px-6 py-3 bg-black text-white rounded"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default MarketingHeader;
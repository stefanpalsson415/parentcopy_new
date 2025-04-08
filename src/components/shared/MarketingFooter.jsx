// src/components/shared/MarketingFooter.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const MarketingFooter = () => {
  const navigate = useNavigate();
  
  // Group footer links for better organization
  const footerGroups = [
    {
      title: "Product",
      links: [
        { text: "How It Works", path: "/how-it-works" },
        { text: "Family Command Center", path: "/family-command-center" },
        { text: "AI Assistant", path: "/ai-assistant" },
        { text: "Family Memory", path: "/family-memory" }
      ]
    },
    {
      title: "Company",
      links: [
        { text: "About Us", path: "/about-us" },
        { text: "Blog", path: "/blog" }
      ]
    },
    {
      title: "Account",
      links: [
        { text: "Log In", path: "/login" },
        { text: "Sign Up", path: "/onboarding" }
      ]
    }
  ];

  return (
    <footer className="px-6 py-8 md:py-12 bg-gray-50 border-t">
      <div className="max-w-6xl mx-auto">
        <div>
          {/* Brand and tagline - shown at top on mobile, left column on desktop */}
          <div className="mb-8 md:mb-0">
            <h2 className="text-2xl font-light mb-3">Allie</h2>
            <p className="text-gray-600 mb-8 md:mb-0">Balancing family responsibilities together</p>
          </div>
          
          {/* Footer navigation links - grid with 2 columns on mobile, 3 columns on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            {footerGroups.map((group, groupIndex) => (
              <div key={groupIndex} className={`${group.title === 'Company' && 'col-span-2 sm:col-span-1'}`}>
                <h3 className="text-gray-800 font-medium mb-4">{group.title}</h3>
                <ul className="space-y-2">
                  {group.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <button
                        onClick={() => navigate(link.path)}
                        className="text-gray-600 hover:text-gray-900 font-light"
                      >
                        {link.text}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        
        {/* Copyright notice - always at bottom */}
        <div className="mt-8 pt-8 border-t text-center text-gray-500 text-sm">
          <p>© 2025 Allie. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default MarketingFooter;
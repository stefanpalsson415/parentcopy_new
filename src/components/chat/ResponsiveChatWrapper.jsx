// src/components/chat/ResponsiveChatWrapper.jsx
import React, { useState, useEffect } from 'react';
import AllieChat from './AllieChat';
import MobileResponsiveUI from './MobileResponsiveUI';

/**
 * ResponsiveChatWrapper - Provides responsive UI for Allie Chat
 * Detects mobile devices and renders a mobile-optimized experience
 */
const ResponsiveChatWrapper = () => {
  const [isMobileView, setIsMobileView] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  // Detect mobile and standalone mode on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      // Check if mobile based on screen width or user agent
      const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      
      setIsMobileView(isMobileDevice || isSmallScreen);
      
      // Check if running as installed PWA
      setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || 
                     window.navigator.standalone === true);
    };
    
    // Run initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // If mobile view, render mobile-optimized UI
  if (isMobileView) {
    return (
      <MobileResponsiveUI isStandalone={isStandalone} />
    );
  }
  
  // On desktop, render regular AllieChat
  return <AllieChat />;
};

export default ResponsiveChatWrapper;
// src/components/common/GoogleAuthButton.jsx
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const GoogleAuthButton = ({ onSuccess, buttonText = "Sign in with Google", parentRole = null }) => {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const user = await signInWithGoogle();
      if (user && onSuccess) {
        onSuccess(user, parentRole);
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      setError(error.message || "Failed to sign in with Google");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div>
      <button
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="w-full flex items-center justify-center rounded-md p-2 font-roboto 
          bg-white border border-gray-300 hover:bg-gray-50"
      >
        {isLoading ? (
          <div className="mr-2 w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" fill="#4285F4"/>
          </svg>
        )}
        {buttonText}
      </button>
      
      {error && (
        <p className="text-red-500 text-xs mt-1 font-roboto">{error}</p>
      )}
    </div>
  );
};

export default GoogleAuthButton;
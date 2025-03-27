import React from 'react';
import GoogleAuthButton from './GoogleAuthButton';
import { Mail, Key } from 'lucide-react';

const AuthOptions = ({ 
  onGoogleSuccess, 
  onEmailSelect, 
  email = '', 
  password = '', 
  onEmailChange, 
  onPasswordChange,
  showEmailForm = false,
  onSubmitEmail = null,
  isLoading = false,
  error = ''
}) => {
  return (
    <div className="space-y-4">
      <GoogleAuthButton 
        onSuccess={onGoogleSuccess} 
        buttonText="Sign in with Google"
      />
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500 font-roboto">or use email</span>
        </div>
      </div>
      
      {showEmailForm ? (
        <form onSubmit={onSubmitEmail}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">Email</label>
              <div className="flex border rounded-md overflow-hidden">
                <div className="bg-gray-100 p-2 flex items-center justify-center">
                  <Mail size={18} className="text-gray-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={onEmailChange}
                  className="flex-1 p-2 focus:outline-none font-roboto"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">Password</label>
              <div className="flex border rounded-md overflow-hidden">
                <div className="bg-gray-100 p-2 flex items-center justify-center">
                  <Key size={18} className="text-gray-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={onPasswordChange}
                  className="flex-1 p-2 focus:outline-none font-roboto"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>
            
            {error && (
              <p className="text-red-500 text-sm font-roboto">{error}</p>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-black text-white rounded-md hover:bg-gray-800 flex items-center justify-center font-roboto"
            >
              {isLoading ? (
                <>
                  <div className="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing in...
                </>
              ) : (
                'Sign in with Email'
              )}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={onEmailSelect}
          className="w-full py-2 border border-gray-300 rounded-md flex items-center justify-center font-roboto hover:bg-gray-50"
        >
          <Mail size={18} className="mr-2" />
          Continue with Email
        </button>
      )}
    </div>
  );
};

export default AuthOptions;
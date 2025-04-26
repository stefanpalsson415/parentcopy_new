import React, { useState } from 'react';
import { ArrowRight, Lock } from 'lucide-react';

const PasswordProtection = ({ onCorrectPassword, correctPassword = "changetheworld" }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (password === correctPassword) {
      onCorrectPassword();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <Lock className="text-blue-600" size={32} />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-2">Investor Access</h1>
        <p className="text-gray-600 text-center mb-6">
          Enter the password to access the investor presentation.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full p-3 border rounded ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              placeholder="Enter password"
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm mt-1">Incorrect password. Please try again.</p>
            )}
          </div>
          
          <button
            type="submit"
            className="w-full py-3 bg-black text-white rounded-md hover:bg-gray-800 flex items-center justify-center"
          >
            Continue
            <ArrowRight size={16} className="ml-2" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordProtection;
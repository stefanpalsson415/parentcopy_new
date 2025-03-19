import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-6">
        <h2 className="text-2xl font-bold mb-4">Analyzing your responses...</h2>
        <div className="relative w-64 h-2 bg-gray-200 rounded-full overflow-hidden mx-auto">
          <div className="absolute top-0 left-0 h-full bg-blue-500 animate-pulse" style={{ width: '75%' }} />
          <div className="absolute top-0 left-0 h-full bg-blue-600 animate-loading" style={{ width: '40%' }} />
        </div>
        <p className="text-gray-600 mt-4">This will just take a moment</p>
        
        <div className="mt-8 max-w-md mx-auto">
          <p className="text-sm text-gray-500 italic">
            "Balancing family responsibilities leads to happier families and stronger relationships."
          </p>
        </div>
      </div>
      
      <style jsx="true">{`
        @keyframes loading {
          0% {
            left: -40%;
          }
          100% {
            left: 100%;
          }
        }
        
        .animate-loading {
          animation: loading 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
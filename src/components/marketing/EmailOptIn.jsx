import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowRight } from 'lucide-react';
import DatabaseService from '../../services/DatabaseService';

const EmailOptIn = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Save email subscription
      await DatabaseService.saveEmailForUpdates(email);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error saving email subscription:", error);
      alert('There was an error subscribing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-6">
          <Mail className="text-purple-600" size={32} />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-2">Stay Connected</h1>
        
        {isSubmitted ? (
          <div className="text-center">
            <p className="text-gray-600 mb-6">
              Thank you for subscribing! We'll send you weekly tips on improving family balance.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 inline-flex items-center"
            >
              Return to Homepage
              <ArrowRight size={16} className="ml-2" />
            </button>
          </div>
        ) : (
          <>
            <p className="text-gray-600 text-center mb-6">
              Not ready to start your Allie journey? Subscribe to our weekly balance tips to get helpful advice in your inbox.
            </p>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border rounded"
                  placeholder="youremail@example.com"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-black text-white rounded-md hover:bg-gray-800"
              >
                {isSubmitting ? 'Subscribing...' : 'Get Weekly Balance Tips'}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-800 text-sm"
              >
                No thanks, return to homepage
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailOptIn;
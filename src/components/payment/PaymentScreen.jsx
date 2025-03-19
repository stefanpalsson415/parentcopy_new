import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const PaymentScreen = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [couponCode, setCouponCode] = useState('');
    const [couponApplied, setCouponApplied] = useState(false);
    const [discount, setDiscount] = useState(0);
    
    const navigate = useNavigate();
    const location = useLocation();
    const [pendingFamilyData, setPendingFamilyData] = useState(null);
    const { createFamily } = useAuth();
    
    // Effect to load pending family data
    useEffect(() => {
      // Check for data passed in location state
      if (location?.state?.familyData) {
        setPendingFamilyData(location.state.familyData);
      } 
      // Check for data in localStorage
      else {
        const storedData = localStorage.getItem('pendingFamilyData');
        if (storedData) {
          try {
            setPendingFamilyData(JSON.parse(storedData));
          } catch (e) {
            console.error("Error parsing stored family data:", e);
          }
        }
      }
    }, [location]);
    
    const handleSubmit = async (event) => {
      event.preventDefault();
      setLoading(true);
      
      try {
        // Check if coupon code is valid
        if (couponCode === 'olytheawesome' || couponCode.toLowerCase() === 'stefan') {
          // Skip payment process and proceed directly
          console.log('Free coupon applied');
          setCouponApplied(true);
          
          // Instead of trying to create the family right here,
          // store the information and navigate to signup for confirmation
          if (pendingFamilyData) {
            // Store a flag indicating payment is complete
            localStorage.setItem('paymentCompleted', 'true');
            
            console.log("Payment completed, navigating to signup for confirmation");
            // Navigate to signup for final confirmation
            navigate('/signup', { 
              state: { 
                fromPayment: true,
                familyData: pendingFamilyData 
              } 
            });
          } else {
            console.error("No pending family data available");
            setError("Missing family information. Please try again.");
          }
          return;
        }
        
        // Regular payment processing would happen here
        // ...
        
        // After successful payment, navigate to signup for confirmation
        if (pendingFamilyData) {
          localStorage.setItem('paymentCompleted', 'true');
          
          navigate('/signup', { 
            state: { 
              fromPayment: true,
              familyData: pendingFamilyData 
            } 
          });
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error("Error in payment processing:", error);
        setError("An error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    };
  
    const applyCoupon = () => {
      if (couponCode === 'olytheawesome') {
        setCouponApplied(true);
      } else {
        setError('Invalid coupon code');
      }
    };
  
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow">
          <h2 className="text-3xl font-light mb-6">Subscribe to Allie</h2>
          
          <div className="mb-6">
            <p className="text-lg mb-2">$1/month</p>
            <p className="text-gray-600 mb-4">Get full access to all Allie features</p>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="mr-2 text-green-500">✓</span>
                Weekly check-ins for all family members
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-green-500">✓</span>
                AI-powered balance insights
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-green-500">✓</span>
                Family meeting tools and resources
              </li>
            </ul>
          </div>
          
          {couponApplied ? (
  <div className="bg-green-100 p-4 rounded mb-4">
    <p className="text-green-800">Coupon applied successfully! Enjoy Allie at no cost.</p>
    <button
      onClick={() => {
        if (pendingFamilyData) {
          // Store a flag indicating payment is complete
          localStorage.setItem('paymentCompleted', 'true');
          
          // Navigate to signup for final confirmation
          navigate('/signup', { 
            state: { 
              fromPayment: true,
              familyData: pendingFamilyData 
            } 
          });
        } else {
          console.error("No pending family data available");
          setError("Missing family information. Please try again.");
        }
      }}
      className="mt-4 w-full py-3 bg-blue-600 text-white rounded-md"
    >
      Continue to Confirmation
    </button>
  </div>
) : (
  // form code here

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Card Information</label>
                <div className="border rounded p-3">
                  <input 
                    type="text" 
                    className="w-full" 
                    placeholder="Card number" 
                  />
                  <div className="flex mt-2">
                    <input type="text" className="w-1/2 mr-2" placeholder="MM/YY" />
                    <input type="text" className="w-1/2" placeholder="CVC" />
                  </div>
                </div>
              </div>
                  
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Have a coupon?</label>
                <div className="flex">
                  <input
                    type="text"
                    className="flex-1 p-2 border rounded-l"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    placeholder="Enter coupon code"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    className="px-4 py-2 bg-gray-200 rounded-r"
                  >
                    Apply
                  </button>
                </div>
                {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
              </div>
                  
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-md"
              >
                {loading ? 'Processing...' : 'Subscribe - $20/month'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
};

export default PaymentScreen;
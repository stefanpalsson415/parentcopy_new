import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Check, Brain, Shield, Database } from 'lucide-react';



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
    const [selectedPlan, setSelectedPlan] = useState(null);

    
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
        <div className="w-full max-w-4xl bg-white p-8 rounded-lg shadow">
          <h2 className="text-3xl font-light mb-6">Choose Your Allie Plan</h2>
          
          <div className="mb-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-6 hover:shadow-md transition-all">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold">Monthly Plan</h3>
                  <div className="text-3xl font-bold mt-2">$20<span className="text-lg font-normal text-gray-500">/month</span></div>
                  <p className="text-sm text-gray-500 mt-1">Billed monthly</p>
                </div>
                
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <Check size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Full access to all features</span>
                  </li>
                  <li className="flex items-start">
                    <Check size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Unlimited family members</span>
                  </li>
                  <li className="flex items-start">
                    <Check size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Weekly AI recommendations</span>
                  </li>
                  <li className="flex items-start">
                    <Check size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Email progress reports</span>
                  </li>
                  <li className="flex items-start">
                    <Check size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Cancel anytime</span>
                  </li>
                </ul>
                
                <button 
  onClick={() => {
    setSelectedPlan('monthly');
    // Scroll to payment form after a short delay
    setTimeout(() => {
      document.getElementById('payment-details-section')?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  }}
  className={`w-full py-2 ${selectedPlan === 'monthly' ? 'bg-black text-white' : 'bg-gray-200 text-gray-800'} rounded-md hover:bg-gray-800 hover:text-white`}
>
  Select Monthly Plan
</button>
              </div>
              
              <div className="border rounded-lg p-6 hover:shadow-md transition-all relative">
                <div className="absolute top-0 right-0 bg-green-500 text-white py-1 px-3 text-xs transform translate-y-0 rounded-b-md">
                  BEST VALUE
                </div>
                
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold">Annual Plan</h3>
                  <div className="text-3xl font-bold mt-2">$180<span className="text-lg font-normal text-gray-500">/year</span></div>
                  <p className="text-sm text-gray-500 mt-1">$15/month, billed annually</p>
                </div>
                
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <Check size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Everything in monthly plan</span>
                  </li>
                  <li className="flex items-start">
                    <Check size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Save 25% ($60/year)</span>
                  </li>
                  <li className="flex items-start">
                    <Check size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Premium support</span>
                  </li>
                  <li className="flex items-start">
                    <Check size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Advanced progress analytics</span>
                  </li>
                  <li className="flex items-start">
                    <Check size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">30-day money back guarantee</span>
                  </li>
                </ul>
                
                <button 
  onClick={() => {
    setSelectedPlan('annual');
    // Scroll to payment form after a short delay
    setTimeout(() => {
      document.getElementById('payment-details-section')?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  }}
  className={`w-full py-2 ${selectedPlan === 'monthly' ? 'bg-black text-white' : 'bg-gray-200 text-gray-800'} rounded-md hover:bg-gray-800 hover:text-white`}
>
  Select Annual Plan
</button>
              </div>
            </div>
            
            <div className="mt-6 bg-gray-100 p-6 rounded-lg">
              <h3 className="font-medium text-lg mb-3">What You're Paying For</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                    <Brain className="text-blue-600" size={16} />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Advanced AI Engine</h4>
                    <p className="text-xs text-gray-600">Powered by Claude, one of the world's most sophisticated AI models</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                    <Shield className="text-green-600" size={16} />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Privacy & Security</h4>
                    <p className="text-xs text-gray-600">Enterprise-grade encryption and data protection</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                    <Database className="text-purple-600" size={16} />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Secure Data Storage</h4>
                    <p className="text-xs text-gray-600">Your family's data securely stored and backed up</p>
                  </div>
                </div>
              </div>
            </div>
    
            <div className="mt-6 bg-gradient-to-r from-purple-100 to-blue-100 p-6 rounded-lg border border-purple-200">
  <div className="flex flex-col md:flex-row items-center">
    <div className="flex-1 mb-4 md:mb-0 md:mr-4">
      <h4 className="text-lg font-bold text-purple-800">Not Ready to Commit?</h4>
      <p className="text-sm text-purple-700">
        Try our interactive mini-assessment to see a preview of Allie's AI engine in action! Experience how our technology analyzes your family's balance, with personalized insights—all before subscribing.
      </p>
    </div>
    <button
      onClick={() => navigate('/mini-survey', pendingFamilyData ? {
        state: {
          fromPayment: true,
          familyData: pendingFamilyData
        }
      } : undefined)}
      className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 whitespace-nowrap"
    >
      <span className="flex items-center">
        <Brain size={18} className="mr-2" />
        Try Our Mini-Assessment
      </span>
    </button>
  </div>
</div>
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
          ) : selectedPlan && (
            <form onSubmit={handleSubmit} className="border-t pt-6" id="payment-details-section">

              <h3 className="text-xl font-medium mb-4">Payment Details</h3>
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
                className="w-full py-3 bg-black text-white rounded-md"
              >
                {loading ? 'Processing...' : `Complete Payment - ${selectedPlan === 'monthly' ? '$20/month' : '$180/year'}`}
              </button>
            </form>
          )}
        </div>
      </div>
    );
};

export default PaymentScreen;
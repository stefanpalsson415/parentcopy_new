import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FamilyProvider } from './contexts/FamilyContext';
import { SurveyProvider } from './contexts/SurveyContext';
import { useFamily } from './contexts/FamilyContext';
import AboutUsPage from './components/marketing/AboutUsPage';
import FamilyMemory from './components/marketing/FamilyMemoryPage';
import HowThisWorksScreen from './components/education/HowThisWorksScreen';
import ProductOverviewPage from './components/marketing/ProductOverviewPage'; 
import BlogHomePage from './components/blog/BlogHomePage';
import BlogArticlePage from './components/blog/BlogArticlePage';
import MiniSurvey from './components/survey/MiniSurvey';
import MiniResultsScreen from './components/survey/MiniResultsScreen';
import FamilySelectionScreen from './components/user/FamilySelectionScreen';
import SurveyScreen from './components/survey/SurveyScreen';
import DashboardScreen from './components/dashboard/DashboardScreen';
import WeeklyCheckInScreen from './components/survey/WeeklyCheckInScreen';
import LoadingScreen from './components/common/LoadingScreen';
import UserSignupScreen from './components/user/UserSignupScreen';
import KidFriendlySurvey from './components/survey/KidFriendlySurvey';
import FamilySurveyDashboard from './components/survey/FamilySurveyDashboard';
import PaymentScreen from './components/payment/PaymentScreen';
import LandingPage from './components/marketing/LandingPage';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import RelationshipFeaturesPage from './components/marketing/RelationshipFeaturesPage';
import AIAssistantPage from './components/marketing/AIAssistantPage';
import { useAuth } from './contexts/AuthContext';
import RevisedFloatingCalendarWidget from './components/calendar/RevisedFloatingCalendarWidget';
import EmailOptIn from './components/marketing/EmailOptIn';
import ClaudeDebugger from './components/debug/ClaudeDebugger';
import './styles/atomicHabits.css';
import { EventProvider } from './contexts/EventContext';


// New code for App.js (GoogleMapsApiLoader component)
function GoogleMapsApiLoader() {
  useEffect(() => {
    // Check if the script is already loaded
    if (!window.google || !window.google.maps) {
      // Define a global callback function for the script
      window.initGoogleMapsApi = () => {
        console.log("Google Maps API loaded successfully");
        // Dispatch an event to notify components that the API is loaded
        window.dispatchEvent(new Event('google-maps-api-loaded'));
      };
      
      // Handle API loading errors globally
      window.gm_authFailure = () => {
        console.warn("Google Maps API authentication failed - using fallback mode");
        window.googleMapsAuthFailed = true;
      };

      // Get API key from environment variables
      const apiKey = process.env.REACT_APP_GOOGLE_API_KEY || '';
      
      if (!apiKey) {
        console.warn("Google Maps API key not found in environment variables");
        window.googleMapsLoadFailed = true;
        return; // Don't load the API if no key is available
      }

      // Create and append the script tag with updated libraries
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&callback=initGoogleMapsApi`;
      script.async = true;
      script.defer = true;
      
      // Handle loading errors
      script.onerror = () => {
        console.error("Error loading Google Maps API");
        window.googleMapsLoadFailed = true;
      };
      
      document.head.appendChild(script);
      
      return () => {
        // Clean up
        if (window.initGoogleMapsApi) {
          delete window.initGoogleMapsApi;
        }
        if (window.gm_authFailure) {
          delete window.gm_authFailure;
        }
        // Optional: remove the script on unmount
        const scriptElement = document.querySelector(`script[src^="https://maps.googleapis.com/maps/api/js"]`);
        if (scriptElement) {
          document.head.removeChild(scriptElement);
        }
      };
    }
  }, []);
  
  return null; // This component doesn't render anything
}

// App Routes Component - Used after context providers are set up
function AppRoutes() {
  const { selectedUser } = useFamily();
  const { currentUser } = useAuth();
  useEffect(() => {
    // Check for required environment variables on startup - but don't show errors
    if (!process.env.REACT_APP_GOOGLE_API_KEY || !process.env.REACT_APP_GOOGLE_CLIENT_ID) {
      console.log("Note: Google Calendar integration will use mock mode");
      // No errors shown to avoid red circles
    } else {
      console.log("Google API credentials found in environment variables");
    }
  }, []);

  // Determine if calendar widget should be shown
  const showCalendarWidget = !!currentUser && !!selectedUser && window.location.pathname === '/dashboard';

  return (
    <>
      {/* Add the Google Maps API Loader */}
      <GoogleMapsApiLoader />
      
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<FamilySelectionScreen />} />
        <Route path="/onboarding" element={<OnboardingFlow />} />
        <Route path="/signup" element={<UserSignupScreen />} />
        <Route path="/email-opt-in" element={<EmailOptIn />} />
        <Route path="/survey-dashboard" element={<FamilySurveyDashboard />} />
        
        <Route path="/how-it-works" element={<HowThisWorksScreen />} />
        <Route path="/family-command-center" element={<RelationshipFeaturesPage />} />
        <Route path="/ai-assistant" element={<AIAssistantPage />} />
        <Route path="/about-us" element={<AboutUsPage />} />
        <Route path="/family-memory" element={<FamilyMemory />} />
        <Route path="/product-overview" element={<ProductOverviewPage />} />
        <Route path="/blog" element={<BlogHomePage />} />
        <Route path="/blog/:slug" element={<BlogArticlePage />} />

        <Route path="/survey" element={<SurveyScreen mode="initial" />} />
        
        {/* Add a dedicated route for kid-survey with better path protection */}
        <Route path="/kid-survey" element={
          localStorage.getItem('selectedUserId') ? <KidFriendlySurvey surveyType="initial" /> : <Navigate to="/login" />
        } />
        <Route path="/mini-survey" element={<MiniSurvey />} />
        <Route path="/mini-results" element={<MiniResultsScreen />} />
        <Route path="/payment" element={<PaymentScreen />} />
        <Route path="/dashboard" element={<DashboardScreen />} />
        <Route path="/debug/claude" element={<ClaudeDebugger />} />
        
        {/* Route for weekly check-in - directs kids to kid-friendly version */}
        <Route path="/weekly-check-in" element={
          selectedUser?.role === 'child' 
            ? <KidFriendlySurvey surveyType="weekly" /> 
            : <SurveyScreen mode="weekly" />
        } />
        
        <Route path="/loading" element={<LoadingScreen />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      
      {/* Show calendar widget only on dashboard when user is logged in */}
      {showCalendarWidget && <RevisedFloatingCalendarWidget />}
    </>
  );
}

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      errorDetails: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console and potentially a monitoring service
    console.error("Error in application:", error, errorInfo);
    this.setState({ 
      errorDetails: error.message,
      errorInfo: errorInfo
    });
  }

  handleReset = () => {
    // Clear any stored state that might be causing issues
    try {
      localStorage.removeItem('directFamilyAccess');
      localStorage.removeItem('selectedFamilyId');
      sessionStorage.clear();
    } catch (e) {
      console.error("Error clearing storage:", e);
    }
    
    // Reload the page
    window.location.href = '/';
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-roboto">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-4 font-roboto">Something went wrong</h2>
            
            {this.state.errorDetails && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded border border-red-200 text-sm overflow-auto">
                <p className="font-medium mb-1">Error:</p>
                <p className="font-roboto">{this.state.errorDetails}</p>
              </div>
            )}
            
            <p className="mb-4 font-roboto">Please try one of the following:</p>
            <ul className="list-disc pl-5 mb-6 space-y-2 font-roboto">
              <li>Refresh the page</li>
              <li>Clear your browser cache</li>
              <li>Log out and log back in</li>
            </ul>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 font-roboto"
              >
                Refresh Page
              </button>
              
              <button 
                onClick={this.handleReset} 
                className="px-4 py-2 border border-black text-black rounded hover:bg-gray-50 font-roboto"
              >
                Reset & Go to Homepage
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

function App() {
  console.log("App rendering..."); 
  
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <FamilyProvider>
            <SurveyProvider>
            <EventProvider>

              <div className="App">
                <AppRoutes />
              </div>
              </EventProvider>

            </SurveyProvider>
          </FamilyProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
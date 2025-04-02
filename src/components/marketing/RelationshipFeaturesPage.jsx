import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, Users, Clock, Calendar, Star, CheckCircle, 
  Lightbulb, MessageCircle, Brain, BarChart, Activity,
  ArrowRight, BookOpen, Smile, Award, Zap, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const RelationshipFeaturesPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white font-['Roboto']">
      {/* Header/Nav */}
<header className="px-6 py-4 border-b bg-white sticky top-0 z-50">
  <div className="max-w-6xl mx-auto flex justify-between items-center">
    <h1 className="text-3xl font-light cursor-pointer" onClick={() => navigate('/')}>Allie</h1>
    <nav className="hidden md:flex space-x-8">
      <button 
        onClick={() => navigate('/how-it-works')}
        className="text-gray-800 hover:text-blue-600 hover:underline transition-colors"
      >
        How It Works
      </button>
      <button
        onClick={() => navigate('/about-us')}
        className="text-gray-800 hover:text-blue-600 hover:underline transition-colors"
      >
        About Us
      </button>
      <button 
        onClick={() => navigate('/relationship-features')}
        className="text-gray-800 hover:text-blue-600 hover:underline transition-colors"
      >
        Relationship Features
      </button>
      <button 
        onClick={() => navigate('/ai-assistant')}
        className="text-gray-800 hover:text-blue-600 hover:underline transition-colors"
      >
        AI Assistant
      </button>
      <button 
        onClick={() => navigate('/blog')}
        className="text-gray-800 hover:text-blue-600 hover:underline transition-colors"
      >
        Blog
      </button>
      {currentUser ? (
        <button 
          onClick={() => navigate('/login', { state: { directAccess: true, fromLanding: true } })}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
          Jump Back In
        </button>
      ) : (
        <>
          <button 
            onClick={() => navigate('/login')}
            className="px-4 py-2 border border-gray-800 rounded hover:bg-gray-100"
          >
            Log In
          </button>
          <button 
            onClick={() => navigate('/onboarding')}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Sign Up
          </button>
        </>
      )}
    </nav>
  </div>
</header>
      
      {/* Hero Section */}
      <section className="py-20 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-light mb-6">Transform Your Relationship Through Balance</h1>
          <p className="text-xl font-light max-w-2xl mx-auto">
            Discover how Allie strengthens your bond while creating a more balanced family life—one small change at a time.
          </p>
          <div className="flex justify-center mt-8">
            <button 
              onClick={() => navigate('/onboarding')}
              className="px-6 py-3 bg-white text-black rounded-md font-medium hover:bg-gray-100"
            >
              Start Your Journey
            </button>
          </div>
        </div>
      </section>
      
      {/* The Connection Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block p-2 bg-pink-100 rounded-lg mb-4">
                <Heart className="text-pink-600" size={24} />
              </div>
              <h2 className="text-3xl font-light mb-6">The Workload-Relationship Connection</h2>
              <p className="text-lg mb-4 font-light">
                Research shows that inequitable distribution of family responsibilities is one of the leading causes of relationship strain.
              </p>
              <p className="text-lg mb-4 font-light">
                When one partner carries more than their share of the mental and physical workload, resentment builds, emotional connection suffers, and satisfaction plummets.
              </p>
              <p className="text-lg font-light">
                Allie's relationship features are built on a core insight: <span className="font-medium">balanced families have happier relationships</span>.
              </p>
            </div>
            <div className="bg-gray-50 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-4 flex items-center">
                <BarChart className="text-blue-600 mr-2" size={24} />
                The Research Is Clear
              </h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mr-3">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <div>
                    <p className="font-medium">83% of couples</p>
                    <p className="text-gray-600 text-sm">
                      Report improved relationship satisfaction after just 6 weeks of better workload balance
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mr-3">
                    <span className="text-blue-600 font-bold">2</span>
                  </div>
                  <div>
                    <p className="font-medium">67% reduction</p>
                    <p className="text-gray-600 text-sm">
                      In household-related arguments when balance improves by just 15%
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mr-3">
                    <span className="text-blue-600 font-bold">3</span>
                  </div>
                  <div>
                    <p className="font-medium">42% increase</p>
                    <p className="text-gray-600 text-sm">
                      In reported emotional connection after implementing balanced responsibility sharing
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* 10 Strategic Actions */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-purple-100 rounded-lg mb-4">
              <Star className="text-purple-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">10 Relationship-Strengthening Strategies</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Allie's approach is built on research-backed strategies that strengthen your bond while improving family balance
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-start">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mr-4 flex-shrink-0">
                  <Clock size={24} className="text-pink-600" />
                </div>
                <div>
                  <h3 className="font-medium text-lg mb-2">Brief Daily Check-ins</h3>
                  <p className="text-gray-600 text-sm">
                    5-10 minute daily conversations to maintain emotional connection
                  </p>
                  <div className="mt-3 flex items-center text-sm">
                    <span className="text-purple-700">Allie feature:</span>
                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">Daily Check-in Reminders</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-start">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mr-4 flex-shrink-0">
                  <CheckCircle size={24} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-lg mb-2">Divide & Conquer Tasks</h3>
                  <p className="text-gray-600 text-sm">
                    Clear role assignment and decision-making for household responsibilities
                  </p>
                  <div className="mt-3 flex items-center text-sm">
                    <span className="text-purple-700">Allie feature:</span>
                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">Task Assignment Dashboard</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-start">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mr-4 flex-shrink-0">
                  <Heart size={24} className="text-red-600" />
                </div>
                <div>
                  <h3 className="font-medium text-lg mb-2">Regular Date Nights</h3>
                  <p className="text-gray-600 text-sm">
                    Dedicated one-on-one time to nurture your connection as partners
                  </p>
                  <div className="mt-3 flex items-center text-sm">
                    <span className="text-purple-700">Allie feature:</span>
                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">Date Night Planner</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-start">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mr-4 flex-shrink-0">
                  <Smile size={24} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-medium text-lg mb-2">Gratitude & Affirmation</h3>
                  <p className="text-gray-600 text-sm">
                    Regular appreciation for each other's contributions and qualities
                  </p>
                  <div className="mt-3 flex items-center text-sm">
                    <span className="text-purple-700">Allie feature:</span>
                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">Gratitude Tracker</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-start">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-4 flex-shrink-0">
                  <Calendar size={24} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-lg mb-2">Unified Family Calendar</h3>
                  <p className="text-gray-600 text-sm">
                    Shared scheduling system to manage family commitments
                  </p>
                  <div className="mt-3 flex items-center text-sm">
                    <span className="text-purple-700">Allie feature:</span>
                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">Calendar Integration</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-start">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mr-4 flex-shrink-0">
                  <Lightbulb size={24} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-medium text-lg mb-2">Collaborative Problem-Solving</h3>
                  <p className="text-gray-600 text-sm">
                    Structured approach to resolving challenges as a team
                  </p>
                  <div className="mt-3 flex items-center text-sm">
                    <span className="text-purple-700">Allie feature:</span>
                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">Guided Meetings</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-start">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mr-4 flex-shrink-0">
                  <Activity size={24} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-medium text-lg mb-2">Self-Care & Support</h3>
                  <p className="text-gray-600 text-sm">
                    Ensuring each parent has personal time for well-being
                  </p>
                  <div className="mt-3 flex items-center text-sm">
                    <span className="text-purple-700">Allie feature:</span>
                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">Self-Care Task Assignment</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-start">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mr-4 flex-shrink-0">
                  <MessageCircle size={24} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-lg mb-2">Professional Development</h3>
                  <p className="text-gray-600 text-sm">
                    Educational resources or counseling when needed
                  </p>
                  <div className="mt-3 flex items-center text-sm">
                    <span className="text-purple-700">Allie feature:</span>
                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">Relationship Resources</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-start">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mr-4 flex-shrink-0">
                  <Award size={24} className="text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-medium text-lg mb-2">Celebrate Milestones</h3>
                  <p className="text-gray-600 text-sm">
                    Acknowledge achievements and special moments together
                  </p>
                  <div className="mt-3 flex items-center text-sm">
                    <span className="text-purple-700">Allie feature:</span>
                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">Progress Celebrations</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-start">
                <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center mr-4 flex-shrink-0">
                  <BookOpen size={24} className="text-cyan-600" />
                </div>
                <div>
                  <h3 className="font-medium text-lg mb-2">Shared Future Planning</h3>
                  <p className="text-gray-600 text-sm">
                    Joint vision-setting for family goals and direction
                  </p>
                  <div className="mt-3 flex items-center text-sm">
                    <span className="text-purple-700">Allie feature:</span>
                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">Goal Setting Tools</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* The Command Center */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-blue-100 rounded-lg mb-4">
              <Brain className="text-blue-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">The Relationship Command Center</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Your complete relationship dashboard that integrates workload balance with relationship health
            </p>
          </div>
          
          <div className="bg-gray-50 p-8 rounded-lg mb-12">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-medium mb-6">Dashboard Features</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <Heart size={16} className="text-pink-600" />
                    </div>
                    <div>
                      <p className="font-medium">Relationship & Workload Balance Chart</p>
                      <p className="text-sm text-gray-600">
                        Visualize the direct correlation between workload sharing and relationship satisfaction
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <Star size={16} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Strategy Implementation Tracker</p>
                      <p className="text-sm text-gray-600">
                        Track your progress implementing the 10 relationship-strengthening strategies
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <Lightbulb size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">AI-Powered Relationship Insights</p>
                      <p className="text-sm text-gray-600">
                        Receive personalized recommendations based on your unique relationship patterns
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <MessageCircle size={16} className="text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Guided Relationship Meetings</p>
                      <p className="text-sm text-gray-600">
                        Structured 15-minute check-ins with your partner to strengthen connection
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-black text-white p-6 rounded-lg">
                <h3 className="text-xl font-medium mb-4">Strategic Features</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-white bg-opacity-10 rounded">
                    <h4 className="text-white font-medium">Date Night Planner</h4>
                    <p className="text-sm text-gray-300">
                      Schedule and track quality time together with date suggestions
                    </p>
                  </div>
                  
                  <div className="p-3 bg-white bg-opacity-10 rounded">
                    <h4 className="text-white font-medium">Gratitude Tracker</h4>
                    <p className="text-sm text-gray-300">
                      Record expressions of appreciation to nurture positive feelings
                    </p>
                  </div>
                  
                  <div className="p-3 bg-white bg-opacity-10 rounded">
                    <h4 className="text-white font-medium">Relationship Progress Chart</h4>
                    <p className="text-sm text-gray-300">
                      Visualize improvement in connection, satisfaction, and balance over time
                    </p>
                  </div>
                  
                  <div className="p-3 bg-white bg-opacity-10 rounded">
                    <h4 className="text-white font-medium">Couple Check-ins</h4>
                    <p className="text-sm text-gray-300">
                      Weekly relationship pulse checks to identify opportunities for growth
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Dad's Corner */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-amber-100 rounded-lg mb-4">
              <Users className="text-amber-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">Dad's Corner</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Simple ways to make her day (and strengthen your relationship)
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-lg border border-gray-200 mb-8">
            <h3 className="text-xl font-medium mb-6">Three Things That Will Blow Her Mind</h3>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mr-4">
                  <span className="font-bold text-blue-600">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-lg">Take Over One Invisible Task</h4>
                  <p className="text-gray-600 mb-2">
                    Handling meal planning, scheduling appointments, or tracking household supplies—without being asked—will immediately reduce her mental load.
                  </p>
                  <p className="text-gray-800 bg-blue-50 p-3 rounded-lg text-sm">
                    <strong>Just one thing:</strong> Try saying "I've got the meal planning this week" and watch her expression. Most women have been carrying this invisible work for years.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mr-4">
                  <span className="font-bold text-green-600">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-lg">Daily 10-Minute Check-in</h4>
                  <p className="text-gray-600 mb-2">
                    Set a recurring alarm for a daily 10-minute conversation with no distractions—no phones, no TV, just connection.
                  </p>
                  <p className="text-gray-800 bg-green-50 p-3 rounded-lg text-sm">
                    <strong>Just one thing:</strong> Ask "What can I do to make your day easier tomorrow?" and then actually do it. This simple habit creates a profound sense of partnership.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mr-4">
                  <span className="font-bold text-purple-600">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-lg">Specific, Genuine Appreciation</h4>
                  <p className="text-gray-600 mb-2">
                    Notice and acknowledge something specific she does that usually goes unrecognized.
                  </p>
                  <p className="text-gray-800 bg-purple-50 p-3 rounded-lg text-sm">
                    <strong>Just one thing:</strong> Try "I noticed how you always remember everyone's appointments and keep us on schedule. That's a huge contribution that makes our family work." Be specific about invisible work.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-black text-white p-8 rounded-lg">
            <div className="flex items-start">
              <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center mr-4 flex-shrink-0">
                <Zap size={20} />
              </div>
              <div>
                <h3 className="text-xl font-medium mb-4">The Dad Challenge</h3>
                <p className="text-gray-300 mb-4">
                  Try just one Allie task per week. That's it. No big commitments, no complex systems—just one small action each week.
                </p>
                <p className="text-white font-medium mb-4">
                  After 4 weeks, ask your partner if she's noticed a difference in how supported she feels.
                </p>
                <p className="text-gray-300 italic">
                  "I was skeptical, but after following Allie's suggestions for a month, my wife told me she feels like we're truly partners for the first time in years. And honestly? Our relationship has never been better." — Mark, father of three
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Science Meets Practice */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-indigo-100 rounded-lg mb-4">
              <Activity className="text-indigo-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">Science Meets Daily Practice</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              How Allie's cycle system builds stronger relationships through habit formation
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-xl font-medium mb-4 flex items-center">
                <RefreshCw className="text-blue-600 mr-2" size={24} />
                The Allie Cycle System
              </h3>
              <p className="text-gray-600 mb-4">
                Our weekly cycle creates a rhythm of relationship-strengthening activities that build over time:
              </p>
              <ol className="space-y-3">
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 text-sm font-bold">1</div>
                  <div className="text-sm">
                    <span className="font-medium">Task Completion Phase</span>
                    <p className="text-gray-600">Implementing targeted relationship-strengthening behaviors</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 text-sm font-bold">2</div>
                  <div className="text-sm">
                    <span className="font-medium">Couple Check-in</span>
                    <p className="text-gray-600">Measuring the impact on relationship satisfaction</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 text-sm font-bold">3</div>
                  <div className="text-sm">
                    <span className="font-medium">Relationship Meeting</span>
                    <p className="text-gray-600">Discussing progress and planning continued growth</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 text-sm font-bold">4</div>
                  <div className="text-sm">
                    <span className="font-medium">AI Learning & New Recommendations</span>
                    <p className="text-gray-600">Customized suggestions based on what works for your relationship</p>
                  </div>
                </li>
              </ol>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-xl font-medium mb-4 flex items-center">
                <Brain className="text-purple-600 mr-2" size={24} />
                The Science of Habit Building
              </h3>
              <p className="text-gray-600 mb-4">
                Allie applies behavioral science principles to make relationship improvement sustainable:
              </p>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <Lightbulb size={16} />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Small, Consistent Actions</span>
                    <p className="text-gray-600">Research shows tiny habits are more sustainable than major changes</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <Lightbulb size={16} />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Positive Reinforcement</span>
                    <p className="text-gray-600">Celebrating small wins creates a reward loop for continued improvement</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <Lightbulb size={16} />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Feedback Loops</span>
                    <p className="text-gray-600">Regular measurement creates awareness and motivation for change</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <Lightbulb size={16} />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Incremental Progress</span>
                    <p className="text-gray-600">Small improvements compound into significant relationship enhancements</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-8 rounded-lg">
            <h3 className="text-xl font-medium mb-4">How The Cycle Improves AI Recommendations</h3>
            <p className="text-gray-600 mb-4">
              With each weekly cycle, Allie's AI engine gets smarter about what works for your specific relationship:
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded border border-gray-200">
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-3">
                  <span className="font-bold">1</span>
                </div>
                <h4 className="font-medium mb-1">Data Collection</h4>
                <p className="text-sm text-gray-600">
                  As you complete tasks and check-ins, Allie learns which strategies impact your satisfaction most
                </p>
              </div>
              <div className="bg-white p-4 rounded border border-gray-200">
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-3">
                  <span className="font-bold">2</span>
                </div>
                <h4 className="font-medium mb-1">Pattern Recognition</h4>
                <p className="text-sm text-gray-600">
                  The AI identifies correlations between specific actions and relationship quality improvements
                </p>
              </div>
              <div className="bg-white p-4 rounded border border-gray-200">
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-3">
                  <span className="font-bold">3</span>
                </div>
                <h4 className="font-medium mb-1">Tailored Recommendations</h4>
                <p className="text-sm text-gray-600">
                  Each new cycle delivers more personalized suggestions based on what's working for you
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-light mb-4">Real Relationships, Real Results</h2>
            <p className="text-xl text-gray-400 font-light max-w-2xl mx-auto">
              Hear from couples who've transformed their relationships through better balance
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mr-3">
                  <span className="font-bold">S</span>
                </div>
                <div>
                  <p className="font-medium">Sarah & James</p>
                  <p className="text-sm text-gray-400">Parents of 2, using Allie for 3 months</p>
                </div>
              </div>
              <p className="text-gray-300 mb-4">
                "Before Allie, I felt like I was drowning in mental load while my husband had no idea how much I was juggling. Now he takes over meal planning every week and we have a 10-minute check-in every night. Our relationship hasn't been this strong since before kids."
              </p>
              <div className="flex space-x-1">
                <Star className="text-yellow-400" size={20} />
                <Star className="text-yellow-400" size={20} />
                <Star className="text-yellow-400" size={20} />
                <Star className="text-yellow-400" size={20} />
                <Star className="text-yellow-400" size={20} />
              </div>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                  <span className="font-bold">M</span>
                </div>
                <div>
                  <p className="font-medium">Michael & Lauren</p>
                  <p className="text-sm text-gray-400">Parents of 3, using Allie for 6 months</p>
                </div>
              </div>
              <p className="text-gray-300 mb-4">
                "As a dad, I was completely unaware of how unbalanced our household was. Allie made it measurable and gave me specific tasks to take on. My wife says it's like having a completely different partner. The Date Night Planner alone was worth signing up."
              </p>
              <div className="flex space-x-1">
                <Star className="text-yellow-400" size={20} />
                <Star className="text-yellow-400" size={20} />
                <Star className="text-yellow-400" size={20} />
                <Star className="text-yellow-400" size={20} />
                <Star className="text-yellow-400" size={20} />
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-light mb-4">Start Your Relationship Transformation</h2>
          <p className="text-xl opacity-80 mb-8 max-w-2xl mx-auto font-light">
            Small changes. Measurable improvements. Stronger connection.
          </p>
          <button 
            onClick={() => navigate('/onboarding')}
            className="px-8 py-4 bg-white text-black rounded-md font-medium hover:bg-gray-100"
          >
            Get Started
          </button>
        </div>
      </section>
      
      {/* Footer */}
      // Updated footer for AboutUsPage.jsx
<footer className="px-6 py-12 bg-white border-t">
  <div className="max-w-6xl mx-auto">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
      <div>
        <h2 className="text-2xl font-light mb-4">Allie</h2>
        <p className="text-gray-600 font-light">Balancing family responsibilities together</p>
      </div>
      
      <div>
        <h3 className="text-gray-800 font-medium mb-4">Product</h3>
        <ul className="space-y-2">
          <li>
            <button onClick={() => navigate('/how-it-works')} className="text-gray-600 hover:text-gray-900 font-light">How It Works</button>
          </li>
          <li>
            <button onClick={() => navigate('/relationship-features')} className="text-gray-600 hover:text-gray-900 font-light">Relationship Features</button>
          </li>
          <li>
            <button onClick={() => navigate('/ai-assistant')} className="text-gray-600 hover:text-gray-900 font-light">AI Assistant</button>
          </li>
        </ul>
      </div>
      
      <div>
        <h3 className="text-gray-800 font-medium mb-4">Company</h3>
        <ul className="space-y-2">
          <li>
            <button onClick={() => navigate('/about-us')} className="text-gray-600 hover:text-gray-900 font-light">About Us</button>
          </li>
          <li>
            <button onClick={() => navigate('/blog')} className="text-gray-600 hover:text-gray-900 font-light">Blog</button>
          </li>
        </ul>
      </div>
    </div>
    <div className="mt-8 pt-8 border-t text-center text-gray-500 text-sm">
      <p>© 2025 Allie. All rights reserved.</p>
    </div>
  </div>
</footer>
    </div>
  );
};

export default RelationshipFeaturesPage;
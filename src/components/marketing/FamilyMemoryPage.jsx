import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, MessageSquare, Calendar, Camera, Clock, Bell, 
  Search, ArrowRight, CheckCircle, Smartphone, Upload,
  AlertCircle, Bookmark, Star, Download, RefreshCw, 
  Users, Heart, FileText,BookOpen, Image, Mic, Info
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const FamilyMemoryPage = () => {
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
              className="text-gray-800 hover:text-gray-600"
            >
              How It Works
            </button>
            <button
              onClick={() => navigate('/about-us')}
              className="text-gray-800 hover:text-gray-600"
            >
              About Us
            </button>
            <button 
              onClick={() => navigate('/relationship-features')}
              className="text-gray-800 hover:text-gray-600"
            >
              Relationship Features
            </button>
            <button 
              onClick={() => navigate('/ai-assistant')}
              className="text-gray-800 hover:text-gray-600"
            >
              AI Assistant
            </button>
            <button 
              onClick={() => navigate('/family-memory')}
              className="text-black font-medium border-b-2 border-black"
            >
              Family Memory
            </button>
            <button 
              onClick={() => navigate('/blog')}
              className="text-gray-800 hover:text-gray-600"
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
          <h1 className="text-4xl md:text-5xl font-light mb-6">Your Family Memory, Always With You</h1>
          <p className="text-xl font-light max-w-2xl mx-auto">
            Everything your family needs to remember, in your pocket. Allie remembers it all so you don't have to.
          </p>
          <div className="flex justify-center mt-8">
            <button 
              onClick={() => navigate('/onboarding')}
              className="px-6 py-3 bg-white text-black rounded-md font-medium hover:bg-gray-100"
            >
              Get Allie on Your Phone
            </button>
          </div>
        </div>
      </section>
      
      {/* Problem Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-red-100 rounded-lg mb-4">
              <AlertCircle className="text-red-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">Parents Are Expected to Remember Everything</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              The mental load of parenting is overwhelming. Keeping track of everything your family needs is a full-time job.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <Clock className="text-amber-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Endless Details</h3>
              <p className="text-gray-600 text-sm">
                Doctor's instructions, school forms, activity schedules, playdates, prescription details—all competing for space in your memory.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Search className="text-blue-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Finding What You Need</h3>
              <p className="text-gray-600 text-sm">
                Searching through emails, text messages, and paper piles to find that one critical piece of information when you need it most.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <Brain className="text-purple-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Mental Overload</h3>
              <p className="text-gray-600 text-sm">
                The cognitive burden of constantly planning, remembering, and coordinating for multiple family members takes a toll on your wellbeing.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-8 rounded-lg shadow-sm">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 mb-6 md:mb-0 md:pr-8">
                <h3 className="text-xl font-medium mb-4">The Mental Load by the Numbers</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-0.5 mr-3">
                      <span className="text-red-600 font-bold text-xs">82%</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      of parents report forgetting important school dates and deadlines at least monthly
                    </p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-0.5 mr-3">
                      <span className="text-red-600 font-bold text-xs">67%</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      struggle to recall specific medical instructions for their children
                    </p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-0.5 mr-3">
                      <span className="text-red-600 font-bold text-xs">5.5</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      hours per week spent searching for information they've previously seen or heard
                    </p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-0.5 mr-3">
                      <span className="text-red-600 font-bold text-xs">78%</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      report that information overload is a significant source of family stress
                    </p>
                  </li>
                </ul>
              </div>
              <div className="md:w-1/2">
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h4 className="font-medium text-lg mb-2">A Parent's Mental Load</h4>
                  <div className="space-y-2 text-xs text-gray-500">
                    <div className="border-l-2 border-red-400 pl-3 py-1 bg-gray-50">
                      "Which day is picture day at school again? Did I write that down somewhere?"
                    </div>
                    <div className="border-l-2 border-red-400 pl-3 py-1 bg-gray-50">
                      "Was that medicine 1 teaspoon three times a day or 3 teaspoons once a day?"
                    </div>
                    <div className="border-l-2 border-red-400 pl-3 py-1 bg-gray-50">
                      "What was the name of that mom from soccer practice? I need to text her about Saturday."
                    </div>
                    <div className="border-l-2 border-red-400 pl-3 py-1 bg-gray-50">
                      "When was Emma's last dentist appointment? What did they say about her brushing?"
                    </div>
                    <div className="border-l-2 border-red-400 pl-3 py-1 bg-gray-50">
                      "Which weekend is Jake at his friend's birthday party? Do we need to buy a gift?"
                    </div>
                    <div className="border-l-2 border-red-400 pl-3 py-1 bg-gray-50">
                      "Did I send in that permission slip? When is the money due for the field trip?"
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Allie Chat Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-purple-100 rounded-lg mb-4">
              <MessageSquare className="text-purple-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">Talk to the Only AI That Knows Your Family</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Allie Chat is your family's memory, accessible anytime through your phone. Speak, type, or share images—Allie remembers everything.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center mb-12">
            <div>
              <h3 className="text-xl font-medium mb-4">Allie Chat: Your Family's Memory</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <Brain size={16} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Everything In One Place</p>
                    <p className="text-gray-600 text-sm">
                      Doctor's notes, school notices, growth records, appointments, and family memories—all accessible through simple conversation.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <Upload size={16} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Effortless Capture</p>
                    <p className="text-gray-600 text-sm">
                      Snap a photo of a school notice, share a screenshot of an email, or just speak—Allie automatically saves and organizes everything.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <Mic size={16} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Voice-First Experience</p>
                    <p className="text-gray-600 text-sm">
                      Hands full? Just ask. "Allie, when was Maya's last checkup?" or "Allie, save this growth chart from today's doctor's visit."
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <RefreshCw size={16} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Always Learning</p>
                    <p className="text-gray-600 text-sm">
                      The more you use Allie, the better it understands your family's patterns, preferences, and needs—creating a truly personalized experience.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
              <div className="bg-gray-100 rounded-t-lg p-3 flex items-center border-b">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center mr-2">
                  <MessageSquare size={16} className="text-white" />
                </div>
                <p className="font-medium">Allie Chat</p>
              </div>
              
              <div className="py-3 px-4 h-80 overflow-y-auto flex flex-col space-y-3">
                <div className="flex justify-end">
                  <div className="bg-black text-white rounded-lg p-3 max-w-xs">
                    <p className="text-sm">When was Jack's last dentist appointment and what did they recommend?</p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-2 flex-shrink-0">
                    <Brain size={14} className="text-purple-600" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                    <p className="text-sm">Jack's last dentist appointment was on March 14, 2025 with Dr. Chen. They noted good overall dental health but recommended increasing flossing to daily instead of 3x/week and scheduling a follow-up in 6 months (September 2025).</p>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <div className="bg-black text-white rounded-lg p-3 max-w-xs">
                    <p className="text-sm">What supplies do we need for Emma's science project?</p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-2 flex-shrink-0">
                    <Brain size={14} className="text-purple-600" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                    <p className="text-sm">For Emma's volcano science project due April 15th, you'll need:</p>
                    <ul className="list-disc pl-5 text-sm mt-1">
                      <li>Baking soda</li>
                      <li>Vinegar</li>
                      <li>Food coloring (red)</li>
                      <li>Cardboard base</li>
                      <li>Clay or papier-mâché</li>
                      <li>Paint</li>
                    </ul>
                    <p className="text-xs mt-2 italic">From Ms. Thompson's project sheet shared on Feb 28.</p>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <div className="bg-black text-white rounded-lg p-3 flex items-center max-w-xs">
                    <Camera size={16} className="mr-2" />
                    <p className="text-sm">Save this birthday party invitation</p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-2 flex-shrink-0">
                    <Brain size={14} className="text-purple-600" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                    <p className="text-sm">I've saved this birthday party invitation for Tyler's friend Max. I've added it to your Family Calendar on Saturday, April 19 at 2:00 PM at Adventure Zone. Would you like me to set a reminder to buy a present?</p>
                  </div>
                </div>
              </div>
              
              <div className="border-t p-3 flex items-center">
                <input type="text" placeholder="Ask Allie anything..." className="flex-1 px-3 py-2 border rounded-lg text-sm mr-2" />
                <div className="flex space-x-2">
                  <button className="p-2 rounded-full bg-gray-100">
                    <Mic size={16} className="text-gray-600" />
                  </button>
                  <button className="p-2 rounded-full bg-gray-100">
                    <Camera size={16} className="text-gray-600" />
                  </button>
                  <button className="p-2 rounded-full bg-black text-white">
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-xl font-medium mb-4">From Capture to Knowledge</h3>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <Camera size={24} className="text-blue-600" />
                </div>
                <h4 className="font-medium mb-2">Capture</h4>
                <p className="text-sm text-gray-600">
                  Take a photo of a document, screenshot a message, or speak information aloud
                </p>
                <div className="h-20 w-full bg-gray-100 rounded-lg mt-3 flex items-center justify-center">
                  <Image size={24} className="text-gray-400" />
                </div>
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <Brain size={24} className="text-green-600" />
                </div>
                <h4 className="font-medium mb-2">Process</h4>
                <p className="text-sm text-gray-600">
                  Allie automatically recognizes content type, extracts key information, and organizes it
                </p>
                <div className="h-20 w-full bg-gray-100 rounded-lg mt-3 flex items-center justify-center p-2">
                  <div className="w-full h-full border border-dashed border-gray-300 rounded flex items-center justify-center">
                    <RefreshCw size={24} className="text-gray-400 animate-spin" />
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                  <Search size={24} className="text-amber-600" />
                </div>
                <h4 className="font-medium mb-2">Remember</h4>
                <p className="text-sm text-gray-600">
                  Access information whenever you need it through natural conversation
                </p>
                <div className="h-20 w-full bg-gray-100 rounded-lg mt-3 flex items-center justify-center p-2">
                  <div className="w-full h-full border border-dashed border-green-300 rounded flex flex-col items-center justify-center bg-white">
                    <CheckCircle size={16} className="text-green-500 mb-1" />
                    <p className="text-xs text-green-600">Information saved</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Family Calendar Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-blue-100 rounded-lg mb-4">
              <Calendar className="text-blue-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">A Calendar That Knows What Matters</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Not just dates and times—but context, connections, and everything your family needs to stay on track.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center mb-12">
            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
              <div className="bg-gray-100 rounded-t-lg p-3 flex items-center border-b">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center mr-2">
                  <Calendar size={16} className="text-white" />
                </div>
                <p className="font-medium">Family Calendar</p>
              </div>
              
              <div className="py-4 px-3">
                <div className="flex justify-between items-center mb-3">
                  <p className="font-medium">April 2025</p>
                  <div className="flex space-x-1">
                    <button className="p-1 rounded bg-gray-100">
                      <ArrowRight size={14} className="transform rotate-180" />
                    </button>
                    <button className="p-1 rounded bg-gray-100">
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                  <div>Su</div>
                  <div>Mo</div>
                  <div>Tu</div>
                  <div>We</div>
                  <div>Th</div>
                  <div>Fr</div>
                  <div>Sa</div>
                </div>
                
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-4">
                  {/* Week 1 */}
                  <div className="text-gray-400 p-2">30</div>
                  <div className="text-gray-400 p-2">31</div>
                  <div className="p-2">1</div>
                  <div className="p-2">2</div>
                  <div className="p-2">3</div>
                  <div className="p-2">4</div>
                  <div className="p-2">5</div>
                  
                  {/* Week 2 */}
                  <div className="p-2">6</div>
                  <div className="p-2 relative">
                    7
                    <div className="absolute bottom-0 right-1 w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                  </div>
                  <div className="p-2">8</div>
                  <div className="p-2 relative">
                    9
                    <div className="absolute bottom-0 right-1 w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                  </div>
                  <div className="p-2">10</div>
                  <div className="p-2">11</div>
                  <div className="p-2 relative">
                    12
                    <div className="absolute bottom-0 right-1 w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                  </div>
                  
                  {/* Week 3 */}
                  <div className="p-2">13</div>
                  <div className="p-2">14</div>
                  <div className="p-2 relative">
                    15
                    <div className="absolute bottom-0 right-1 w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                  </div>
                  <div className="bg-black text-white rounded-full font-medium p-2">16</div>
                  <div className="p-2">17</div>
                  <div className="p-2">18</div>
                  <div className="p-2 relative">
                    19
                    <div className="absolute bottom-0 right-1 w-1.5 h-1.5 bg-amber-600 rounded-full"></div>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="border-l-4 border-blue-500 pl-2 py-2 bg-blue-50 rounded-r-md flex justify-between">
                    <div>
                      <p className="text-sm font-medium">Jack's Soccer Practice</p>
                      <p className="text-xs text-gray-600">4:00 PM - 5:30 PM @ Central Field</p>
                    </div>
                    <div className="flex">
                      <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white -ml-2">
                        <img src="/api/placeholder/24/24" alt="Jack" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-l-4 border-amber-500 pl-2 py-2 bg-amber-50 rounded-r-md flex justify-between">
                    <div>
                      <p className="text-sm font-medium">Max's Birthday Party</p>
                      <p className="text-xs text-gray-600">2:00 PM @ Adventure Zone</p>
                      <div className="flex items-center mt-1">
                        <Bell size={12} className="text-red-500 mr-1" />
                        <p className="text-xs text-red-600">Buy present (gift list available)</p>
                      </div>
                    </div>
                    <div className="flex">
                      <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white -ml-2">
                        <img src="/api/placeholder/24/24" alt="Tyler" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-l-4 border-purple-500 pl-2 py-2 bg-purple-50 rounded-r-md flex justify-between">
                    <div>
                      <p className="text-sm font-medium">Emma's Dentist Appointment</p>
                      <p className="text-xs text-gray-600">3:30 PM - Dr. Chen Pediatric Dentistry</p>
                      <div className="flex items-center mt-1">
                        <Info size={12} className="text-blue-500 mr-1" />
                        <p className="text-xs text-blue-600">Bring insurance card</p>
                      </div>
                    </div>
                    <div className="flex">
                      <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white -ml-2">
                        <img src="/api/placeholder/24/24" alt="Emma" className="w-full h-full object-cover" />
                      </div>
                      <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white -ml-2">
                        <img src="/api/placeholder/24/24" alt="Parent" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-black text-white rounded-lg">
                  <p className="text-sm font-medium">Today: Wednesday, April 16</p>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-start">
                      <Clock size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium">1:30 PM - Emma's Science Project Due</p>
                        <p className="text-xs text-gray-300">Remember to include the completed worksheet</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Calendar size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium">Tomorrow: Field Trip Permission Due</p>
                        <p className="text-xs text-gray-300">Payment of $15 also required</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-medium mb-4">More Than Just Dates and Times</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <Users size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Full Context for Every Event</p>
                    <p className="text-gray-600 text-sm">
                      Contact information, addresses, reminders, what to bring—everything you need to know, right where you need it.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <Bell size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Smart Reminders</p>
                    <p className="text-gray-600 text-sm">
                      "Don't forget to buy a birthday present for Max's party" or "Remember to bring Emma's science project today"—just when you need them.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <Bookmark size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Connected Documents</p>
                    <p className="text-gray-600 text-sm">
                      Invitations, permission slips, doctor's notes—all attached to the relevant events for instant access when needed.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <Heart size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Family Coordination</p>
                    <p className="text-gray-600 text-sm">
                      See who's attending each event, coordinate pickups and dropoffs, and ensure nothing falls through the cracks.
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-black text-white rounded-lg">
                  <h4 className="font-medium text-lg mb-2 flex items-center">
                    <Star size={18} className="mr-2" />
                    Effortless Capture
                  </h4>
                  <p className="text-sm mb-4">
                    Information flows into your calendar without extra work. Take a photo of a birthday invitation, forward an email about soccer practice, or just tell Allie about an upcoming dentist appointment—it's all automatically added with full context.
                  </p>
                  <p className="text-sm">
                    No more copying details from one app to another or manually entering information.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Document Intelligence Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-green-100 rounded-lg mb-4">
              <FileText className="text-green-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">Capture Everything Without Effort</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Never lose an important document again. Allie analyzes, stores, and recalls everything when you need it.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 mb-12">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-medium mb-4">Document Intelligence</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <Camera size={16} className="text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Capture Any Document</p>
                      <p className="text-gray-600 text-sm">
                        School newsletters, doctor's instructions, medication details, permission slips, party invitations—just take a photo.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <Brain size={16} className="text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Automatic Understanding</p>
                      <p className="text-gray-600 text-sm">
                        Allie identifies document type, extracts key information, and connects it to the right people, events, and categories.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <Search size={16} className="text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Instant Retrieval</p>
                      <p className="text-gray-600 text-sm">
                        "What were those five vocabulary words from Emma's teacher?" Allie recalls specific information from documents months or years later.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <Download size={16} className="text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Always Available</p>
                      <p className="text-gray-600 text-sm">
                        Securely access original documents anytime, share with family members, or forward to healthcare providers as needed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-sm">Document Capture Demo</h4>
                  </div>
                  <div className="border border-dashed border-gray-300 rounded-lg p-2 bg-white flex items-center justify-center h-32">
                    <Camera size={24} className="text-gray-400" />
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-gray-600">
                      Take a photo of any document to store and analyze it
                    </p>
                  </div>
                </div>
                
                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-sm">Information Extraction</h4>
                  </div>
                  <div className="border border-gray-300 rounded-lg p-3 bg-white h-32 overflow-y-auto">
                    <p className="text-xs font-medium">Extracted from School Newsletter:</p>
                    <ul className="mt-2 space-y-1">
                      <li className="text-xs flex items-start">
                        <CheckCircle size={12} className="text-green-500 mr-1 mt-0.5" />
                        <span>Field Trip: Science Museum on April 25</span>
                      </li>
                      <li className="text-xs flex items-start">
                        <CheckCircle size={12} className="text-green-500 mr-1 mt-0.5" />
                        <span>Permission slip due: April 17</span>
                      </li>
                      <li className="text-xs flex items-start">
                        <CheckCircle size={12} className="text-green-500 mr-1 mt-0.5" />
                        <span>Cost: $15 per student</span>
                      </li>
                      <li className="text-xs flex items-start">
                        <CheckCircle size={12} className="text-green-500 mr-1 mt-0.5" />
                        <span>Lunch: Pack a lunch, no refrigeration available</span>
                      </li>
                      <li className="text-xs flex items-start">
                        <CheckCircle size={12} className="text-green-500 mr-1 mt-0.5" />
                        <span>Contact: Ms. Thompson (email@school.edu)</span>
                      </li>
                    </ul>
                    <p className="text-xs mt-2 italic text-blue-600">Added to calendar with reminders</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <FileText className="text-blue-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Medical Records</h3>
              <p className="text-gray-600 text-sm mb-4">
                Store vaccination records, growth charts, prescription information, and doctor's advice—all searchable and accessible.
              </p>
              <p className="text-xs text-blue-600 italic">
                "Allie, what was the dosage for Jack's amoxicillin last time?"
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <BookOpen className="text-purple-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">School Information</h3>
              <p className="text-gray-600 text-sm mb-4">
                Keep track of homework assignments, project requirements, teacher communications, and special events.
              </p>
              <p className="text-xs text-purple-600 italic">
                "Allie, what are the sight words Emma needs to practice this week?"
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <Users className="text-amber-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Social Connections</h3>
              <p className="text-gray-600 text-sm mb-4">
                Remember names of your children's friends, their parents' contact information, addresses, and allergies or preferences.
              </p>
              <p className="text-xs text-amber-600 italic">
                "Allie, what's Tyler's friend Aiden's mom's phone number?"
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section className="py-20 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-light mb-4">The Second Brain Parents Need</h2>
            <p className="text-xl opacity-70 font-light max-w-2xl mx-auto">
              Hear from families who've reclaimed their mental space with Allie
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white bg-opacity-10 p-6 rounded-lg">
              <div className="mb-4">
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
              </div>
              <p className="text-gray-300 mb-4">
                "I used to wake up at 3 AM remembering things I needed to do. Now I just tell Allie and know it won't be forgotten. The mental freedom is incredible."
              </p>
              <p className="font-medium">Rachel, mother of three</p>
            </div>
            
            <div className="bg-white bg-opacity-10 p-6 rounded-lg">
              <div className="mb-4">
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
              </div>
              <p className="text-gray-300 mb-4">
                "As a dad, I often felt out of the loop on school details. Now I can ask Allie anything about my kids' schedules and get the full story. Game changer for co-parenting."
              </p>
              <p className="font-medium">Michael, father of two</p>
            </div>
            
            <div className="bg-white bg-opacity-10 p-6 rounded-lg">
              <div className="mb-4">
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
              </div>
              <p className="text-gray-300 mb-4">
                "The ability to snap a photo of school notices and have them automatically added to our calendar—with reminders!—has saved me from missing so many important dates."
              </p>
              <p className="font-medium">Aisha, mother of four</p>
            </div>
          </div>
          
          <div className="mt-12 bg-white bg-opacity-5 p-8 rounded-lg">
            <div className="flex items-start">
              <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center mr-4 flex-shrink-0">
                <Brain size={24} />
              </div>
              <div>
                <h3 className="text-xl font-medium mb-4">Family Memory, By The Numbers</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-3xl font-light text-blue-300">87%</p>
                    <p className="text-gray-300">of parents report less "mental clutter" and anxiety after using Allie</p>
                  </div>
                  <div>
                    <p className="text-3xl font-light text-blue-300">4.8 hrs</p>
                    <p className="text-gray-300">average weekly time saved searching for information</p>
                  </div>
                  <div>
                    <p className="text-3xl font-light text-blue-300">92%</p>
                    <p className="text-gray-300">reduction in missed appointments and school deadlines</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Mobile Experience */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-indigo-100 rounded-lg mb-4">
              <Smartphone className="text-indigo-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">Always There When You Need It</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              We focused on the essential tools parents need most, available right from your phone.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-xl font-medium mb-6">Two Essential Tools, Always Available</h3>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center mr-4 flex-shrink-0">
                    <MessageSquare size={20} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Allie Chat</h4>
                    <p className="text-gray-600 text-sm">
                      Your family's intelligent memory that understands and remembers everything—accessible through natural conversation whenever you need it.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center mr-4 flex-shrink-0">
                    <Calendar size={20} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Family Calendar</h4>
                    <p className="text-gray-600 text-sm">
                      A smart calendar that knows who needs to be where, with all the context you need—from contact information to what to bring.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 p-6 bg-black text-white rounded-lg">
                <h4 className="font-medium mb-3">Why Less Is More</h4>
                <p className="text-sm mb-4">
                  Parents don't need another complicated app with dozens of features. You need the right tools that work seamlessly together to reduce your mental load, not add to it.
                </p>
                <p className="text-sm">
                  We built Allie's mobile experience around the two features parents told us they needed most: a reliable memory system and an intelligent calendar.
                </p>
              </div>
            </div>
            
            <div className="flex justify-center">
              <div className="w-64 h-96 bg-gray-800 rounded-3xl p-3 shadow-lg">
                <div className="w-full h-full bg-white rounded-2xl overflow-hidden flex flex-col">
                  <div className="bg-black text-white p-4 flex items-center">
                    <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center mr-2">
                      <Brain size={16} className="text-white" />
                    </div>
                    <span className="font-medium">Allie</span>
                  </div>
                  
                  <div className="flex-1 p-3 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                      <button className="bg-black text-white rounded-full px-3 py-1 text-xs font-medium flex items-center">
                        <MessageSquare size={12} className="mr-1" />
                        Chat
                      </button>
                      <button className="bg-gray-100 rounded-full px-3 py-1 text-xs font-medium flex items-center">
                        <Calendar size={12} className="mr-1" />
                        Calendar
                      </button>
                    </div>
                    
                    <div className="flex-1 bg-gray-50 rounded-lg p-2 overflow-y-auto">
                      <div className="flex justify-end mb-2">
                        <div className="bg-black text-white rounded-lg p-2 max-w-full text-xs">
                          <p>What do I need to bring to Emma's doctor appointment tomorrow?</p>
                        </div>
                      </div>
                      
                      <div className="flex mb-2">
                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center mr-1 flex-shrink-0">
                          <Brain size={12} className="text-purple-600" />
                        </div>
                        <div className="bg-gray-200 rounded-lg p-2 max-w-full text-xs">
                          <p>For Emma's appointment with Dr. Garcia tomorrow at 2:30 PM, you'll need:</p>
                          <ul className="pl-4 list-disc text-xs mt-1">
                            <li>Insurance card</li>
                            <li>Growth chart from last visit</li>
                            <li>List of current medications</li>
                            <li>Questions about the rash (you mentioned this last week)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center">
                      <input type="text" placeholder="Ask Allie..." className="flex-1 px-2 py-1 border rounded-lg text-xs" />
                      <div className="flex ml-2">
                        <button className="p-1 rounded-full bg-gray-100">
                          <Mic size={14} className="text-gray-600" />
                        </button>
                        <button className="p-1 rounded-full bg-black text-white ml-1">
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-light mb-4">Your Family Memory Awaits</h2>
          <p className="text-xl opacity-80 mb-8 max-w-2xl mx-auto font-light">
            Free your mind from the mental load. Let Allie remember it all for you.
          </p>
          <button 
            onClick={() => navigate('/onboarding')}
            className="px-8 py-4 bg-white text-black rounded-md font-medium hover:bg-gray-100"
          >
            Get Started with Allie
          </button>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="px-6 py-12 bg-white border-t">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h2 className="text-2xl font-light mb-4">Allie</h2>
              <p className="text-gray-600">Balancing family responsibilities together</p>
            </div>
            
            <div>
              <h3 className="text-gray-800 font-medium mb-4">Product</h3>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigate('/how-it-works')} className="text-gray-600 hover:text-gray-900">How It Works</button>
                </li>
                <li>
                  <button onClick={() => navigate('/relationship-features')} className="text-gray-600 hover:text-gray-900">Relationship Features</button>
                </li>
                <li>
                  <button onClick={() => navigate('/ai-assistant')} className="text-gray-600 hover:text-gray-900">AI Assistant</button>
                </li>
                <li>
                  <button onClick={() => navigate('/family-memory')} className="text-gray-600 hover:text-gray-900">Family Memory</button>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-gray-800 font-medium mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigate('/about-us')} className="text-gray-600 hover:text-gray-900">About Us</button>
                </li>
                <li>
                  <button onClick={() => navigate('/blog')} className="text-gray-600 hover:text-gray-900">Blog</button>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-gray-800 font-medium mb-4">Support</h3>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigate('/faq')} className="text-gray-600 hover:text-gray-900">FAQ</button>
                </li>
                <li>
                  <button onClick={() => navigate('/contact')} className="text-gray-600 hover:text-gray-900">Contact Us</button>
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

export default FamilyMemoryPage;
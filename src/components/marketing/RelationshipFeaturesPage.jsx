import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Command, Calendar, Database, Brain, MessageSquare, 
  ShieldCheck, Clock, Heart, Star, BarChart, 
  BookOpen, Users, Smile, Activity, Zap, RefreshCw,
  ArrowRight, FileText, CheckCircle, PieChart, Layout,
  UploadCloud, Search, Bookmark, Bell, Target, Layers,
  Repeat, MoreHorizontal, Cpu, Shield, MicrophoneIcon as Microphone,
  Camera, Smartphone, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const FamilyCommandCenterPage = () => {
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
              onClick={() => navigate('/family-command-center')}
              className="text-black font-medium border-b-2 border-black"
            >
              Family Command Center
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
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
              <Command size={32} className="text-black" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-light mb-6">The Family Command Center</h1>
          <p className="text-xl font-light max-w-2xl mx-auto">
            The intelligent heart of your family—connecting schedules, documents, child development, and relationships in one unified hub.
          </p>
          <div className="flex justify-center mt-8">
            <button 
              onClick={() => navigate('/onboarding')}
              className="px-6 py-3 bg-white text-black rounded-md font-medium hover:bg-gray-100"
            >
              Take Command Today
            </button>
          </div>
        </div>
      </section>
      
      {/* Command Center Overview */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block p-2 bg-purple-100 rounded-lg mb-4">
                <Layout className="text-purple-600" size={24} />
              </div>
              <h2 className="text-3xl font-light mb-6">Your Family's Digital Command Center</h2>
              <p className="text-lg mb-4 font-light">
                Families today manage an overwhelming amount of information across disconnected systems—calendars, messages, documents, reminders, and more.
              </p>
              <p className="text-lg mb-4 font-light">
                The Family Command Center unifies everything in one intelligent hub, creating a seamless system where information flows effortlessly between all aspects of family life.
              </p>
              <p className="text-lg font-light">
                Powered by AI, it not only organizes your family data but actively learns and anticipates your needs, ensuring nothing falls through the cracks.
              </p>
            </div>
            <div className="bg-gray-50 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-4 flex items-center">
                <Brain className="text-blue-600 mr-2" size={24} />
                Command Center Intelligence
              </h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mr-3">
                    <Cpu className="text-blue-600" size={16} />
                  </div>
                  <div>
                    <p className="font-medium">Adaptive Learning</p>
                    <p className="text-sm text-gray-600">
                      Allie learns from every interaction, survey response, and document to build a detailed understanding of your family's patterns and needs
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mr-3">
                    <MessageSquare className="text-blue-600" size={16} />
                  </div>
                  <div>
                    <p className="font-medium">Natural Language Understanding</p>
                    <p className="text-sm text-gray-600">
                      Advanced NLU lets you interact naturally, whether adding events from a screenshot or asking for childhood milestones from years ago
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mr-3">
                    <Layers className="text-blue-600" size={16} />
                  </div>
                  <div>
                    <p className="font-medium">Contextual Awareness</p>
                    <p className="text-sm text-gray-600">
                      The system maintains connections between events, documents, and people to provide a complete picture of your family's needs
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* The Five Command Systems */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-purple-100 rounded-lg mb-4">
              <Command className="text-purple-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">The Five Command Systems</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              A comprehensive approach to family management, working together as one integrated system
            </p>
          </div>
          
          {/* Calendar Command */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-8 overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3 bg-blue-600 text-white p-8 flex flex-col justify-center">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4">
                  <Calendar size={32} className="text-blue-600" />
                </div>
                <h3 className="text-2xl font-light mb-2">Calendar Command</h3>
                <p className="text-sm opacity-90">
                  The unified scheduling system that brings every family commitment into one intelligent view
                </p>
              </div>
              <div className="md:w-2/3 p-8">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <CheckCircle size={20} className="text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Universal Event Capture</p>
                      <p className="text-sm text-gray-600">
                        Add events from text conversations, screenshots, voice commands, or images of invitations
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle size={20} className="text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Smart Scheduling</p>
                      <p className="text-sm text-gray-600">
                        AI-powered suggestions for optimal family meeting times and event planning based on everyone's patterns
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle size={20} className="text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Family-Wide Visibility</p>
                      <p className="text-sm text-gray-600">
                        See everyone's commitments in one place—school events, medical appointments, activities, and tasks
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-4 mt-2 border-t border-gray-100">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm italic text-blue-800">
                        "Just a simple 'Hey Allie, add Emma's soccer practice every Tuesday at 4pm' and it's on the calendar with reminders for everyone. The days of forgotten commitments are over."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Document Command */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-8 overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3 bg-amber-600 text-white p-8 flex flex-col justify-center">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4">
                  <Database size={32} className="text-amber-600" />
                </div>
                <h3 className="text-2xl font-light mb-2">Document Command</h3>
                <p className="text-sm opacity-90">
                  The intelligent document system that captures, organizes, and recalls family information
                </p>
              </div>
              <div className="md:w-2/3 p-8">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <CheckCircle size={20} className="text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Multi-Source Document Capture</p>
                      <p className="text-sm text-gray-600">
                        Upload documents through photos, PDF attachments, text scan, or direct chat input
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle size={20} className="text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Intelligent Organization</p>
                      <p className="text-sm text-gray-600">
                        Automatic categorization connecting documents to medical providers, schools, or relevant family members
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle size={20} className="text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Long-Term Information Retrieval</p>
                      <p className="text-sm text-gray-600">
                        Ask questions about past documents years later—"What words did the teacher want us to practice last year?"
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-4 mt-2 border-t border-gray-100">
                    <div className="bg-amber-50 p-4 rounded-lg">
                      <p className="text-sm italic text-amber-800">
                        "I snapped a photo of our pediatrician's instructions and six months later asked Allie what dosage was recommended. It pulled up the exact info and the original document—like having a perfect memory."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Child Development Command */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-8 overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3 bg-green-600 text-white p-8 flex flex-col justify-center">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4">
                  <Activity size={32} className="text-green-600" />
                </div>
                <h3 className="text-2xl font-light mb-2">Child Development Command</h3>
                <p className="text-sm opacity-90">
                  The comprehensive tracking system for your children's growth, health, and education
                </p>
              </div>
              <div className="md:w-2/3 p-8">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <CheckCircle size={20} className="text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Multi-Dimensional Tracking</p>
                      <p className="text-sm text-gray-600">
                        Record medical appointments, growth measurements, emotional wellbeing, and academic progress
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle size={20} className="text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Voice-Enabled Updates</p>
                      <p className="text-sm text-gray-600">
                        Quick voice input like "Add Emma's height measurement" or "Record Jack's dentist appointment"
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle size={20} className="text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">AI-Generated Insights</p>
                      <p className="text-sm text-gray-600">
                        Smart recommendations based on developmental milestones and health patterns
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-4 mt-2 border-t border-gray-100">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm italic text-green-800">
                        "Having all our children's information in one place with smart reminders has been life-changing. Allie notices patterns we miss and reminds us of check-ups before we even think about them."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Relationship Command */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-8 overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3 bg-pink-600 text-white p-8 flex flex-col justify-center">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4">
                  <Heart size={32} className="text-pink-600" />
                </div>
                <h3 className="text-2xl font-light mb-2">Relationship Command</h3>
                <p className="text-sm opacity-90">
                  The balancing system for family workload distribution and relationship strength
                </p>
              </div>
              <div className="md:w-2/3 p-8">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <CheckCircle size={20} className="text-pink-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Workload Balance Analytics</p>
                      <p className="text-sm text-gray-600">
                        Visualize the true distribution of visible and invisible tasks across all family members
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle size={20} className="text-pink-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Research-Based Strategies</p>
                      <p className="text-sm text-gray-600">
                        10 relationship-strengthening approaches personalized to your family's specific needs
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle size={20} className="text-pink-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Guided Family Meetings</p>
                      <p className="text-sm text-gray-600">
                        Structured check-ins and discussions that strengthen connection and resolve imbalances
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-4 mt-2 border-t border-gray-100">
                    <div className="bg-pink-50 p-4 rounded-lg">
                      <p className="text-sm italic text-pink-800">
                        "The data didn't lie—I was doing 76% of the household planning. Seeing it visualized changed everything. Our relationship has improved dramatically now that we're truly sharing the load."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Chat Command */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-8 overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3 bg-indigo-600 text-white p-8 flex flex-col justify-center">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4">
                  <MessageSquare size={32} className="text-indigo-600" />
                </div>
                <h3 className="text-2xl font-light mb-2">Allie Chat Command</h3>
                <p className="text-sm opacity-90">
                  The conversational interface that brings all commands together through natural language
                </p>
              </div>
              <div className="md:w-2/3 p-8">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <CheckCircle size={20} className="text-indigo-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Natural Language Understanding</p>
                      <p className="text-sm text-gray-600">
                        Enhanced NLU detects your intent whether asking about tasks, children, or calendar events
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle size={20} className="text-indigo-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Multi-Modal Input</p>
                      <p className="text-sm text-gray-600">
                        Share text, images, voice recordings, or documents directly in conversations
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle size={20} className="text-indigo-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Complete Family Context</p>
                      <p className="text-sm text-gray-600">
                        Allie remembers your history, preferences, and needs across all command systems
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-4 mt-2 border-t border-gray-100">
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <p className="text-sm italic text-indigo-800">
                        "It's like talking to a family member who knows everything about us. I can switch from scheduling a doctor's appointment to asking about our relationship balance, and Allie follows perfectly."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* How It All Works Together */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-purple-100 rounded-lg mb-4">
              <Layers className="text-purple-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">How the Command Center Works</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              A seamless system where each component strengthens the others through AI integration
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 mb-12">
            <h3 className="text-xl font-medium mb-6 text-center">The Information Flow</h3>
            
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <UploadCloud className="text-blue-600" size={24} />
                </div>
                <h4 className="font-medium mb-2">Input Layer</h4>
                <p className="text-sm text-gray-600">
                  Multiple channels capture family information – chats, uploads, surveys, photos, and voice
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                  <Brain className="text-purple-600" size={24} />
                </div>
                <h4 className="font-medium mb-2">Processing Layer</h4>
                <p className="text-sm text-gray-600">
                  AI analyzes, connects, and synthesizes information across all command systems
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Zap className="text-green-600" size={24} />
                </div>
                <h4 className="font-medium mb-2">Action Layer</h4>
                <p className="text-sm text-gray-600">
                  Personalized insights, reminders, suggestions, and organized information delivered when needed
                </p>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-4 text-center">Real-World Example Flow</h4>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="font-bold">1</span>
                  </div>
                  <div>
                    <p className="font-medium">School Sends Home a Document</p>
                    <p className="text-sm text-gray-600 mb-2">
                      Your child's teacher sends home a note about an upcoming field trip requiring forms and payment
                    </p>
                    <div className="flex space-x-2">
                      <span className="text-xs py-1 px-2 bg-blue-100 text-blue-700 rounded-full">Input: Photo Upload</span>
                      <span className="text-xs py-1 px-2 bg-indigo-100 text-indigo-700 rounded-full">Via: Allie Chat</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="font-bold">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Command Center Processing</p>
                    <p className="text-sm text-gray-600 mb-2">
                      Allie extracts key information: due date, cost, required forms, and connects it to your child's profile
                    </p>
                    <div className="flex space-x-2">
                      <span className="text-xs py-1 px-2 bg-amber-100 text-amber-700 rounded-full">Processing: Document Analysis</span>
                      <span className="text-xs py-1 px-2 bg-purple-100 text-purple-700 rounded-full">System: Document Command</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="font-bold">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Integrated Actions Across Systems</p>
                    <p className="text-sm text-gray-600 mb-2">
                      The Command Center activates multiple systems to support this single document
                    </p>
                    <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:space-x-2">
                      <span className="text-xs py-1 px-2 bg-blue-100 text-blue-700 rounded-full">Calendar Command: Adds form due date</span>
                      <span className="text-xs py-1 px-2 bg-green-100 text-green-700 rounded-full">Child Command: Links to school record</span>
                      <span className="text-xs py-1 px-2 bg-amber-100 text-amber-700 rounded-full">Document Command: Stores original</span>
                      <span className="text-xs py-1 px-2 bg-indigo-100 text-indigo-700 rounded-full">Chat Command: Sends reminder</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="font-bold">4</span>
                  </div>
                  <div>
                    <p className="font-medium">Long-Term Command Center Memory</p>
                    <p className="text-sm text-gray-600 mb-2">
                      Months later, you can ask "What did Emma's field trip to the science museum cost last year?" and get the exact answer
                    </p>
                    <div className="flex space-x-2">
                      <span className="text-xs py-1 px-2 bg-green-100 text-green-700 rounded-full">Output: Historical Reference</span>
                      <span className="text-xs py-1 px-2 bg-purple-100 text-purple-700 rounded-full">Benefit: Institutional Family Memory</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Repeat className="text-blue-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Continuous Learning Cycle</h3>
              <p className="text-sm text-gray-600">
                Every interaction improves the system's understanding of your family's unique patterns and needs
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <CheckCircle size={14} className="text-blue-600 mr-2 flex-shrink-0" />
                    <p className="text-xs text-gray-700">Weekly check-ins provide fresh data</p>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle size={14} className="text-blue-600 mr-2 flex-shrink-0" />
                    <p className="text-xs text-gray-700">Survey responses refine understanding</p>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle size={14} className="text-blue-600 mr-2 flex-shrink-0" />
                    <p className="text-xs text-gray-700">AI adapts recommendations over time</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <Shield className="text-amber-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Privacy-First Architecture</h3>
              <p className="text-sm text-gray-600">
                Your family's data remains secure and private within your family account
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <CheckCircle size={14} className="text-amber-600 mr-2 flex-shrink-0" />
                    <p className="text-xs text-gray-700">End-to-end encryption of sensitive data</p>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle size={14} className="text-amber-600 mr-2 flex-shrink-0" />
                    <p className="text-xs text-gray-700">No data sharing with third parties</p>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle size={14} className="text-amber-600 mr-2 flex-shrink-0" />
                    <p className="text-xs text-gray-700">Parent controls for child data access</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Smartphone className="text-green-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Seamless Multi-Device Access</h3>
              <p className="text-sm text-gray-600">
                Access your Command Center from any device, anywhere, with perfect synchronization
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <CheckCircle size={14} className="text-green-600 mr-2 flex-shrink-0" />
                    <p className="text-xs text-gray-700">Mobile, tablet, and desktop optimized</p>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle size={14} className="text-green-600 mr-2 flex-shrink-0" />
                    <p className="text-xs text-gray-700">Real-time updates across all devices</p>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle size={14} className="text-green-600 mr-2 flex-shrink-0" />
                    <p className="text-xs text-gray-700">Works offline with automatic syncing</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Feature Showcase */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-blue-100 rounded-lg mb-4">
              <Star className="text-blue-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">Command Center in Action</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Explore key features that make the Family Command Center revolutionary
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Feature 1 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="h-48 bg-indigo-600 flex items-center justify-center">
                <div className="text-center p-4">
                  <MessageSquare size={32} className="text-white mx-auto mb-2" />
                  <p className="text-white font-medium">Allie Chat Experience</p>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-medium text-lg mb-2">Advanced Natural Language Understanding</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Allie's enhanced NLU engine recognizes your intent whether asking about tasks, children's records, or calendar events, creating a seamless conversational experience.
                </p>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <div className="bg-indigo-100 p-1 rounded mr-2 mt-0.5">
                      <CheckCircle size={12} className="text-indigo-600" />
                    </div>
                    <p className="text-sm">Extract events from screenshots or invitations</p>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-indigo-100 p-1 rounded mr-2 mt-0.5">
                      <CheckCircle size={12} className="text-indigo-600" />
                    </div>
                    <p className="text-sm">Process and interpret medical notes or school documents</p>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-indigo-100 p-1 rounded mr-2 mt-0.5">
                      <CheckCircle size={12} className="text-indigo-600" />
                    </div>
                    <p className="text-sm">Parse voice commands for quick information input</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="h-48 bg-amber-600 flex items-center justify-center">
                <div className="text-center p-4">
                  <FileText size={32} className="text-white mx-auto mb-2" />
                  <p className="text-white font-medium">Document Intelligence</p>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-medium text-lg mb-2">Multi-Modal Document Processing</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Share documents through photos, PDFs, or text scans and Allie intelligently extracts and organizes the information for long-term reference and retrieval.
                </p>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <div className="bg-amber-100 p-1 rounded mr-2 mt-0.5">
                      <CheckCircle size={12} className="text-amber-600" />
                    </div>
                    <p className="text-sm">Automatic categorization of medical and school documents</p>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-amber-100 p-1 rounded mr-2 mt-0.5">
                      <CheckCircle size={12} className="text-amber-600" />
                    </div>
                    <p className="text-sm">Extract key information from prescriptions, forms, and instructions</p>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-amber-100 p-1 rounded mr-2 mt-0.5">
                      <CheckCircle size={12} className="text-amber-600" />
                    </div>
                    <p className="text-sm">Retrieve specific information years later through natural questions</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="h-48 bg-blue-600 flex items-center justify-center">
                <div className="text-center p-4">
                  <Calendar size={32} className="text-white mx-auto mb-2" />
                  <p className="text-white font-medium">Unified Calendar</p>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-medium text-lg mb-2">Intelligent Event Management</h3>
                <p className="text-sm text-gray-600 mb-4">
                  A single view of all family commitments with smart scheduling capabilities that integrate with your existing calendar systems.
                </p>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <div className="bg-blue-100 p-1 rounded mr-2 mt-0.5">
                      <CheckCircle size={12} className="text-blue-600" />
                    </div>
                    <p className="text-sm">Extract events from emails, messages, and screenshots</p>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-blue-100 p-1 rounded mr-2 mt-0.5">
                      <CheckCircle size={12} className="text-blue-600" />
                    </div>
                    <p className="text-sm">Intelligent suggestions for optimal meeting times</p>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-blue-100 p-1 rounded mr-2 mt-0.5">
                      <CheckCircle size={12} className="text-blue-600" />
                    </div>
                    <p className="text-sm">Filter events by family member, category, or priority</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Feature 4 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="h-48 bg-green-600 flex items-center justify-center">
                <div className="text-center p-4">
                  <Activity size={32} className="text-white mx-auto mb-2" />
                  <p className="text-white font-medium">Child Development Tracking</p>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-medium text-lg mb-2">Comprehensive Child Profiles</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Track every aspect of your children's development with voice-enabled updates, AI insights, and document integration.
                </p>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <div className="bg-green-100 p-1 rounded mr-2 mt-0.5">
                      <CheckCircle size={12} className="text-green-600" />
                    </div>
                    <p className="text-sm">Medical history with appointment tracking and reminders</p>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-green-100 p-1 rounded mr-2 mt-0.5">
                      <CheckCircle size={12} className="text-green-600" />
                    </div>
                    <p className="text-sm">Growth charts and developmental milestone tracking</p>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-green-100 p-1 rounded mr-2 mt-0.5">
                      <CheckCircle size={12} className="text-green-600" />
                    </div>
                    <p className="text-sm">Emotional wellbeing and academic progress monitoring</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Voice Command Showcase */}
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 mb-12">
            <div className="flex flex-col md:flex-row items-center mb-6">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4 md:mb-0 md:mr-4 flex-shrink-0">
                <Microphone className="text-purple-600" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-medium mb-1 text-center md:text-left">Voice Command Integration</h3>
                <p className="text-gray-600 text-center md:text-left">Say it, and the Command Center makes it happen</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-3 flex items-center">
                  <Microphone size={16} className="text-purple-600 mr-2" />
                  Say This...
                </h4>
                <div className="space-y-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <p className="text-sm">"Add Emma's dentist appointment next Tuesday at 3pm"</p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <p className="text-sm">"Record Jack's height as 4 feet 2 inches"</p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <p className="text-sm">"Add soccer practice every Wednesday at 4pm starting next week"</p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <p className="text-sm">"Take a photo of this school form and save it to Emma's profile"</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-3 flex items-center">
                  <Zap size={16} className="text-purple-600 mr-2" />
                  ...And Allie Does This
                </h4>
                <div className="space-y-3">
                  <div className="p-2 bg-white rounded-lg border border-purple-100">
                    <p className="text-sm">Creates calendar event, sends reminder, links to dental records</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-purple-100">
                    <p className="text-sm">Updates growth chart, adds to child profile, tracks against milestones</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-purple-100">
                    <p className="text-sm">Creates recurring event, adds to child's activities, sends weekly reminders</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-purple-100">
                    <p className="text-sm">Captures, categorizes document, extracts key information, connects to school</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Multi-modal showcase */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8">
              <h3 className="text-xl font-medium mb-6 text-center">Multiple Ways to Add Information</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                    <Microphone className="text-gray-600" size={20} />
                  </div>
                  <p className="text-sm font-medium">Voice</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                    <Camera className="text-gray-600" size={20} />
                  </div>
                  <p className="text-sm font-medium">Photos</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                    <UploadCloud className="text-gray-600" size={20} />
                  </div>
                  <p className="text-sm font-medium">Documents</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                    <MessageSquare className="text-gray-600" size={20} />
                  </div>
                  <p className="text-sm font-medium">Chat</p>
                </div>
              </div>
              
              <div className="p-6 bg-indigo-50 rounded-lg">
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <MessageSquare className="text-indigo-600" size={20} />
                  </div>
                  <div>
                    <div className="mb-3">
                      <p className="text-sm italic text-indigo-700">
                        "Here's a screenshot of Jack's soccer practice schedule. Can you add these to the calendar and remind me 30 minutes before each practice?"
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-indigo-100">
                      <p className="text-sm text-gray-700">
                        I've added Jack's soccer practices to the calendar for every Tuesday and Thursday at 4:30pm starting next week. I've also set up 30-minute reminders before each practice. You can view these events in the Calendar Command or ask me about them anytime.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section className="py-20 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-light mb-4">Families in Command</h2>
            <p className="text-xl text-gray-400 font-light max-w-2xl mx-auto">
              How real families use the Command Center to transform their daily lives
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="mb-4">
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
              </div>
              <p className="text-gray-300 mb-4">
                "Having all our children's information in one place with smart reminders has been life-changing. The Document Command saved us when we needed immunization records late at night for a school trip the next day."
              </p>
              <p className="font-medium">Jennifer, mother of three</p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="mb-4">
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
              </div>
              <p className="text-gray-300 mb-4">
                "The Relationship Command transformed how we manage household responsibilities. Seeing the data didn't lie—I was handling 76% of planning. Visualizing it changed everything and our connection has improved dramatically."
              </p>
              <p className="font-medium">David, father of two</p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="mb-4">
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
              </div>
              <p className="text-gray-300 mb-4">
                "I uploaded a pediatrician's note about my child's medication through chat. Six months later, I asked Allie about the dosage and it immediately pulled up the exact information along with the original document."
              </p>
              <p className="font-medium">Michelle, mother of two</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-light mb-4">Take Command of Your Family Life</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto font-light">
            Join thousands of families creating harmony through better organization, communication, and balance.
          </p>
          <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-4">
            <button 
              onClick={() => navigate('/onboarding')}
              className="px-8 py-4 bg-white text-purple-700 rounded-md font-medium hover:bg-gray-100"
            >
              Start Your Command Center
            </button>
            <button
              onClick={() => navigate('/dashboard?demo=true')}
              className="px-8 py-4 bg-transparent border border-white text-white rounded-md font-medium hover:bg-white hover:bg-opacity-10"
            >
              See Demo <ArrowUpRight size={16} className="inline ml-1" />
            </button>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="px-6 py-12 bg-white border-t">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h2 className="text-2xl font-light mb-4">Allie</h2>
              <p className="text-gray-600 font-light">Your Family Command Center</p>
            </div>
            
            <div>
              <h3 className="text-gray-800 font-medium mb-4">Product</h3>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigate('/how-it-works')} className="text-gray-600 hover:text-gray-900 font-light">How It Works</button>
                </li>
                <li>
                  <button onClick={() => navigate('/family-command-center')} className="text-gray-600 hover:text-gray-900 font-light">Family Command Center</button>
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
            
            <div>
              <h3 className="text-gray-800 font-medium mb-4">Support</h3>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigate('/faq')} className="text-gray-600 hover:text-gray-900 font-light">FAQ</button>
                </li>
                <li>
                  <button onClick={() => navigate('/contact')} className="text-gray-600 hover:text-gray-900 font-light">Contact Us</button>
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

export default FamilyCommandCenterPage;
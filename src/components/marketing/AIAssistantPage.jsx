import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Lock, Brain, Zap, Shield, 
  ArrowRight, Calendar, Heart, Star, BarChart, 
  Users, Check, Clock, Search, List, AlertTriangle,
  RefreshCw, Code, BookOpen, Database, FileText,
  Upload, Camera, Smartphone, Layers, 
  DownloadCloud, Eye, Cpu, Sparkles, PenTool
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const AIAssistantPage = () => {
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
              onClick={() => navigate('/family-command-center')}
              className="text-gray-800 hover:text-gray-600"
            >
              Family Command Center
            </button>
            <button 
              onClick={() => navigate('/ai-assistant')}
              className="text-black font-medium border-b-2 border-black"
            >
              AI Assistant
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
          <h1 className="text-4xl md:text-5xl font-light mb-6">Meet Allie, Your Hyper-Intelligent Family Assistant</h1>
          <p className="text-xl font-light max-w-2xl mx-auto">
            Not just another AI chat—Allie learns from your family's unique patterns and data to provide personalized support exactly when you need it.
          </p>
          <div className="flex justify-center mt-8">
            <button 
              onClick={() => navigate('/onboarding')}
              className="px-6 py-3 bg-white text-black rounded-md font-medium hover:bg-gray-100"
            >
              Try Allie Now
            </button>
          </div>
        </div>
      </section>
      
      {/* Introduction to Allie Chat */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block p-2 bg-purple-100 rounded-lg mb-4">
                <MessageSquare className="text-purple-600" size={24} />
              </div>
              <h2 className="text-3xl font-light mb-6">Introducing Allie Chat—Your Family's New Superpower</h2>
              <p className="text-lg mb-4 font-light">
                Allie Chat is light-years beyond generic AI assistants. It's equipped with advanced Natural Language Understanding that comprehends your family's unique patterns and needs.
              </p>
              <p className="text-lg mb-4 font-light">
                It doesn't just respond to your questions—it anticipates what you need before you even ask, thanks to its contextual awareness of your family dynamics.
              </p>
              <p className="text-lg font-light">
                Unlike other AI assistants that reset with each conversation, Allie learns from every interaction, building a comprehensive understanding of your family over time.
              </p>
            </div>
            <div className="bg-gray-50 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-4 flex items-center">
                <Brain className="text-blue-600 mr-2" size={24} />
                Enhanced Intelligence
              </h3>
              <p className="text-gray-600 mb-4">
                Allie's advanced NLU capabilities set it apart from ordinary AI:
              </p>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mr-3">
                    <Sparkles className="text-blue-600" size={16} />
                  </div>
                  <div>
                    <p className="font-medium">Intent Recognition</p>
                    <p className="text-sm text-gray-600">
                      Allie understands what you're trying to accomplish, even when you phrase requests in different ways
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mr-3">
                    <Zap className="text-blue-600" size={16} />
                  </div>
                  <div>
                    <p className="font-medium">Context Awareness</p>
                    <p className="text-sm text-gray-600">
                      Maintains conversation history and remembers key details about your family
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mr-3">
                    <Cpu className="text-blue-600" size={16} />
                  </div>
                  <div>
                    <p className="font-medium">Continuous Learning</p>
                    <p className="text-sm text-gray-600">
                      Improves with every interaction to better meet your family's specific needs
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Document Management */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-blue-100 rounded-lg mb-4">
              <FileText className="text-blue-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">Effortless Document Management</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Say goodbye to lost medical forms, forgotten assignments, and misplaced instructions
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Camera className="text-blue-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Snap & Store</h3>
              <p className="text-gray-600 text-sm">
                Take a photo of any document—doctor's notes, homework assignments, permission slips—and Allie automatically processes and stores it.
              </p>
              <p className="mt-4 text-xs text-gray-500">
                "I snapped a photo of Emily's immunization record and Allie instantly added it to her medical history. No more searching through paper files!"
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Layers className="text-blue-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Intelligent Categorization</h3>
              <p className="text-gray-600 text-sm">
                Allie analyzes document content and automatically connects it to the right provider, child, or category—no manual filing required.
              </p>
              <p className="mt-4 text-xs text-gray-500">
                "I uploaded my son's allergy test results and Allie automatically linked them to his profile and our allergist's information."
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <BookOpen className="text-blue-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Instant Memory Recall</h3>
              <p className="text-gray-600 text-sm">
                Ask Allie about information from any document—even from years ago—and get immediate answers without digging through files.
              </p>
              <p className="mt-4 text-xs text-gray-500">
                "I asked Allie about my daughter's spelling words from last semester, and it pulled them up instantly from a teacher's note I'd shared months ago."
              </p>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-lg border border-gray-200">
            <h3 className="text-xl font-medium mb-4 flex items-center">
              <Upload className="text-black mr-2" size={24} />
              Multiple Ways to Add Documents
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="mt-0.5 mr-3">
                    <Check className="text-green-600" size={20} />
                  </div>
                  <p className="text-gray-700">
                    <span className="font-medium">Snap a photo</span> — Take a picture of any physical document
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="mt-0.5 mr-3">
                    <Check className="text-green-600" size={20} />
                  </div>
                  <p className="text-gray-700">
                    <span className="font-medium">Upload files</span> — PDFs, images, and other documents can be uploaded directly to chat
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="mt-0.5 mr-3">
                    <Check className="text-green-600" size={20} />
                  </div>
                  <p className="text-gray-700">
                    <span className="font-medium">Forward emails</span> — Send important emails directly to Allie
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="mt-0.5 mr-3">
                    <Check className="text-green-600" size={20} />
                  </div>
                  <p className="text-gray-700">
                    <span className="font-medium">Screenshot sharing</span> — Share screenshots of important information
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="mt-0.5 mr-3">
                    <Check className="text-green-600" size={20} />
                  </div>
                  <p className="text-gray-700">
                    <span className="font-medium">Text extraction</span> — Allie can extract text from images using advanced OCR
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="mt-0.5 mr-3">
                    <Check className="text-green-600" size={20} />
                  </div>
                  <p className="text-gray-700">
                    <span className="font-medium">Voice transcription</span> — Dictate important information directly to Allie
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Calendar Event Creation */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-green-100 rounded-lg mb-4">
              <Calendar className="text-green-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">Calendar Magic—Text to Events</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Never miss another appointment or activity with Allie's effortless event creation
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="text-xl font-medium mb-6 flex items-center">
                <Smartphone className="text-purple-600 mr-2" size={24} />
                From Text to Calendar
              </h3>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic mb-2">"Emma has soccer practice every Tuesday and Thursday at 4pm starting next week."</p>
                  <div className="flex items-center text-sm text-green-600">
                    <Check size={16} className="mr-1" />
                    <span>Automatically added to calendar with recurring schedule</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic mb-2">"We're invited to Jake's birthday party on Saturday, March 12th at 2pm at Adventure Zone."</p>
                  <div className="flex items-center text-sm text-green-600">
                    <Check size={16} className="mr-1" />
                    <span>Event created with location and all details preserved</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic mb-2">"Doctor Johnson's office just called. Sam's follow-up appointment is next Wednesday at 10:15am."</p>
                  <div className="flex items-center text-sm text-green-600">
                    <Check size={16} className="mr-1" />
                    <span>Added to calendar and linked to healthcare provider</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-xl font-medium mb-4">Event Sources Allie Can Process</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mr-3">
                    <Camera size={16} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">Screenshots of Invitations</p>
                    <p className="text-sm text-gray-600">
                      Share screenshots of event invites from any app and Allie creates calendar entries
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mr-3">
                    <MessageSquare size={16} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">Natural Language Descriptions</p>
                    <p className="text-sm text-gray-600">
                      Just describe the event in everyday language and Allie handles the details
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mr-3">
                    <DownloadCloud size={16} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">Forwarded Email Invites</p>
                    <p className="text-sm text-gray-600">
                      Forward invitation emails and Allie extracts all relevant event information
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mr-3">
                    <PenTool size={16} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">Handwritten Notes</p>
                    <p className="text-sm text-gray-600">
                      Take a photo of handwritten details and Allie converts them to calendar events
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-black text-white p-8 rounded-lg">
            <div className="flex items-start">
              <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center mr-4 flex-shrink-0">
                <Eye size={20} />
              </div>
              <div>
                <h3 className="text-xl font-medium mb-4">Nothing Falls Through the Cracks</h3>
                <p className="text-gray-300 mb-4">
                  Allie's enhanced Natural Language Understanding (NLU) detects calendar events even when they're mentioned casually in conversation.
                </p>
                <p className="text-white font-medium mb-4">
                  Simply chat naturally about your plans, and Allie will identify events, suggest adding them to your calendar, and ensure your family stays coordinated.
                </p>
                <div className="mt-4 bg-white bg-opacity-10 p-4 rounded-lg">
                  <p className="text-sm text-gray-300 italic">
                    "I was just chatting about weekend plans with Allie and mentioned my son's basketball game. Without me even asking, Allie offered to add it to our family calendar with all the details I'd mentioned. It's like having a personal assistant who's always paying attention!" — Michael, father of two
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Self-Learning AI */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-amber-100 rounded-lg mb-4">
              <Brain className="text-amber-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">The First AI That Truly Knows Your Family</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Allie becomes more personalized with every interaction, creating a unique AI experience for each family
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 mb-12">
            <h3 className="text-xl font-medium mb-6">The Self-Learning Cycle</h3>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="text-purple-600" size={24} />
                </div>
                <h4 className="font-medium mb-2">Chat Conversations</h4>
                <p className="text-sm text-gray-600">
                  Every conversation with Allie builds context about your family dynamics
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <List className="text-blue-600" size={24} />
                </div>
                <h4 className="font-medium mb-2">Survey Responses</h4>
                <p className="text-sm text-gray-600">
                  AI-generated surveys adapt based on previous answers to gather relevant data
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Users className="text-green-600" size={24} />
                </div>
                <h4 className="font-medium mb-2">Family Meetings</h4>
                <p className="text-sm text-gray-600">
                  Insights from guided meetings inform future AI recommendations
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <Zap className="text-red-600" size={24} />
                </div>
                <h4 className="font-medium mb-2">Personalized AI</h4>
                <p className="text-sm text-gray-600">
                  Results in an AI that anticipates needs specific to your family
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-xl font-medium mb-4 flex items-center">
                <RefreshCw className="text-blue-600 mr-2" size={24} />
                Continuous Improvement
              </h3>
              <p className="text-gray-600 mb-4">
                Unlike generic AI assistants that reset with each conversation, Allie builds a comprehensive understanding of your family:
              </p>
              <ol className="space-y-3">
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 text-sm font-bold">1</div>
                  <div className="text-sm">
                    <span className="font-medium">Learning Preferences</span>
                    <p className="text-gray-600">Remembers communication styles and scheduling preferences</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 text-sm font-bold">2</div>
                  <div className="text-sm">
                    <span className="font-medium">Pattern Recognition</span>
                    <p className="text-gray-600">Identifies recurring challenges and successful solutions for your family</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 text-sm font-bold">3</div>
                  <div className="text-sm">
                    <span className="font-medium">Adaptive Recommendations</span>
                    <p className="text-gray-600">Tailors suggestions based on what has worked for your specific family situation</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 text-sm font-bold">4</div>
                  <div className="text-sm">
                    <span className="font-medium">Anticipatory Assistance</span>
                    <p className="text-gray-600">Predicts needs based on historical patterns and current context</p>
                  </div>
                </li>
              </ol>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-xl font-medium mb-4 flex items-center">
                <BarChart className="text-purple-600 mr-2" size={24} />
                Your Family's Knowledge Graph
              </h3>
              <p className="text-gray-600 mb-4">
                Allie builds a rich knowledge graph that connects all aspects of your family life:
              </p>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <Calendar size={16} />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Events & Schedules</span>
                    <p className="text-gray-600">Comprehensive understanding of your family's time commitments</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <Users size={16} />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Family Members & Relationships</span>
                    <p className="text-gray-600">Understanding of each person's preferences, needs, and dynamics</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <FileText size={16} />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Documents & Information</span>
                    <p className="text-gray-600">Contextual recall of important information from all your documents</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <Heart size={16} />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Priorities & Values</span>
                    <p className="text-gray-600">Learns what matters most to your family to provide relevant support</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-8 rounded-lg text-white">
            <h3 className="text-xl font-medium mb-4">AI That Evolves With Your Family</h3>
            <p className="mb-4">
              Just as your family grows and changes, Allie evolves alongside you. Through ongoing learning from every interaction, Allie becomes increasingly personalized to your unique family dynamics.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white bg-opacity-10 p-4 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-white text-purple-600 flex items-center justify-center mx-auto mb-3">
                  <Clock size={20} />
                </div>
                <p className="text-sm text-center">
                  Adapts to changing schedules, routines, and developmental stages
                </p>
              </div>
              <div className="bg-white bg-opacity-10 p-4 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-white text-purple-600 flex items-center justify-center mx-auto mb-3">
                  <Brain size={20} />
                </div>
                <p className="text-sm text-center">
                  Generates increasingly personalized recommendations based on your feedback
                </p>
              </div>
              <div className="bg-white bg-opacity-10 p-4 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-white text-purple-600 flex items-center justify-center mx-auto mb-3">
                  <Zap size={20} />
                </div>
                <p className="text-sm text-center">
                  Anticipates needs with greater accuracy as it learns your family's unique patterns
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Privacy and Safety */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-green-100 rounded-lg mb-4">
              <Lock className="text-green-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">Privacy & Safety by Design</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Your family's data is sacred. That's why we've built Allie with privacy as our highest priority.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Shield className="text-green-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Private by Default</h3>
              <p className="text-gray-600 text-sm">
                All conversations with Allie stay within your family account and are never shared with other users.
              </p>
              <p className="mt-4 text-xs text-gray-500">
                "Allie keeps your family's data completely private. No data is ever shared outside your family account."
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Database className="text-green-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Secure Data Storage</h3>
              <p className="text-gray-600 text-sm">
                Your family's information is encrypted and stored using enterprise-grade security protocols.
              </p>
              <p className="mt-4 text-xs text-gray-500">
                "We use the same level of encryption that banks use to protect sensitive financial information."
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <AlertTriangle className="text-green-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Child-Safe Design</h3>
              <p className="text-gray-600 text-sm">
                Parents can control children's access to Allie, and all content is filtered for child-appropriate responses.
              </p>
              <p className="mt-4 text-xs text-gray-500">
                "Allie is designed to be safe for the whole family, with parental controls for children's access."
              </p>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-lg border border-gray-200">
            <h3 className="text-xl font-medium mb-4 flex items-center">
              <Lock className="text-black mr-2" size={24} />
              Our Privacy Commitment
            </h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="mt-0.5 mr-3">
                  <Check className="text-green-600" size={20} />
                </div>
                <p className="text-gray-700">
                  <span className="font-medium">No Data Sharing or Selling</span> — Your family's data is never sold, shared, or used to train public AI models
                </p>
              </div>
              <div className="flex items-start">
                <div className="mt-0.5 mr-3">
                  <Check className="text-green-600" size={20} />
                </div>
                <p className="text-gray-700">
                  <span className="font-medium">Localized Learning</span> — Allie only learns from your family's data to provide personalized support
                </p>
              </div>
              <div className="flex items-start">
                <div className="mt-0.5 mr-3">
                  <Check className="text-green-600" size={20} />
                </div>
                <p className="text-gray-700">
                  <span className="font-medium">Data Minimization</span> — We only collect the information necessary to provide our service
                </p>
              </div>
              <div className="flex items-start">
                <div className="mt-0.5 mr-3">
                  <Check className="text-green-600" size={20} />
                </div>
                <p className="text-gray-700">
                  <span className="font-medium">Transparency</span> — Clear explanations of how your data is used and protected
                </p>
              </div>
              <div className="flex items-start">
                <div className="mt-0.5 mr-3">
                  <Check className="text-green-600" size={20} />
                </div>
                <p className="text-gray-700">
                  <span className="font-medium">Access Control</span> — You decide who in your family can interact with Allie
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* What Allie Can Do */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-blue-100 rounded-lg mb-4">
              <Zap className="text-blue-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">What You Can Ask Allie</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Allie's enhanced NLU understands your questions and requests in natural language
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="text-xl font-medium mb-6 flex items-center">
                <Brain className="text-purple-600 mr-2" size={24} />
                Family Management & Data
              </h3>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"What does our survey data show about the mental load balance in our family?"</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"When is Emma's next checkup and what questions did the doctor say we should follow up on?"</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"Add all of Jake's spring soccer games to our family calendar."</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"Look up the vaccination records I shared with you last year—which ones will need boosters soon?"</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-medium mb-6 flex items-center">
                <Heart className="text-pink-600 mr-2" size={24} />
                Document & Information Management
              </h3>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"I'm sending you a photo of the school supply list—remind me about this in August."</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"What was in that email from the teacher about the science project due date?"</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"I'm uploading the medication instructions the doctor gave us—please save this to Sam's medical records."</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"I'm forwarding you the birthday party invitation—add it to our calendar and remind us to buy a gift next week."</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="text-xl font-medium mb-6 flex items-center">
                <Calendar className="text-blue-600 mr-2" size={24} />
                Calendar & Scheduling Assistance
              </h3>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"Find a time next week when both parents are free for a date night."</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"We need to schedule our family meeting for this week—suggest the best time based on everyone's calendar."</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"I need to reschedule Emma's dentist appointment—what openings do we have next month?"</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"Give me a preview of our family schedule for the next two weeks."</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-medium mb-6 flex items-center">
                <BookOpen className="text-green-600 mr-2" size={24} />
                Relationship & Family Support
              </h3>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"What's one thing I could do today to make my partner feel more appreciated?"</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"Based on our survey data, what's one invisible task I could take over to help balance our workload?"</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"Plan a fun family activity for this weekend that works with our schedule."</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"Our 7-year-old is struggling with homework time—what strategies might help based on our family patterns?"</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-black text-white p-8 rounded-lg">
            <div className="flex items-start">
              <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center mr-4 flex-shrink-0">
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 className="text-xl font-medium mb-4">Ask Allie Anything</h3>
                <p className="text-gray-300 mb-4">
                  Allie is constantly learning from your family's unique situation. The more you interact with Allie, the more personalized and helpful its responses become.
                </p>
                <p className="text-white font-medium mb-4">
                  Simply type your question in the chat box at the bottom right of your screen, anytime you're logged in.
                </p>
                <div className="mt-4 bg-white bg-opacity-10 p-4 rounded-lg">
                  <p className="text-sm text-gray-300 italic">
                    "Allie is uncannily intuitive. It remembers things I mentioned months ago and brings them up at just the right time. The other day it reminded me about my son's science project deadline that I'd completely forgotten about—saved us from a last-minute panic!" — Lisa, mother of two
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* How Allie Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-amber-100 rounded-lg mb-4">
              <Code className="text-amber-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">How Allie Works</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              The technology behind your personalized family AI assistant
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 mb-12">
            <h3 className="text-xl font-medium mb-6">The Technology Stack</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                  <Brain className="text-purple-600" size={24} />
                </div>
                <h4 className="font-medium mb-2">Claude AI Core</h4>
                <p className="text-sm text-gray-600">
                  Allie is built on Anthropic's Claude, one of the world's most advanced AI models, providing natural conversation and insightful responses.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <Database className="text-blue-600" size={24} />
                </div>
                <h4 className="font-medium mb-2">Family Knowledge Base</h4>
                <p className="text-sm text-gray-600">
                  Your family's data—survey responses, task history, relationship metrics—creates a personalized knowledge base for truly tailored insights.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Shield className="text-green-600" size={24} />
                </div>
                <h4 className="font-medium mb-2">Secure Architecture</h4>
                <p className="text-sm text-gray-600">
                  Built with a privacy-first approach, Allie keeps your data secure through encrypted connections and strict access controls.
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-xl font-medium mb-4 flex items-center">
                <RefreshCw className="text-blue-600 mr-2" size={24} />
                Enhanced NLU Engine
              </h3>
              <p className="text-gray-600 mb-4">
                Allie features a sophisticated Natural Language Understanding engine that:
              </p>
              <ol className="space-y-3">
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 text-sm font-bold">1</div>
                  <div className="text-sm">
                    <span className="font-medium">Intent Classification</span>
                    <p className="text-gray-600">Accurately identifies what you're trying to accomplish, even with ambiguous phrasing</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 text-sm font-bold">2</div>
                  <div className="text-sm">
                    <span className="font-medium">Entity Extraction</span>
                    <p className="text-gray-600">Identifies people, dates, times, locations, and other key information</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 text-sm font-bold">3</div>
                  <div className="text-sm">
                    <span className="font-medium">Sentiment Analysis</span>
                    <p className="text-gray-600">Recognizes emotional context and responds appropriately</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 text-sm font-bold">4</div>
                  <div className="text-sm">
                    <span className="font-medium">Domain-Specific Recognition</span>
                    <p className="text-gray-600">Special handling for calendar events, medical information, and family-specific terminology</p>
                  </div>
                </li>
              </ol>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-xl font-medium mb-4 flex items-center">
                <BarChart className="text-purple-600 mr-2" size={24} />
                Family Learning System
              </h3>
              <p className="text-gray-600 mb-4">
                Allie's AI engine improves over time by analyzing:
              </p>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <Search size={16} />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Interaction Patterns</span>
                    <p className="text-gray-600">How your family communicates and what information you find most valuable</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <Heart size={16} />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Feedback Integration</span>
                    <p className="text-gray-600">Your reactions to suggestions help refine future recommendations</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <Users size={16} />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Survey Adaptations</span>
                    <p className="text-gray-600">Each survey response helps create more targeted future questions</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <List size={16} />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Self-Revising Knowledge</span>
                    <p className="text-gray-600">Allie continuously updates its understanding of your family</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-8 rounded-lg text-white">
            <h3 className="text-xl font-medium mb-4">Beyond Ordinary AI</h3>
            <p className="mb-4">
              Unlike generic AI assistants, Allie combines cutting-edge NLU with family-specific data to create a truly personalized experience that evolves with your family.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white bg-opacity-10 p-4 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-white text-purple-600 flex items-center justify-center mx-auto mb-3">
                  <Clock size={20} />
                </div>
                <p className="text-sm text-center">
                  Every interaction builds a richer understanding of your family's unique dynamics
                </p>
              </div>
              <div className="bg-white bg-opacity-10 p-4 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-white text-purple-600 flex items-center justify-center mx-auto mb-3">
                  <Brain size={20} />
                </div>
                <p className="text-sm text-center">
                  Each document uploaded enhances Allie's ability to provide relevant assistance
                </p>
              </div>
              <div className="bg-white bg-opacity-10 p-4 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-white text-purple-600 flex items-center justify-center mx-auto mb-3">
                  <Zap size={20} />
                </div>
                <p className="text-sm text-center">
                  Regular AI updates bring new capabilities to enhance your family management experience
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-light mb-4">Experience Allie's Advanced AI Today</h2>
          <p className="text-xl opacity-80 mb-8 max-w-2xl mx-auto font-light">
            The only AI assistant that truly understands and evolves with your family.
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
                  <button onClick={() => navigate('/family-command-center')} className="text-gray-600 hover:text-gray-900">Family Command Center</button>
                </li>
                <li>
                  <button onClick={() => navigate('/ai-assistant')} className="text-gray-600 hover:text-gray-900">AI Assistant</button>
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

export default AIAssistantPage;
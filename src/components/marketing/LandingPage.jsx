import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import familyPhoto from '../../assets/family-photo.jpg';
import { 
  ArrowRight, ArrowLeft, CheckCircle, Star, Award, Brain, 
  Heart, ChevronDown, ChevronUp, Book, BarChart, Scale, 
  Clock, Sliders, AlertTriangle, Users, Target, Command,
  Calendar, MessageSquare, Database, FileText, Activity,
  Search, Upload, Bookmark, Shield, Smartphone, Sparkles,
  Zap, PlusCircle, Camera, Mic, Download, ChevronRight
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeDemo, setActiveDemo] = useState(1);
  const [activeRoadmapStep, setActiveRoadmapStep] = useState(1);
  
  // Demo steps for the interactive demo
  const demoSteps = [
    {
      title: "The Complete Family Assistant",
      description: "Allie combines AI, data science, and behavioral psychology to create a comprehensive system that manages all aspects of family life.",
      content: (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-4">The Allie Ecosystem</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center mr-3 flex-shrink-0">
                <Scale className="text-pink-600" size={20} />
              </div>
              <div>
                <p className="font-medium">Family Workload Balance</p>
                <p className="text-sm text-gray-600">
                  Measuring and equalizing the distribution of both visible tasks and invisible mental load
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3 flex-shrink-0">
                <Command className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="font-medium">Family Command Center</p>
                <p className="text-sm text-gray-600">
                  Centralized hub for scheduling, documents, and family management
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mr-3 flex-shrink-0">
                <FileText className="text-amber-600" size={20} />
              </div>
              <div>
                <p className="font-medium">Family Memory System</p>
                <p className="text-sm text-gray-600">
                  Your family's institutional memory, remembering everything so you don't have to
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                <Activity className="text-green-600" size={20} />
              </div>
              <div>
                <p className="font-medium">Child Development Tracking</p>
                <p className="text-sm text-gray-600">
                  Monitoring growth, health, education, and milestones
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Allie Chat: Your Family's AI Assistant",
      description: "An intelligent AI assistant that understands your family's unique context and needs, accessible through natural conversation.",
      content: (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h5 className="font-medium">Allie Chat</h5>
            </div>
            <div className="space-y-3">
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
                  <p className="text-sm">Jack's last dentist appointment was on March 14, 2025 with Dr. Chen. They noted good overall dental health but recommended increasing flossing to daily instead of 3x/week.</p>
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
          </div>
        </div>
      )
    },
    {
      title: "Family Command Center",
      description: "The intelligent heart of your family—connecting schedules, documents, child development, and relationships in one unified hub.",
      content: (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white p-3 rounded-lg border">
              <div className="flex items-center mb-2">
                <Calendar size={16} className="text-blue-600 mr-2" />
                <h5 className="font-medium text-sm">Calendar Command</h5>
              </div>
              <p className="text-xs text-gray-600">
                Extract events from screenshots, emails, or conversation. See everyone's schedule in one view.
              </p>
            </div>
            
            <div className="bg-white p-3 rounded-lg border">
              <div className="flex items-center mb-2">
                <Database size={16} className="text-amber-600 mr-2" />
                <h5 className="font-medium text-sm">Document Command</h5>
              </div>
              <p className="text-xs text-gray-600">
                Capture documents via photo, upload, or text. Automatically organize and connect.
              </p>
            </div>
            
            <div className="bg-white p-3 rounded-lg border">
              <div className="flex items-center mb-2">
                <Activity size={16} className="text-green-600 mr-2" />
                <h5 className="font-medium text-sm">Child Development</h5>
              </div>
              <p className="text-xs text-gray-600">
                Track growth, health, education, and milestones. Voice-enabled quick updates.
              </p>
            </div>
            
            <div className="bg-white p-3 rounded-lg border">
              <div className="flex items-center mb-2">
                <Heart size={16} className="text-pink-600 mr-2" />
                <h5 className="font-medium text-sm">Relationship Command</h5>
              </div>
              <p className="text-xs text-gray-600">
                Balance analytics, guided family meetings, and research-backed strategies.
              </p>
            </div>
          </div>
          
          <div className="bg-black p-3 rounded-lg text-white">
            <div className="flex items-center">
              <Command size={16} className="text-white mr-2" />
              <p className="text-sm font-medium">Seamless Integration</p>
            </div>
            <p className="text-xs text-gray-300 mt-1">
              All systems work together: A doctor's appointment triggers calendar events, document links, health tracking, and conversation context.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Your Family Memory",
      description: "Everything your family needs to remember, always available. Allie captures, organizes, and recalls information exactly when you need it.",
      content: (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="bg-white p-3 rounded-lg border mb-3">
            <h5 className="font-medium text-sm mb-2 flex items-center">
              <Upload size={14} className="text-blue-600 mr-2" />
              Multiple Ways to Add Information
            </h5>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-1">
                  <Mic size={16} className="text-gray-600" />
                </div>
                <p className="text-xs">Voice</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-1">
                  <Camera size={16} className="text-gray-600" />
                </div>
                <p className="text-xs">Photos</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-1">
                  <Upload size={16} className="text-gray-600" />
                </div>
                <p className="text-xs">Documents</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-1">
                  <MessageSquare size={16} className="text-gray-600" />
                </div>
                <p className="text-xs">Chat</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-lg border">
            <h5 className="font-medium text-sm mb-2">Long-Term Memory</h5>
            <div className="flex items-start mb-2">
              <div className="bg-amber-100 p-1 rounded mr-2 mt-0.5">
                <Search size={12} className="text-amber-600" />
              </div>
              <p className="text-xs text-gray-600 italic">
                "What were the 5 vocabulary words from Emma's teacher last spring?"
              </p>
            </div>
            <div className="bg-gray-50 p-2 rounded text-xs">
              <p className="mb-1">From Ms. Thompson (March 15 last year):</p>
              <p className="text-gray-700">Perseverance, Dedication, Integrity, Compassion, Collaboration</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Data-Driven Approach",
      description: "Allie uses a revolutionary system to accurately measure and visualize your family's workload distribution.",
      content: (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Task Weighting System</h4>
          <div className="bg-white p-3 rounded-lg border mb-3">
            <div className="text-xs text-gray-700 font-mono">
              TaskWeight = BaseTime × Frequency × Invisibility × EmotionalLabor × Priority
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-lg border">
              <h5 className="text-xs font-medium mb-2">Family Balance Analysis</h5>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs">
                    <span>Visible Household</span>
                    <div>
                      <span className="text-purple-600">Mama: 55%</span>
                      <span className="mx-1">|</span>
                      <span className="text-blue-600">Papa: 45%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600" style={{ width: '55%' }} />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-xs">
                    <span>Invisible Household</span>
                    <div>
                      <span className="text-purple-600">Mama: 78%</span>
                      <span className="mx-1">|</span>
                      <span className="text-blue-600">Papa: 22%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600" style={{ width: '78%' }} />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-3 rounded-lg border">
              <h5 className="text-xs font-medium mb-2">Weekly Progress</h5>
              <div className="h-20">
                <div className="flex h-full items-end">
                  {[
                    { week: 1, mama: 68, papa: 32 },
                    { week: 2, mama: 65, papa: 35 },
                    { week: 3, mama: 62, papa: 38 },
                    { week: 4, mama: 58, papa: 42 },
                    { week: 6, mama: 55, papa: 45 },
                    { week: 8, mama: 53, papa: 47 }
                  ].map((week, index) => (
                    <div key={index} className="flex-1 mx-0.5 flex flex-col items-center">
                      <div className="w-full flex">
                        <div className="bg-purple-600" style={{ height: `${week.mama * 0.5}px`, width: '50%' }} />
                        <div className="bg-blue-600" style={{ height: `${week.papa * 0.5}px`, width: '50%' }} />
                      </div>
                      <span className="text-[8px] mt-0.5">W{week.week}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];
  
  // Roadmap steps - family journey
  const roadmapSteps = [
    {
      title: "Full Family Assessment",
      description: "Comprehensive survey captures your current workload distribution, child development needs, and communication patterns.",
      icon: <BarChart className="text-blue-600" size={24} />
    },
    {
      title: "AI-Powered Command Center",
      description: "Your family's command center connects calendars, documents, child tracking, and relationship analytics in one place.",
      icon: <Command className="text-purple-600" size={24} />
    },
    {
      title: "Smart Family Memory",
      description: "Allie remembers everything - doctor's advice, school details, measurements - so you can recall it when needed.",
      icon: <Brain className="text-amber-600" size={24} />
    },
    {
      title: "Weekly Balance Progress",
      description: "Guided check-ins, personalized tasks, and family meetings create sustainable improvement in workload sharing.",
      icon: <Clock className="text-green-600" size={24} />
    },
    {
      title: "Stronger Family Connection",
      description: "Reduced mental load, better communication, and more quality time together lead to happier, healthier relationships.",
      icon: <Heart className="text-pink-600" size={24} />
    }
  ];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Navigate through demo steps
  const nextDemoStep = () => {
    setActiveDemo(prev => (prev < demoSteps.length) ? prev + 1 : prev);
  };
  
  const prevDemoStep = () => {
    setActiveDemo(prev => (prev > 1) ? prev - 1 : prev);
  };

  return (
    <div className="min-h-screen bg-white font-['Roboto']">
      {/* Header/Nav */}
      <header className="px-6 py-4 border-b bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-light">Allie</h1>
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
              className="text-gray-800 hover:text-blue-600 hover:underline transition-colors"
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
              onClick={() => navigate('/family-memory')}
              className="text-gray-800 hover:text-blue-600 hover:underline transition-colors"
            >
              Family Memory
            </button>
            <button 
              onClick={() => navigate('/blog')}
              className="text-gray-800 hover:text-blue-600 hover:underline transition-colors"
            >
              Blog
            </button>
            
          {currentUser ? (
            <button 
              onClick={() => navigate('/login', { state: { directAccess: true } })}
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
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-5xl font-light mb-6">Balance family responsibilities together.</h2>
            <p className="text-xl text-gray-600 mb-8 font-light">
              Allie is your family's all-in-one assistant, using AI to balance workload, remember everything, and make family life smoother.
            </p>
            <button 
              onClick={() => navigate('/onboarding')}
              className="px-8 py-4 bg-black text-white rounded-md text-lg font-medium hover:bg-gray-800"
            >
              Get Started
            </button>
          </div>
          <div className="hidden md:block">
            <img 
              src={familyPhoto} 
              alt="The Palsson Family" 
              className="w-full rounded-lg shadow-lg"
            />
          </div>
        </div>
      </section>
      
      {/* Interactive Demo Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">See Allie in Action</h2>
            <p className="text-lg text-gray-600 font-light">
              Discover how Allie transforms every aspect of family life
            </p>
          </div>
          
          {/* Demo Navigation */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center">
              <button 
                onClick={prevDemoStep}
                disabled={activeDemo === 1}
                className={`p-2 rounded-full ${activeDemo === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-black hover:bg-gray-200'}`}
              >
                <ArrowLeft size={24} />
              </button>
              
              <div className="flex space-x-2 mx-4">
                {demoSteps.map((_, index) => (
                  <button 
                    key={index}
                    onClick={() => setActiveDemo(index + 1)}
                    className={`w-3 h-3 rounded-full ${activeDemo === index + 1 ? 'bg-black' : 'bg-gray-300'}`}
                    aria-label={`Demo step ${index + 1}`}
                  />
                ))}
              </div>
              
              <button 
                onClick={nextDemoStep}
                disabled={activeDemo === demoSteps.length}
                className={`p-2 rounded-full ${activeDemo === demoSteps.length ? 'text-gray-400 cursor-not-allowed' : 'text-black hover:bg-gray-200'}`}
              >
                <ArrowRight size={24} />
              </button>
            </div>
          </div>
          
          {/* Demo Content */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-12">
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                  <span className="inline-block px-3 py-1 bg-black text-white rounded-full text-sm font-medium mb-4">
                    Step {activeDemo} of {demoSteps.length}
                  </span>
                  <h3 className="text-2xl font-bold mb-3">{demoSteps[activeDemo - 1].title}</h3>
                  <p className="text-gray-600 mb-6 font-light">
                    {demoSteps[activeDemo - 1].description}
                  </p>
                  
                  {demoSteps[activeDemo - 1].content}
                  
                  <button
                    onClick={nextDemoStep}
                    disabled={activeDemo === demoSteps.length}
                    className="mt-6 px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 inline-flex items-center"
                  >
                    {activeDemo === demoSteps.length ? "Get Started" : "Next Step"}
                    <ArrowRight size={16} className="ml-2" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Family Journey Section */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Your Journey to Family Balance</h2>
            <p className="text-lg text-gray-600 font-light">
              See the path from imbalance to harmony with Allie
            </p>
          </div>
          
          {/* Roadmap Steps - Horizontal Version */}
          <div className="relative mb-16">
            {/* Connecting Line */}
            <div className="absolute left-0 right-0 top-10 h-1 bg-gray-200 hidden md:block" />
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              {roadmapSteps.map((step, index) => (
                <div 
                  key={index}
                  className="relative flex flex-col items-center text-center"
                  onClick={() => setActiveRoadmapStep(index + 1)}
                >
                  {/* Circle with icon */}
                  <div 
                    className={`w-20 h-20 rounded-full bg-white flex items-center justify-center z-10 border-2 transition-all ${
                      activeRoadmapStep === index + 1 ? 'border-black shadow-lg scale-110' : 'border-gray-200'
                    }`}
                  >
                    {step.icon}
                  </div>
                  
                  {/* Step number */}
                  <div className="absolute top-0 right-0 w-6 h-6 bg-black rounded-full flex items-center justify-center text-white text-xs font-bold z-20">
                    {index + 1}
                  </div>
                  
                  <h3 className="mt-4 font-semibold text-lg">{step.title}</h3>
                  <p className="text-sm text-gray-600 font-light mt-2">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* The Problem & Solution */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-8 text-center">The Problems We're Solving</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gray-50 p-8 rounded-lg">
                <h3 className="text-xl font-medium mb-4 flex items-center">
                  <Heart className="text-red-500 mr-3" size={24} />
                  Family Imbalance Crisis
                </h3>
                <p className="text-gray-700 mb-4 font-light">
                  Research shows that imbalanced family workloads lead to:
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-red-500" />
                    <span className="font-light">33% higher parental burnout rates</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-red-500" />
                    <span className="font-light">42% more relationship conflicts</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-red-500" />
                    <span className="font-light">Reduced career advancement for the overloaded parent</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-8 rounded-lg">
                <h3 className="text-xl font-medium mb-4 flex items-center">
                  <Brain className="text-purple-500 mr-3" size={24} />
                  The Hidden Mental Load
                </h3>
                <p className="text-gray-700 mb-4 font-light">
                  Traditional approaches to balance fail because they ignore:
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-purple-500" />
                    <span className="font-light">Invisible cognitive work of planning and organizing</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-purple-500" />
                    <span className="font-light">Emotional labor of anticipating family needs</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-purple-500" />
                    <span className="font-light">The compounding effect of imbalance over time</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-8 rounded-lg">
                <h3 className="text-xl font-medium mb-4 flex items-center">
                  <Search className="text-blue-500 mr-3" size={24} />
                  The Information Overload
                </h3>
                <p className="text-gray-700 mb-4 font-light">
                  Parents struggle with information management:
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-blue-500" />
                    <span className="font-light">Remembering thousands of critical details</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-blue-500" />
                    <span className="font-light">Information scattered across emails, texts, and papers</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-blue-500" />
                    <span className="font-light">No system for capturing and retrieving knowledge</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">How Allie Helps Families</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Command className="text-purple-600" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Family Command Center</h3>
              <p className="text-gray-600 font-light">
                Centralized hub integrating calendar, documents, child tracking, and family balance analytics in one intelligent system.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="text-amber-600" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Family Memory</h3>
              <p className="text-gray-600 font-light">
                Capture everything through photos, voice, or text. Allie remembers doctor's advice, school requirements, and every important detail.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="text-blue-600" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Allie AI Assistant</h3>
              <p className="text-gray-600 font-light">
                An intelligent AI that understands your family's context, with enhanced natural language understanding for all your needs.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Results Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-8 text-center">The Results Families Experience</h2>
          
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Brain className="text-blue-600" size={24} />
              </div>
              <h3 className="text-lg font-medium mb-2">Reduced Mental Load</h3>
              <p className="text-2xl font-light text-blue-600 mb-1">87%</p>
              <p className="text-gray-600 text-sm">
                of parents report less "mental clutter" and anxiety
              </p>
            </div>
            
            <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Clock className="text-green-600" size={24} />
              </div>
              <h3 className="text-lg font-medium mb-2">Time Savings</h3>
              <p className="text-2xl font-light text-green-600 mb-1">4.8 hrs</p>
              <p className="text-gray-600 text-sm">
                average weekly time saved from information management
              </p>
            </div>
            
            <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm text-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <Heart className="text-purple-600" size={24} />
              </div>
              <h3 className="text-lg font-medium mb-2">Stronger Relationships</h3>
              <p className="text-2xl font-light text-purple-600 mb-1">92%</p>
              <p className="text-gray-600 text-sm">
                reduction in conflicts related to household responsibilities
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-light mb-4">Ready to create a more balanced family life?</h2>
          <p className="text-xl mb-8 font-light">Join thousands of families who are transforming their relationships through better balance.</p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <button 
              onClick={() => navigate('/onboarding')}
              className="px-8 py-4 bg-white text-black rounded-md text-lg font-medium hover:bg-gray-100"
            >
              Get Started
            </button>
            <button 
              onClick={() => navigate('/mini-survey')}
              className="px-8 py-4 border border-white text-white rounded-md font-light hover:bg-white hover:bg-opacity-10"
            >
              Try Our Mini Assessment
            </button>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="px-6 py-12 bg-gray-50 border-t">
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
                  <button onClick={() => navigate('/family-command-center')} className="text-gray-600 hover:text-gray-900 font-light">Family Command Center</button>
                </li>
                <li>
                  <button onClick={() => navigate('/ai-assistant')} className="text-gray-600 hover:text-gray-900 font-light">AI Assistant</button>
                </li>
                <li>
                  <button onClick={() => navigate('/family-memory')} className="text-gray-600 hover:text-gray-900 font-light">Family Memory</button>
                </li>
                <li>
                  <button onClick={() => navigate('/mini-survey')} className="text-gray-600 hover:text-gray-900 font-light">Mini Assessment</button>
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

export default LandingPage;
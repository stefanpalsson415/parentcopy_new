import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, Scale, ChevronRight, Clock, CheckCircle2, BarChart3, 
  Users, CalculatorIcon, Lightbulb, EqualIcon, FunctionSquare, 
  Puzzle, Zap, Star, Sparkles, HeartPulse, Sigma, LineChart,
  Command, Database, FileText, MessageSquare, Calendar, Heart,
  Shield, Activity, Search, Upload, Download, Book, Target,
  Layers, ArrowRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const HowThisWorksScreen = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-light cursor-pointer" onClick={() => navigate('/')}>Allie</h1>
          <nav className="hidden md:flex space-x-8">
            <button 
              onClick={() => navigate('/how-it-works')}
              className="text-black font-medium border-b-2 border-black"
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
      </div>

      {/* Hero Section */}
      <div className="bg-black text-white py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-light mb-6">Science-Driven Family Balance</h1>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Allie uses advanced mathematics, behavioral science, and AI to help families create sustainable balance in household responsibilities.
          </p>
          <div className="flex justify-center space-x-6">
            <button 
              onClick={() => navigate('/onboarding')}
              className="px-6 py-3 bg-white text-black rounded font-medium hover:bg-gray-100"
            >
              Get Started
            </button>
            <a 
              href="#science"
              className="px-6 py-3 border border-white text-white rounded font-medium hover:bg-white hover:bg-opacity-10"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>

      {/* The Allie Ecosystem */}
      <div className="py-20 bg-white" id="science">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-light mb-8 text-center">The Allie Ecosystem</h2>
          <p className="text-center text-gray-600 mb-12 max-w-3xl mx-auto">
            Allie combines advanced mathematics, behavioral science, and AI to help families achieve balance in four integrated areas:
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white border border-gray-100 p-6 rounded-lg shadow-sm text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-pink-100 flex items-center justify-center mb-4">
                <Scale className="text-pink-600" size={28} />
              </div>
              <h3 className="font-medium text-lg mb-2">Family Workload Distribution</h3>
              <p className="text-gray-600 text-sm">
                Measuring and balancing the mental load and physical tasks across parents
              </p>
            </div>
            
            <div className="bg-white border border-gray-100 p-6 rounded-lg shadow-sm text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <FileText className="text-amber-600" size={28} />
              </div>
              <h3 className="font-medium text-lg mb-2">Family Memory System</h3>
              <p className="text-gray-600 text-sm">
                Capturing and retrieving all family information when needed
              </p>
            </div>
            
            <div className="bg-white border border-gray-100 p-6 rounded-lg shadow-sm text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <Command className="text-purple-600" size={28} />
              </div>
              <h3 className="font-medium text-lg mb-2">Family Command Center</h3>
              <p className="text-gray-600 text-sm">
                Centralizing scheduling, documents, and family management
              </p>
            </div>
            
            <div className="bg-white border border-gray-100 p-6 rounded-lg shadow-sm text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Activity className="text-green-600" size={28} />
              </div>
              <h3 className="font-medium text-lg mb-2">Child Development Tracking</h3>
              <p className="text-gray-600 text-sm">
                Monitoring growth, health, education, and milestones
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* The Problem & Solution */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl font-light mb-8 text-center">The Problems We're Solving</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <h3 className="text-xl font-medium mb-4 flex items-center">
                  <HeartPulse className="text-red-500 mr-3" size={24} />
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
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-red-500" />
                    <span className="font-light">Children developing limited views of gender roles</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-sm">
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
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-purple-500" />
                    <span className="font-light">Child development impacts of parental workload models</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-sm">
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
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-blue-500" />
                    <span className="font-light">Mental burden of being the family's memory</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div>
            <h2 className="text-3xl font-light mb-8 text-center">Our Data-Driven Approach</h2>
            
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="bg-white border border-gray-100 p-6 rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <BarChart3 className="text-blue-500" size={24} />
                </div>
                <h3 className="text-lg font-medium mb-2">Measure & Quantify</h3>
                <p className="text-gray-700">
                  Our 80-question assessment captures the full spectrum of family work across visible tasks, invisible labor, and emotional responsibilities.
                </p>
              </div>
              
              <div className="bg-white border border-gray-100 p-6 rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-4">
                  <Brain className="text-green-500" size={24} />
                </div>
                <h3 className="text-lg font-medium mb-2">AI Analysis</h3>
                <p className="text-gray-700">
                  Our algorithm analyzes complex patterns in your family data to identify hidden imbalances and prioritize areas for improvement.
                </p>
              </div>
              
              <div className="bg-white border border-gray-100 p-6 rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mb-4">
                  <LineChart className="text-purple-500" size={24} />
                </div>
                <h3 className="text-lg font-medium mb-2">Progressive Growth</h3>
                <p className="text-gray-700">
                  Weekly adjustments create sustainable change through gradual improvement rather than overwhelming restructuring.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The Task Weighting System */}
      <div className="py-20 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-light mb-2 text-center">The Allie Task Weighting System</h2>
          <p className="text-center text-gray-400 mb-12 max-w-2xl mx-auto">
            Our revolutionary approach uses mathematical modeling to accurately measure family workload distribution
          </p>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-medium mb-6 flex items-center">
                <FunctionSquare className="text-yellow-500 mr-2" size={24} />
                The Formula
              </h3>
              
              <div className="bg-white bg-opacity-5 p-6 rounded-lg mb-6 overflow-x-auto">
                <pre className="font-mono text-sm text-gray-300">
                  <code>
{`TaskWeight = BaseTime × Frequency × Invisibility
         × EmotionalLabor × ResearchImpact 
         × ChildDevelopment × Priority`}
                  </code>
                </pre>
              </div>
              
              <p className="text-gray-400 mb-4">
                Each factor captures a different dimension of household and parenting work that traditional approaches miss.
              </p>
              
              <div className="bg-white bg-opacity-5 p-4 rounded-lg">
                <h4 className="text-lg mb-2 flex items-center">
                  <Sigma className="text-blue-400 mr-2" size={20} />
                  Sample Calculation
                </h4>
                <p className="text-gray-400 text-sm mb-2">Task: Weekly meal planning</p>
                <ul className="space-y-1 text-sm text-gray-400">
                  <li>• Base Weight: 4 (Substantial cognitive organization)</li>
                  <li>• Frequency: 1.2× (Weekly)</li>
                  <li>• Invisibility: 1.35× (Mostly invisible)</li>
                  <li>• Emotional Labor: 1.2× (Moderate)</li>
                  <li>• Research Impact: 1.15× (Medium impact domain)</li>
                  <li>• Child Development: 1.15× (Moderate impact)</li>
                  <li>• Priority: 1.3× (Secondary family priority)</li>
                </ul>
                <div className="mt-3 text-right">
                  <span className="text-yellow-400 font-bold">Final Weight: 13.42</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-medium mb-6 flex items-center">
                <Target className="text-green-500 mr-2" size={24} />
                The 7 Factors
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-yellow-500 font-medium">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Time-Based Weighting</h4>
                    <p className="text-sm text-gray-400">Measures both direct time investment and ongoing mental load</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-yellow-500 font-medium">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Frequency Factor</h4>
                    <p className="text-sm text-gray-400">Accounts for how often a task recurs, from daily to quarterly</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-yellow-500 font-medium">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Invisibility Multiplier</h4>
                    <p className="text-sm text-gray-400">Captures how easily work goes unnoticed by other family members</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-yellow-500 font-medium">4</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Emotional Labor Index</h4>
                    <p className="text-sm text-gray-400">Measures psychological and emotional toll beyond time investment</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-yellow-500 font-medium">5</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Research-Backed Impact</h4>
                    <p className="text-sm text-gray-400">Based on empirical studies linking specific tasks to relationship strain</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-yellow-500 font-medium">6</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Child Development Impact</h4>
                    <p className="text-sm text-gray-400">Factors in how task distribution influences children's future attitudes</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-yellow-500 font-medium">7</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Priority-Based Personalization</h4>
                    <p className="text-sm text-gray-400">Adapts weighting based on your family's specific priorities</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Family Memory Intelligence */}
      <div className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-light mb-8 text-center">Family Memory Intelligence</h2>
          <p className="text-center text-gray-600 mb-12 max-w-3xl mx-auto">
            Allie becomes your family's institutional memory, remembering everything so you don't have to.
          </p>
          
          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <div>
              <div className="bg-amber-100 w-12 h-12 flex items-center justify-center rounded-full mb-6">
                <FileText className="text-amber-600" size={24} />
              </div>
              <h3 className="text-xl font-medium mb-4">Document Intelligence</h3>
              <p className="text-gray-700 mb-6">
                Never lose an important document again. Allie analyzes, stores, and recalls everything when you need it.
              </p>
              
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <Upload className="text-amber-600" size={14} />
                  </div>
                  <p className="text-gray-700">
                    <span className="font-medium">Multi-Source Capture</span> — Photos, uploads, scans, or text – easily save any document
                  </p>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <Brain className="text-amber-600" size={14} />
                  </div>
                  <p className="text-gray-700">
                    <span className="font-medium">Automatic Organization</span> — Documents are intelligently categorized and connected to relevant people and events
                  </p>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <Search className="text-amber-600" size={14} />
                  </div>
                  <p className="text-gray-700">
                    <span className="font-medium">Knowledge Extraction</span> — Key information is identified and stored for future reference
                  </p>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <Download className="text-amber-600" size={14} />
                  </div>
                  <p className="text-gray-700">
                    <span className="font-medium">Long-Term Recall</span> — Ask about specific information from years ago and get immediate answers
                  </p>
                </li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
              <h4 className="font-medium mb-4">Document Intelligence in Action</h4>
              <div className="space-y-3">
                <div className="bg-white p-3 rounded border border-gray-200">
                  <p className="font-medium text-sm mb-1">School Notice from Last Year</p>
                  <div className="flex items-start">
                    <div className="bg-amber-100 p-1 rounded mr-2">
                      <MessageSquare size={14} className="text-amber-600" />
                    </div>
                    <p className="text-sm text-gray-600 italic">
                      "Allie, what 5 vocabulary words did Emma's teacher want us to practice last spring?"
                    </p>
                  </div>
                  <div className="mt-2 bg-gray-50 p-2 rounded text-sm">
                    <p className="mb-1">Based on a note from Ms. Thompson on March 15 last year, Emma needed to practice these words:</p>
                    <ol className="list-decimal pl-5 text-gray-700">
                      <li>Perseverance</li>
                      <li>Dedication</li>
                      <li>Integrity</li>
                      <li>Compassion</li>
                      <li>Collaboration</li>
                    </ol>
                    <p className="mt-1 text-xs italic text-blue-600">Original document available</p>
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded border border-gray-200">
                  <p className="font-medium text-sm mb-1">Medical Information Recall</p>
                  <div className="flex items-start">
                    <div className="bg-amber-100 p-1 rounded mr-2">
                      <MessageSquare size={14} className="text-amber-600" />
                    </div>
                    <p className="text-sm text-gray-600 italic">
                      "What was the dosage for Jack's amoxicillin the last time he had an ear infection?"
                    </p>
                  </div>
                  <div className="mt-2 bg-gray-50 p-2 rounded text-sm">
                    <p>
                      Dr. Chen prescribed 400mg (10ml) of amoxicillin twice daily for 10 days during Jack's last ear infection appointment on November 12. The prescription noted to take with food and complete the full course.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Command Center Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-light mb-8 text-center">Command Center Integration</h2>
          <p className="text-center text-gray-600 mb-12 max-w-3xl mx-auto">
            The Family Command Center unifies all aspects of family management into one intelligent hub.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Calendar className="text-blue-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Calendar Command</h3>
              <p className="text-gray-600 text-sm mb-4">
                The unified scheduling system that brings every family commitment into one intelligent view.
              </p>
              <ul className="text-sm space-y-2">
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Universal event capture from text, screenshots, or images</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Smart scheduling suggestions for family meetings</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Family-wide visibility across all commitments</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <Database className="text-amber-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Document Command</h3>
              <p className="text-gray-600 text-sm mb-4">
                The intelligent document system that captures, organizes, and recalls family information.
              </p>
              <ul className="text-sm space-y-2">
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Multi-source document capture through various methods</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Intelligent categorization and connection to people</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Long-term information retrieval for past documents</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Activity className="text-green-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Child Development Command</h3>
              <p className="text-gray-600 text-sm mb-4">
                The comprehensive tracking system for your children's growth, health, and education.
              </p>
              <ul className="text-sm space-y-2">
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Multi-dimensional tracking of growth and health</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Voice-enabled updates for quick recording</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">AI-generated insights based on patterns</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mb-4">
                <Heart className="text-pink-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Relationship Command</h3>
              <p className="text-gray-600 text-sm mb-4">
                The balancing system for family workload distribution and relationship strength.
              </p>
              <ul className="text-sm space-y-2">
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-pink-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Workload balance analytics with detailed visualization</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-pink-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Research-based strategies for relationship improvement</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-pink-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Guided family meetings to strengthen connection</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                <MessageSquare className="text-indigo-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Allie Chat Command</h3>
              <p className="text-gray-600 text-sm mb-4">
                The conversational interface that brings all commands together through natural language.
              </p>
              <ul className="text-sm space-y-2">
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-indigo-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Natural language understanding of family context</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-indigo-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Multi-modal input support (text, voice, images)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-indigo-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Complete family memory and contextual awareness</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="bg-black text-white p-8 rounded-lg mt-8">
            <div className="flex items-start">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mr-6 flex-shrink-0">
                <Layers className="text-black" size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-light mb-4">How It All Works Together</h3>
                <p className="text-gray-300 mb-4">
                  The Command Center isn't just a collection of features – it's an integrated system where all components work together. When you add a doctor's appointment:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle2 size={16} className="text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">Calendar Command adds it to the right person's schedule</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 size={16} className="text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">Document Command links relevant medical records</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 size={16} className="text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">Child Development Command tracks the health pattern</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 size={16} className="text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">Chat Command makes all of this accessible through conversation</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* For Parents */}
      <div id="parents" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center mb-12">
            <div className="h-px bg-black flex-grow"></div>
            <h2 className="text-3xl font-light px-6">For Parents</h2>
            <div className="h-px bg-black flex-grow"></div>
          </div>
          
          <div className="text-center mb-12">
            <h3 className="text-2xl font-medium mb-4">Your Weekly Balance Journey</h3>
            <p className="text-gray-700 max-w-2xl mx-auto">
              Allie guides your family through a structured process designed to create 
              sustainable change through gradual, data-driven improvements.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
            <div className="bg-white border border-gray-200 p-6 rounded-lg">
              <div className="flex items-center justify-center mb-6">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <span className="text-amber-600 font-bold">1</span>
                </div>
              </div>
              <h3 className="text-lg font-medium text-center mb-3">Initial Assessment</h3>
              <p className="text-gray-600 text-sm">
                Our comprehensive 80-question survey establishes your family's baseline workload 
                distribution across visible and invisible tasks.
              </p>
            </div>
            
            <div className="bg-white border border-gray-200 p-6 rounded-lg">
              <div className="flex items-center justify-center mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">2</span>
                </div>
              </div>
              <h3 className="text-lg font-medium text-center mb-3">Weekly Tasks</h3>
              <p className="text-gray-600 text-sm">
                AI-recommended tasks are specifically designed to rebalance your family's 
                workload where it matters most.
              </p>
            </div>
            
            <div className="bg-white border border-gray-200 p-6 rounded-lg">
              <div className="flex items-center justify-center mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">3</span>
                </div>
              </div>
              <h3 className="text-lg font-medium text-center mb-3">Quick Check-ins</h3>
              <p className="text-gray-600 text-sm">
                Brief 20-question follow-ups track progress, measuring the impact of 
                changes and recalibrating recommendations.
              </p>
            </div>
            
            <div className="bg-white border border-gray-200 p-6 rounded-lg">
              <div className="flex items-center justify-center mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-bold">4</span>
                </div>
              </div>
              <h3 className="text-lg font-medium text-center mb-3">Family Meetings</h3>
              <p className="text-gray-600 text-sm">
                Guided 30-minute discussions with AI-generated agendas based on 
                that week's data and achievements.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-8 rounded-lg mb-12">
            <h3 className="text-xl font-medium mb-6 flex items-center">
              <Star className="text-yellow-500 mr-2" size={24} />
              Parent-Specific Benefits
            </h3>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-medium mb-3 text-lg">For the Overloaded Parent</h4>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle2 size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Quantifiable evidence of invisible work</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Gradual relief from mental and emotional burden</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">More personal time and reduced burnout</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Framework for constructive conversation</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-3 text-lg">For the Supporting Parent</h4>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle2 size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Clear, specific ways to contribute meaningfully</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Data-driven approach that removes blame</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Stronger connection with partner and children</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Recognition of existing contributions</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* For Kids */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center mb-12">
            <div className="h-px bg-black flex-grow"></div>
            <h2 className="text-3xl font-light px-6">For Kids</h2>
            <div className="h-px bg-black flex-grow"></div>
          </div>
          
          <div className="text-center mb-12">
            <h3 className="text-2xl font-medium mb-4">Making Family Balance Fun</h3>
            <p className="text-gray-700 max-w-2xl mx-auto">
              Kids are crucial stakeholders in family balance. Allie engages them with 
              age-appropriate tools that make them part of the solution.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center mr-3">
                  <Sparkles className="text-pink-500" size={20} />
                </div>
                <h3 className="text-xl font-medium">Kid-Friendly Surveys</h3>
              </div>
              
              <p className="text-gray-700 mb-4">
                Our age-adaptive surveys use simple language, illustrations, and game mechanics 
                to gather children's perspectives on family workload.
              </p>
              
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">Simplified questions with visual cues</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">Star collection and achievement system</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">Interactive characters and animations</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">Celebration moments for participation</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                  <Users className="text-blue-500" size={20} />
                </div>
                <h3 className="text-xl font-medium">Family Participation Tools</h3>
              </div>
              
              <p className="text-gray-700 mb-4">
                Children gain agency in family balance through age-appropriate involvement 
                in the family improvement process.
              </p>
              
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">Kid-specific contribution trackers</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">Child-friendly meeting discussion prompts</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">Developmentally-appropriate task suggestions</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">Family progress celebration features</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* The Results */}
      <div className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-light mb-8 text-center">The Results</h2>
          
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Brain className="text-blue-600" size={24} />
              </div>
              <h3 className="text-lg font-medium mb-2">Reduced Mental Load</h3>
              <p className="text-2xl font-light text-blue-600 mb-1">87%</p>
              <p className="text-gray-600 text-sm">
                of parents report less "mental clutter" and anxiety after using Allie
              </p>
            </div>
            
            <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Clock className="text-green-600" size={24} />
              </div>
              <h3 className="text-lg font-medium mb-2">Time Savings</h3>
              <p className="text-2xl font-light text-green-600 mb-1">4.8 hrs</p>
              <p className="text-gray-600 text-sm">
                average weekly time saved from searching for information
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
          
          <div className="bg-black text-white p-8 rounded-lg">
            <h3 className="text-xl font-medium mb-6 text-center">The Allie Difference</h3>
            <p className="text-gray-300 mb-6 text-center">
              Unlike other family apps that focus only on scheduling or tasks, Allie provides a comprehensive solution that:
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-white font-medium">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Measures What Matters</h4>
                    <p className="text-sm text-gray-300">Quantifies both visible and invisible family work</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-white font-medium">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Learns Your Family</h4>
                    <p className="text-sm text-gray-300">Builds a unique understanding of your specific family patterns</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-white font-medium">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Integrates Everything</h4>
                    <p className="text-sm text-gray-300">Connects scheduling, documents, tracking, and balance</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-white font-medium">4</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Remembers It All</h4>
                    <p className="text-sm text-gray-300">Serves as your family's institutional memory</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-white font-medium">5</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Evolves Over Time</h4>
                    <p className="text-sm text-gray-300">Continuously improves with more data about your family</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-light mb-6">Join Our Family Balance Revolution</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Experience the benefits of a more harmonious, equitable family life with Allie.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <button 
              onClick={() => navigate('/onboarding')}
              className="px-8 py-4 bg-white text-black rounded-md font-medium hover:bg-gray-100"
            >
              Create Your Family
            </button>
            <button 
              onClick={() => navigate('/mini-survey')}
              className="px-8 py-4 border border-white text-white rounded-md font-light hover:bg-white hover:bg-opacity-10"
            >
              Try Our Mini Assessment
            </button>
          </div>
        </div>
      </div>
      
      {/* Footer */}
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

export default HowThisWorksScreen;
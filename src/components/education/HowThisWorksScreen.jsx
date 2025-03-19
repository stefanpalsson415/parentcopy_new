import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, Scale, ChevronRight, Clock, CheckCircle2, BarChart3, 
  Users, CalculatorIcon, Lightbulb, EqualIcon, FunctionSquare, 
  Puzzle, Zap, Star, Sparkles, HeartPulse, Sigma, LineChart
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
              className="text-gray-800 hover:text-gray-600"
            >
              About Us
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

      {/* The Problem & Solution */}
      <div className="py-20 bg-white" id="science">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl font-light mb-8 text-center">The Problem We're Solving</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gray-50 p-8 rounded-lg">
                <h3 className="text-xl font-medium mb-4 flex items-center">
                  <HeartPulse className="text-red-500 mr-3" size={24} />
                  Family Imbalance Crisis
                </h3>
                <p className="text-gray-700 mb-4">
                  Research shows that imbalanced family workloads lead to:
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-red-500" />
                    <span>33% higher parental burnout rates</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-red-500" />
                    <span>42% more relationship conflicts</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-red-500" />
                    <span>Reduced career advancement for the overloaded parent</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-red-500" />
                    <span>Children developing limited views of gender roles</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-8 rounded-lg">
                <h3 className="text-xl font-medium mb-4 flex items-center">
                  <Lightbulb className="text-yellow-500 mr-3" size={24} />
                  The Hidden Mental Load
                </h3>
                <p className="text-gray-700 mb-4">
                  Traditional approaches to balance fail because they ignore:
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-yellow-500" />
                    <span>Invisible cognitive work of planning and organizing</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-yellow-500" />
                    <span>Emotional labor of anticipating family needs</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-yellow-500" />
                    <span>The compounding effect of imbalance over time</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-yellow-500" />
                    <span>Child development impacts of parental workload models</span>
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
                <Puzzle className="text-green-500 mr-2" size={24} />
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
          
          <div className="mt-16 text-center">
            <h3 className="text-xl font-medium mb-4">Why This Matters</h3>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
              By accurately measuring the invisible dimensions of household work, we can create truly balanced 
              family dynamics that traditional "time-based" methods miss.
            </p>
            
            <a 
              href="#parents"
              className="px-6 py-3 bg-white text-black rounded-full inline-flex items-center font-medium hover:bg-gray-200"
            >
              <Zap className="mr-2" size={18} />
              See How It Works for Your Family
            </a>
          </div>
        </div>
      </div>

      {/* For Parents Section */}
      <div id="parents" className="py-20">
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
          
          <div className="bg-white border border-gray-100 p-8 rounded-lg shadow-sm">
            <h3 className="text-xl font-medium mb-6 flex items-center">
              <EqualIcon className="text-blue-500 mr-2" size={24} />
              Advanced Analytics Dashboard
            </h3>
            
            <div className="md:flex items-center">
              <div className="md:w-1/2 mb-6 md:mb-0 md:pr-8">
                <p className="text-gray-700 mb-6">
                  Our family dashboard uses visualizations to reveal hidden patterns in your workload distribution:
                </p>
                
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center mr-2 flex-shrink-0">
                      <span className="text-amber-600 font-bold text-sm">1</span>
                    </div>
                    <span className="text-gray-700">Multi-perspective radar charts showing each family member's perception</span>
                  </li>
                  
                  <li className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-2 flex-shrink-0">
                      <span className="text-green-600 font-bold text-sm">2</span>
                    </div>
                    <span className="text-gray-700">Category-specific balance scores across all task domains</span>
                  </li>
                  
                  <li className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2 flex-shrink-0">
                      <span className="text-blue-600 font-bold text-sm">3</span>
                    </div>
                    <span className="text-gray-700">Time-series tracking of balance improvement over weeks</span>
                  </li>
                  
                  <li className="flex items-start">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center mr-2 flex-shrink-0">
                      <span className="text-purple-600 font-bold text-sm">4</span>
                    </div>
                    <span className="text-gray-700">Perception gap analysis between different family members</span>
                  </li>
                </ul>
              </div>
              
              <div className="md:w-1/2 bg-gray-50 p-4 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-400 mb-2">Dashboard Visualization</p>
                  <div className="text-sm text-gray-500">[Interactive dashboard preview coming soon]</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* For Kids Section */}
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
          
          <div className="bg-black text-white p-8 rounded-lg mb-16">
            <h3 className="text-xl font-medium mb-6 flex items-center">
              <Star className="text-yellow-400 mr-2" size={24} />
              Why Kids' Involvement Matters
            </h3>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-medium mb-3 text-lg">Short-Term Benefits</h4>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle2 size={18} className="text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-300">Reveals perception differences between parents and children</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 size={18} className="text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-300">Increases awareness of all family members' contributions</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 size={18} className="text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-300">Develops early understanding of fairness and balance</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-3 text-lg">Long-Term Effects</h4>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle2 size={18} className="text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-300">Creates more positive gender role models</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 size={18} className="text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-300">Develops lifelong skills in equitable relationship building</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 size={18} className="text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-300">Fosters healthy expectations for their own future families</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 text-sm text-gray-400">
              <p>
                <strong>Research Finding:</strong> According to a 2022 Harvard study, children who observe balanced 
                household responsibilities are 68% more likely to establish equitable relationships in adulthood.
              </p>
            </div>
          </div>
          
          <div className="text-center">
            <h3 className="text-xl font-medium mb-4">The Full Family Experience</h3>
            <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
              By bringing all family perspectives together, Allie creates a 360° view 
              of your household workload that drives meaningful change.
            </p>
            
            <button 
              onClick={() => navigate('/mini-survey')}
              className="px-6 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-900 mb-4"
            >
              Try Our Mini-Assessment
            </button>
            <p className="text-sm text-gray-500">
              See how balanced your family is with our free 20-question survey
            </p>
          </div>
        </div>
      </div>

      {/* Ready to Start */}
      <div className="bg-black py-16 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-light mb-6">Ready for a More Balanced Family Life?</h2>
          <p className="text-xl opacity-80 mb-8 max-w-2xl mx-auto">
            Join thousands of families who are discovering the power of data-driven balance.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <button 
              onClick={() => navigate('/signup')}
              className="px-8 py-4 bg-white text-black rounded-md font-medium hover:bg-gray-100"
            >
              Get Started
            </button>
            <button 
              onClick={() => navigate('/blog')}
              className="px-8 py-4 border border-white text-white rounded-md font-medium hover:bg-white hover:bg-opacity-10"
            >
              Read Success Stories
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
              <p className="text-gray-600">Balancing family responsibilities together</p>
            </div>
            
            <div>
              <h3 className="text-gray-800 font-medium mb-4">Product</h3>
              <ul className="space-y-2">
                
                <li>
                  <button onClick={() => navigate('/how-it-works')} className="text-gray-600 hover:text-gray-900">How It Works</button>
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
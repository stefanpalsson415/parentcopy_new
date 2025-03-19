import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import familyPhoto from '../../assets/family-photo.jpg';
import { 
  ArrowRight, ArrowLeft, CheckCircle, Star, Award, Brain, 
  Heart, ChevronDown, ChevronUp, Book, BarChart, Scale, 
  Clock, Sliders, AlertTriangle, Users, Target, PlusCircle, LogOut,
  ChevronRight
} from 'lucide-react';

const LandingPage = () => {
  console.log("LandingPage attempting to render...");

  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeDemo, setActiveDemo] = useState(1);
  const [activeRoadmapStep, setActiveRoadmapStep] = useState(1);
  
  // Sample family data for the interactive demo
  const sampleFamilyData = {
    name: "The Johnsons",
    members: [
      { name: "Sarah", role: "Mama", taskPercentage: 68 },
      { name: "Mike", role: "Papa", taskPercentage: 32 },
      { name: "Emma", age: 8 },
      { name: "Noah", age: 5 }
    ],
    taskCategories: [
      { name: "Visible Household", mama: 58, papa: 42 },
      { name: "Invisible Household", mama: 72, papa: 28 },
      { name: "Visible Parental", mama: 60, papa: 40 },
      { name: "Invisible Parental", mama: 82, papa: 18 }
    ],
    weeklyProgress: [
      { week: 1, mamaPercentage: 68, papaPercentage: 32 },
      { week: 2, mamaPercentage: 65, papaPercentage: 35 },
      { week: 3, mamaPercentage: 62, papaPercentage: 38 },
      { week: 4, mamaPercentage: 58, papaPercentage: 42 },
      { week: 6, mamaPercentage: 55, papaPercentage: 45 },
      { week: 8, mamaPercentage: 53, papaPercentage: 47 }
    ]
  };
  
  // Demo steps for the interactive demo
  const demoSteps = [
    {
      title: "Initial Assessment",
      description: "Each family member completes an 80-question assessment to establish your family's baseline balance.",
      content: (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">The Math Behind the Assessment</h4>
          <p className="text-sm text-gray-600 mb-3">
            Our assessment uses a proprietary algorithm to weight tasks based on:
          </p>
          <ul className="space-y-1 text-sm text-gray-600">
            <li className="flex items-center">
              <span className="w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center mr-2 flex-shrink-0">
                <span className="text-purple-600 text-xs">1</span>
              </span>
              <span>Time investment: BaseTime (1-5 scale)</span>
            </li>
            <li className="flex items-center">
              <span className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center mr-2 flex-shrink-0">
                <span className="text-blue-600 text-xs">2</span>
              </span>
              <span>Frequency: Daily (1.5×) to Quarterly (0.8×)</span>
            </li>
            <li className="flex items-center">
              <span className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center mr-2 flex-shrink-0">
                <span className="text-green-600 text-xs">3</span>
              </span>
              <span>Invisibility: Highly visible (1.0×) to Completely invisible (1.5×)</span>
            </li>
            <li className="flex items-center">
              <span className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center mr-2 flex-shrink-0">
                <span className="text-red-600 text-xs">4</span>
              </span>
              <span>Emotional Labor: Minimal (1.0×) to Extreme (1.4×)</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      title: "Data Visualization",
      description: "See a clear breakdown of your family's current task distribution across all categories.",
      content: (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">The Johnson Family Balance</h4>
          <div className="space-y-3">
            {sampleFamilyData.taskCategories.map((category, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm">
                  <span>{category.name}</span>
                  <div>
                    <span className="text-purple-600">Mama: {category.mama}%</span>
                    <span className="mx-2">|</span>
                    <span className="text-blue-600">Papa: {category.papa}%</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600"
                    style={{ width: `${category.mama}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-3">
            TaskWeight = BaseTime × Frequency × Invisibility × EmotionalLabor × Priority
          </p>
        </div>
      )
    },
    {
      title: "AI-Powered Insights",
      description: "Receive personalized recommendations based on your family's unique imbalances.",
      content: (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Sample Insight Analysis</h4>
          <div className="p-3 bg-white rounded border border-gray-200">
            <div className="flex items-start">
              <Brain className="text-purple-600 mt-1 mr-2 flex-shrink-0" size={16} />
              <div>
                <p className="text-sm font-medium text-gray-800">Invisible Household Tasks Imbalance</p>
                <p className="text-xs text-gray-600">
                  Our AI has detected that Mama is handling 72% of invisible household tasks, creating a significant imbalance of 44%. 
                  We recommend Papa takes over meal planning (weight: 13.42) to improve balance.
                </p>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            AI recommendations are generated using a combination of pattern recognition and mathematical weighting.
          </div>
        </div>
      )
    },
    {
      title: "Weekly Check-ins",
      description: "Quick 5-minute surveys to track progress and adjust recommendations in real-time.",
      content: (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Weekly Progress</h4>
          <div className="h-32">
            <div className="flex h-full items-end">
              {sampleFamilyData.weeklyProgress.map((week, index) => (
                <div key={index} className="flex-1 mx-1 flex flex-col items-center">
                  <div className="w-full flex">
                    <div
                      className="bg-purple-600"
                      style={{ 
                        height: `${week.mamaPercentage * 0.7}px`,
                        width: '50%'
                      }}
                    />
                    <div
                      className="bg-blue-600"
                      style={{ 
                        height: `${week.papaPercentage * 0.7}px`,
                        width: '50%'
                      }}
                    />
                  </div>
                  <span className="text-xs mt-1">W{week.week}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center mt-2 text-xs">
            <div className="flex items-center mr-4">
              <div className="w-3 h-3 bg-purple-600 mr-1" />
              <span>Mama</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-600 mr-1" />
              <span>Papa</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Guided Family Meetings",
      description: "Structured 30-minute discussions to evaluate progress and set goals together.",
      content: (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Meeting Structure</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-start">
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mr-2 flex-shrink-0 text-blue-600 text-xs font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Review Progress (5min)</p>
                <p className="text-xs text-gray-600">Examine the week's task distribution data</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mr-2 flex-shrink-0 text-blue-600 text-xs font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Celebrate Wins (5min)</p>
                <p className="text-xs text-gray-600">Acknowledge improvements in balance metrics</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mr-2 flex-shrink-0 text-blue-600 text-xs font-medium">
                3
              </div>
              <div>
                <p className="font-medium">Discuss Challenges (10min)</p>
                <p className="text-xs text-gray-600">Address any difficulties in implementing tasks</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mr-2 flex-shrink-0 text-blue-600 text-xs font-medium">
                4
              </div>
              <div>
                <p className="font-medium">Set Next Week's Goals (10min)</p>
                <p className="text-xs text-gray-600">Commit to specific tasks for the coming week</p>
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
      title: "Discover Current Imbalance",
      description: "Comprehensive assessment unveils your family's current workload distribution, including often-overlooked 'invisible' tasks.",
      icon: <BarChart className="text-blue-600" size={24} />
    },
    {
      title: "Receive Personalized Plan",
      description: "AI-generated recommendations tailored to your family's unique situation, with specific tasks to redistribute.",
      icon: <Brain className="text-purple-600" size={24} />
    },
    {
      title: "Implement Weekly Tasks",
      description: "Small, manageable changes each week create sustainable progress without overwhelming anyone.",
      icon: <Clock className="text-green-600" size={24} />
    },
    {
      title: "Family Communication",
      description: "Guided family meetings help everyone discuss progress and challenges in a constructive way.",
      icon: <Users className="text-amber-600" size={24} />
    },
    {
      title: "Balanced Family Life",
      description: "Reduced stress, stronger relationships, and healthier, happier family members through equitable task sharing.",
      icon: <Award className="text-pink-600" size={24} />
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
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-5xl font-light mb-6">Balance family responsibilities together.</h2>
            <p className="text-xl text-gray-600 mb-8 font-light">
              Allie helps families measure, analyze, and balance parenting duties for happier households.
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
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">See Allie in Action</h2>
            <p className="text-xl text-gray-600 font-light">
              Our data-driven approach measures both visible and invisible family work
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
                  <h3 className="text-2xl font-bold mb-4">{demoSteps[activeDemo - 1].title}</h3>
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
            <p className="text-xl text-gray-600 font-light">
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
      
      {/* Our Story Section */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-8">Our Family's Story</h2>
          <div className="bg-white p-8 rounded-lg shadow-md">
            <p className="text-lg mb-4 font-light">
              We built Allie because we experienced firsthand the challenges of balancing family responsibilities. Like many families, we struggled with the uneven distribution of household and parenting tasks, often not even realizing the imbalance until it led to frustration and conflict.
            </p>
            <p className="text-lg mb-4 font-light">
              As a family of five with three active children, we found ourselves constantly negotiating who would handle which tasks, from school pickups to meal planning to emotional support. We wanted a data-driven, scientific approach to understand our family dynamics better.
            </p>
            <p className="text-lg mb-4 font-light">
              Allie was born from our desire to create a tool that doesn't just identify imbalances but helps families work together to create meaningful, lasting change. We're excited to share it with your family and hope it brings more harmony to your home, just as it has to ours.
            </p>
            <p className="text-lg font-medium text-right">- The Palsson Family</p>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">How Allie Helps Families</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Measure & Track</h3>
              <p className="text-gray-600 font-light">
                Gather perspectives from every family member to objectively measure how responsibilities are distributed.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered Insights</h3>
              <p className="text-gray-600 font-light">
                Get personalized recommendations based on your family's unique dynamics and needs.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Family Meetings</h3>
              <p className="text-gray-600 font-light">
                Guided discussion frameworks to help your family communicate and implement changes effectively.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Task Weighting System */}
      <section className="py-20 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-light mb-2 text-center">The Allie Task Weighting System</h2>
          <p className="text-center text-gray-400 mb-12 max-w-2xl mx-auto font-light">
            Our revolutionary approach uses mathematical modeling to accurately measure family workload distribution
          </p>
          
          <div className="grid md:grid-cols-2 gap-12">
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
                    <p className="text-sm text-gray-400 font-light">Measures both direct time investment and ongoing mental load</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-yellow-500 font-medium">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Frequency Factor</h4>
                    <p className="text-sm text-gray-400 font-light">Accounts for how often a task recurs, from daily to quarterly</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-yellow-500 font-medium">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Invisibility Multiplier</h4>
                    <p className="text-sm text-gray-400 font-light">Captures how easily work goes unnoticed by other family members</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-yellow-500 font-medium">4</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Emotional Labor Index</h4>
                    <p className="text-sm text-gray-400 font-light">Measures psychological and emotional toll beyond time investment</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-yellow-500 font-medium">5</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Research-Backed Impact</h4>
                    <p className="text-sm text-gray-400 font-light">Based on empirical studies linking specific tasks to relationship strain</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-yellow-500 font-medium">6</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Child Development Impact</h4>
                    <p className="text-sm text-gray-400 font-light">Factors in how task distribution influences children's future attitudes</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-yellow-500 font-medium">7</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Priority-Based Personalization</h4>
                    <p className="text-sm text-gray-400 font-light">Adapts weighting based on your family's specific priorities</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* The Problem & Solution */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-8 text-center">The Problem We're Solving</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
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
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-red-500" />
                    <span className="font-light">Children developing limited views of gender roles</span>
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
                  <li className="flex items-start">
                    <ChevronRight size={18} className="mt-0.5 mr-2 flex-shrink-0 text-purple-500" />
                    <span className="font-light">Child development impacts of parental workload models</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-light mb-4">Ready to create a more balanced family life?</h2>
          <p className="text-xl mb-8 font-light">Join thousands of families who are transforming their relationships through better balance.</p>
          <button 
            onClick={() => navigate('/onboarding')}
            className="px-8 py-4 bg-white text-black rounded-md text-lg font-medium hover:bg-gray-100"
          >
            Get Started
          </button>
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
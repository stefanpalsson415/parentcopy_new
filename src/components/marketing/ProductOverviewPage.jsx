// src/components/marketing/ProductOverviewPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Play, Calendar, Users, BarChart2, MessageCircle, Award } from 'lucide-react';

const ProductOverviewPage = () => {
  const navigate = useNavigate();
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
      image: "https://images.unsplash.com/photo-1531538606174-0f90ff5dce83?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
    },
    {
      title: "Data Visualization",
      description: "See a clear breakdown of your family's current task distribution across all categories.",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
    },
    {
      title: "AI-Powered Insights",
      description: "Receive personalized recommendations based on your family's unique imbalances.",
      image: "https://images.unsplash.com/photo-1599658880436-c61792e70672?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
    },
    {
      title: "Weekly Check-ins",
      description: "Quick 5-minute surveys to track progress and adjust recommendations in real-time.",
      image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
    },
    {
      title: "Guided Family Meetings",
      description: "Structured 30-minute discussions to evaluate progress and set goals together.",
      image: "https://images.unsplash.com/photo-1576089073624-b5a6ef46b9c1?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
    },
    {
      title: "Kid-Friendly Surveys",
      description: "Age-appropriate surveys that make it fun for children to participate in the balance journey.",
      image: "https://images.unsplash.com/photo-1485546784815-e380f3c8a0e6?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
    },
    {
      title: "Gamified Learning",
      description: "Interactive elements that help kids understand family balance through play and participation.",
      image: "https://images.unsplash.com/photo-1500995617113-cf789362a3e1?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
    },
    {
      title: "Progress Celebration",
      description: "Visual feedback and celebrations when your family achieves better balance milestones.",
      image: "https://images.unsplash.com/photo-1536337005238-94b997371b40?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
    },
    {
      title: "Educational Content",
      description: "Learn about the science of family balance and how it impacts everyone's wellbeing.",
      image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
    },
    {
      title: "Customized Family Plan",
      description: "A tailored roadmap for your family's unique journey to better balance and happier relationships.",
      image: "https://images.unsplash.com/photo-1573497491765-dccce02b29df?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
    }
  ];
  
  // Roadmap steps
  const roadmapSteps = [
    {
      title: "Discover Current Imbalance",
      description: "Comprehensive assessment unveils your family's current workload distribution, including often-overlooked 'invisible' tasks.",
      icon: <BarChart2 className="text-blue-600" size={24} />
    },
    {
      title: "Receive Personalized Plan",
      description: "AI-generated recommendations tailored to your family's unique situation, with specific tasks to redistribute.",
      icon: <MessageCircle className="text-purple-600" size={24} />
    },
    {
      title: "Implement Weekly Tasks",
      description: "Small, manageable changes each week create sustainable progress without overwhelming anyone.",
      icon: <Calendar className="text-green-600" size={24} />
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
  
  // Upcoming features
  const upcomingFeatures = [
    {
      title: "AI Imbalance Detector",
      description: "Advanced machine learning that identifies 'hidden' workload imbalances from natural language conversations.",
      eta: "Summer 2025"
    },
    {
      title: "Smart Task Exchange",
      description: "Intelligent task swapping system that suggests optimal trades based on preferences and strengths.",
      eta: "Fall 2025"
    },
    {
      title: "Voice-Activated Family Assistant",
      description: "Hands-free check-ins and reminders to help busy families stay on track with their balance goals.",
      eta: "Winter 2025"
    },
    {
      title: "Emotional Labor Tracker",
      description: "Revolutionary tool that quantifies and visualizes the invisible emotional work of parenting.",
      eta: "Spring 2026"
    },
    {
      title: "Extended Family Integration",
      description: "Include grandparents and other caregivers in your family balance ecosystem for holistic support.",
      eta: "Summer 2026"
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
    <div className="min-h-screen bg-white">
      {/* Header/Nav */}
      <header className="px-6 py-4 border-b bg-white sticky top-0 z-50">
  <div className="max-w-6xl mx-auto flex justify-between items-center">
    <h1 className="text-3xl font-light">Allie</h1>
    <nav className="hidden md:flex space-x-8">
      <button 
        onClick={() => navigate('/product-overview')}
        className="text-gray-800 hover:text-blue-600 hover:underline transition-colors"
      >
        Product Overview
      </button>
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
      <button 
        onClick={() => navigate('/login')}
        className="px-4 py-2 border border-gray-800 rounded hover:bg-gray-100"
      >
        Log In
      </button>
      <button 
        onClick={() => navigate('/signup')}
        className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
      >
        Sign Up
      </button>
    </nav>
  </div>
</header>
      
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">See Allie in Action</h1>
          <p className="text-xl md:text-2xl">
            Explore how our product works and transforms family dynamics through data-driven balance
          </p>
        </div>
      </section>
      
      {/* Interactive Demo Section */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Interactive Demo</h2>
            <p className="text-xl text-gray-600">
              See how Allie helps families identify and resolve workload imbalances
            </p>
          </div>
          
          {/* Demo Navigation */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center">
              <button 
                onClick={prevDemoStep}
                disabled={activeDemo === 1}
                className={`p-2 rounded-full ${activeDemo === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'}`}
              >
                <ChevronLeft size={24} />
              </button>
              
              <div className="flex space-x-2 mx-4">
                {demoSteps.map((_, index) => (
                  <button 
                    key={index}
                    onClick={() => setActiveDemo(index + 1)}
                    className={`w-3 h-3 rounded-full ${activeDemo === index + 1 ? 'bg-blue-600' : 'bg-gray-300'}`}
                    aria-label={`Demo step ${index + 1}`}
                  />
                ))}
              </div>
              
              <button 
                onClick={nextDemoStep}
                disabled={activeDemo === demoSteps.length}
                className={`p-2 rounded-full ${activeDemo === demoSteps.length ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'}`}
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
          
          {/* Demo Content */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-12">
            <div className="p-6 md:p-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-4">
                    Step {activeDemo} of {demoSteps.length}
                  </span>
                  <h3 className="text-2xl font-bold mb-4">{demoSteps[activeDemo - 1].title}</h3>
                  <p className="text-gray-600 mb-6">
                    {demoSteps[activeDemo - 1].description}
                  </p>
                  
                  {activeDemo === 2 && (
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
                    </div>
                  )}
                  
                  {activeDemo === 4 && (
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
                  )}
                  
                  <button
                    onClick={nextDemoStep}
                    disabled={activeDemo === demoSteps.length}
                    className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
                  >
                    <Play size={16} className="mr-2" />
                    {activeDemo === demoSteps.length ? "Get Started" : "Next Step"}                  </button>
                </div>
                
                <div className="bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={demoSteps[activeDemo - 1].image}
                    alt={demoSteps[activeDemo - 1].title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Visual Roadmap Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Your Journey to Family Balance</h2>
            <p className="text-xl text-gray-600">
              See the path from imbalance to harmony with Allie
            </p>
          </div>
          
          {/* Roadmap Steps */}
          <div className="relative mb-16">
            {/* Connecting Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-blue-200 transform -translate-x-1/2 hidden md:block" />
            
            <div className="space-y-16 md:space-y-0">
              {roadmapSteps.map((step, index) => (
                <div 
                  key={index}
                  className={`relative flex flex-col ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  } items-center justify-center`}
                >
                  <div className="md:w-1/2 p-4 flex justify-center">
                    <div 
                      className={`w-64 bg-white p-6 rounded-lg shadow-md ${
                        activeRoadmapStep === index + 1 ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setActiveRoadmapStep(index + 1)}
                    >
                      <div className="flex items-center mb-3">
                        <div className="p-2 rounded-full bg-blue-100 mr-3">
                          {step.icon}
                        </div>
                        <span className="font-bold">Step {index + 1}</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  </div>
                  
                  {/* Connecting circle in the middle */}
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold absolute left-1/2 transform -translate-x-1/2 z-10 hidden md:flex">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-center">
            <button
              onClick={() => navigate('/signup')}
              className="px-8 py-4 bg-blue-600 text-white rounded-md text-lg font-medium hover:bg-blue-700"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>
      
      {/* Upcoming Features Section */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What's Coming Next</h2>
            <p className="text-xl text-gray-600">
              Exciting new features on our product roadmap
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingFeatures.map((feature, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-600" />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold">{feature.title}</h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {feature.eta}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Family's Balance?</h2>
          <p className="text-xl mb-8">Join thousands of families who are creating harmony through better workload sharing.</p>
          <button 
            onClick={() => navigate('/signup')}
            className="px-8 py-4 bg-white text-blue-600 rounded-md text-lg font-medium hover:bg-gray-100"
          >
            Get Started Free
          </button>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="px-6 py-12 bg-gray-50 border-t">
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
            <button onClick={() => navigate('/product-overview')} className="text-gray-600 hover:text-gray-900">Product Overview</button>
          </li>
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
      
      <div>
        <h3 className="text-gray-800 font-medium mb-4">Account</h3>
        <ul className="space-y-2">
          <li>
            <button onClick={() => navigate('/login')} className="text-gray-600 hover:text-gray-900">Log In</button>
          </li>
          <li>
            <button onClick={() => navigate('/signup')} className="text-gray-600 hover:text-gray-900">Sign Up</button>
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

export default ProductOverviewPage;
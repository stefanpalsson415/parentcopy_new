import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, ArrowLeft, Check, Brain, Heart, Scale, 
  Clock, BarChart, Users, Command, Calendar, 
  FileText, MessageSquare, Database, Activity, Shield, 
  Zap, Star, Target, Lock, Award, ChevronRight,
  ChevronDown, ChevronUp, AlertTriangle, RefreshCw,
  PlusCircle, Layers, Key, Sparkles
} from 'lucide-react';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, Legend, 
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, PieChart, Pie,
  Cell, LineChart, Line
} from 'recharts';
import PasswordProtection from '../shared/PasswordProtection';


const InvestorFunnel = () => {
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState(1);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [revealAnswers, setRevealAnswers] = useState({});
    const [taskSelections, setTaskSelections] = useState({});
    const [activeScienceCard, setActiveScienceCard] = useState(null);
    const [activeCommandCenter, setActiveCommandCenter] = useState('calendar');
    const [financialView, setFinancialView] = useState('revenue');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    const totalSlides = 22;
    const sliderRef = useRef(null);
    
    useEffect(() => {
      window.scrollTo(0, 0);
    }, [currentSlide]);
  
    const handleCorrectPassword = () => {
      setIsAuthenticated(true);
    };
  
    if (!isAuthenticated) {
      return <PasswordProtection onCorrectPassword={handleCorrectPassword} />;
    }
  

  const nextSlide = () => {
    if (currentSlide < totalSlides) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 1) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToSlide = (slide) => {
    if (slide >= 1 && slide <= totalSlides) {
      setCurrentSlide(slide);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight') {
      nextSlide();
    } else if (e.key === 'ArrowLeft') {
      prevSlide();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentSlide]);

  const handleQuizAnswer = (question, answer) => {
    setQuizAnswers({
      ...quizAnswers,
      [question]: answer
    });
  };

  const revealQuizAnswer = (question) => {
    setRevealAnswers({
      ...revealAnswers,
      [question]: true
    });
  };

  const toggleTaskSelection = (task) => {
    setTaskSelections({
      ...taskSelections,
      [task]: !taskSelections[task]
    });
  };

  const toggleScienceCard = (card) => {
    setActiveScienceCard(activeScienceCard === card ? null : card);
  };

  const radarData = [
    { category: 'Visible Household', before: 60, after: 53 },
    { category: 'Invisible Household', before: 81, after: 56 },
    { category: 'Visible Parental', before: 65, after: 54 },
    { category: 'Invisible Parental', before: 79, after: 58 }
  ];

  const projectionData = {
    revenue: [
      { year: 'Year 0', value: 0 },
      { year: 'Year 1', value: 1000 * 40 * 12 },
      { year: 'Year 2', value: 10000 * 40 * 12 },
      { year: 'Year 3', value: 1000000 * 40 * 12 }
    ],
    users: [
      { year: 'Year 0', value: 0 },
      { year: 'Year 1', value: 1000 },
      { year: 'Year 2', value: 10000 },
      { year: 'Year 3', value: 1000000 }
    ],
    profit: [
      { year: 'Year 0', value: -2000000 },
      { year: 'Year 1', value: 1000 * 40 * 12 * 0.75 - 3000000 },
      { year: 'Year 2', value: 10000 * 40 * 12 * 0.75 - 5000000 },
      { year: 'Year 3', value: 1000000 * 40 * 12 * 0.75 - 50000000 }
    ]
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  // Slides content
  const renderSlide = () => {
    switch(currentSlide) {
      // Slide 1: Opening Impact
      case 1:
        return (
          <div className="min-h-[80vh] flex items-center justify-center bg-black text-white px-8">
            <div className="text-center max-w-4xl">
              <h1 className="text-6xl md:text-8xl font-light mb-6 opacity-90">Allie</h1>
              <h2 className="text-xl md:text-3xl font-light mb-8 opacity-80">Your Family's Private AI Partner</h2>
              <h3 className="text-lg md:text-xl font-light opacity-70">Revolutionizing Family Dynamics Through Science-Based Support</h3>
            </div>
          </div>
        );
      
      // Slide 2: The Crisis Validation (Interactive)
      case 2:
        return (
          <div className="min-h-[80vh] flex flex-col justify-center px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-light mb-6">The Invisible Crisis in Modern Families</h2>
              
              <div className="bg-gray-50 p-6 rounded-lg mb-8">
                <h3 className="text-xl font-medium mb-4">Before we begin...</h3>
                <p className="mb-6">What percentage of parents report losing sleep due to juggling family responsibilities?</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[50, 70, 90, 40].map((option) => (
                    <button
                      key={option}
                      className={`p-4 rounded-lg border ${
                        quizAnswers.sleepLoss === option 
                          ? 'bg-black text-white border-black' 
                          : 'bg-white border-gray-200 hover:border-gray-400'
                      }`}
                      onClick={() => handleQuizAnswer('sleepLoss', option)}
                    >
                      {option}%
                    </button>
                  ))}
                </div>
                
                {quizAnswers.sleepLoss !== undefined && !revealAnswers.sleepLoss && (
                  <button
                    onClick={() => revealQuizAnswer('sleepLoss')}
                    className="mt-6 px-4 py-2 bg-black text-white rounded-lg"
                  >
                    Reveal Answer
                  </button>
                )}
                
                {revealAnswers.sleepLoss && (
                  <div className="mt-6">
                    <div className={`p-4 rounded-lg ${quizAnswers.sleepLoss === 90 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <p className="font-medium">
                        {quizAnswers.sleepLoss === 90 
                          ? 'Correct!' 
                          : `The correct answer is 90%`
                        }
                      </p>
                      <p className="mt-2">A 2025 Care.com survey of 3,000 parents found that <strong>90%</strong> lose sleep from juggling care duties, and <strong>75%</strong> feel "a sense of dread" about family responsibilities.</p>
                      <p className="mt-2 text-sm text-gray-600">Source: Care.com Parent Care Index, 2025</p>
                    </div>
                    
                    <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-start">
                        <AlertTriangle className="text-red-500 mt-1 mr-3 flex-shrink-0" size={20} />
                        <p><strong>29%</strong> of parents have considered self-harm due to the overwhelming pressure of family responsibilities.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <p className="text-lg font-light">
                Families are silently struggling with overwhelming responsibilities, yet many don't recognize the severity of their own situation.
              </p>
            </div>
          </div>
        );
      
      // Slide 3: The Demographic Challenge
      case 3:
        return (
          <div className="min-h-[80vh] flex flex-col justify-center px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-light mb-6">A Global Crisis with Personal Impact</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-medium mb-4">The Demographic Shift</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                        <ChevronRight className="text-blue-500" size={18} />
                      </div>
                      <p>Global fertility has fallen from <strong>5.1 births per woman in 1970</strong> to <strong>2.4 today</strong></p>
                    </li>
                    <li className="flex items-start">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                        <ChevronRight className="text-blue-500" size={18} />
                      </div>
                      <p>In the U.S., fertility rate is now <strong>1.6</strong> — below replacement rate</p>
                    </li>
                    <li className="flex items-start">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                        <ChevronRight className="text-blue-500" size={18} />
                      </div>
                      <p>As populations age, each young family must support <strong>more retirees</strong>, face <strong>higher taxes</strong>, and shoulder caregiving for <strong>both children and aging parents</strong></p>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-medium mb-4">Economic Consequences</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[
                          { year: 1970, ratio: 1 },
                          { year: 1980, ratio: 1.3 },
                          { year: 1990, ratio: 1.7 },
                          { year: 2000, ratio: 2.2 },
                          { year: 2010, ratio: 3.1 },
                          { year: 2020, ratio: 4.3 },
                          { year: 2025, ratio: 5.4 }
                        ]}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="ratio" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-center text-sm mt-2">Housing-Price-to-Income Ratios (1970-2025)</p>
                </div>
              </div>
              
              <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="text-yellow-600 mt-1 mr-3 flex-shrink-0" size={20} />
                  <p>This economic squeeze isn't coming — <strong>it's already here</strong>. Families face unprecedented pressure with fewer resources and support systems than previous generations.</p>
                </div>
              </div>
            </div>
          </div>
        );
      
      // Slide 4: The Awareness Gap (Interactive)
      case 4:
        return (
          <div className="min-h-[80vh] flex flex-col justify-center px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-light mb-6">The Critical Perception Gap</h2>
              
              <div className="bg-gray-50 p-6 rounded-lg mb-8">
                <h3 className="text-xl font-medium mb-4">Guess the Gap</h3>
                <p className="mb-6">What percentage of fathers vs. mothers believe household duties are shared equally?</p>
                
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Father's Perception:</label>
                  {!quizAnswers.fatherPercent && (
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      defaultValue="50"
                      className="w-full"
                      onMouseUp={(e) => handleQuizAnswer('fatherPercent', parseInt(e.target.value))}
                      ref={sliderRef}
                    />
                  )}
                  {quizAnswers.fatherPercent && (
                    <div className="flex justify-between items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-black h-2.5 rounded-full" style={{ width: `${quizAnswers.fatherPercent}%` }}></div>
                      </div>
                      <span className="ml-3 font-medium">{quizAnswers.fatherPercent}%</span>
                    </div>
                  )}
                </div>
                
                {quizAnswers.fatherPercent && !quizAnswers.motherPercent && (
                  <div className="mt-4 mb-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mother's Perception:</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      defaultValue="50"
                      className="w-full"
                      onMouseUp={(e) => handleQuizAnswer('motherPercent', parseInt(e.target.value))}
                    />
                  </div>
                )}
                
                {quizAnswers.motherPercent && (
                  <div className="mt-4 mb-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mother's Perception:</label>
                    <div className="flex justify-between items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-pink-500 h-2.5 rounded-full" style={{ width: `${quizAnswers.motherPercent}%` }}></div>
                      </div>
                      <span className="ml-3 font-medium">{quizAnswers.motherPercent}%</span>
                    </div>
                  </div>
                )}
                
                {quizAnswers.fatherPercent && quizAnswers.motherPercent && !revealAnswers.parentGap && (
                  <button
                    onClick={() => revealQuizAnswer('parentGap')}
                    className="mt-6 px-4 py-2 bg-black text-white rounded-lg"
                  >
                    Reveal Reality
                  </button>
                )}
                
                {revealAnswers.parentGap && (
                  <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                    <h4 className="font-medium mb-2">The Reality</h4>
                    
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Father's Perception:</label>
                      <div className="flex justify-between items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-black h-2.5 rounded-full" style={{ width: '59%' }}></div>
                        </div>
                        <span className="ml-3 font-medium">59%</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 mb-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mother's Perception:</label>
                      <div className="flex justify-between items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-pink-500 h-2.5 rounded-full" style={{ width: '31%' }}></div>
                        </div>
                        <span className="ml-3 font-medium">31%</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                      <p className="font-medium text-yellow-800">28% awareness gap</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        59% of fathers say household duties are shared equally, while only 31% of mothers agree.
                      </p>
                    </div>
                    
                    <p className="mt-4 text-gray-600 text-sm">
                      Both partners believe they each do <strong>most</strong> of the work, adding up to an impossible 131%.
                    </p>
                  </div>
                )}
              </div>
              
              <p className="text-lg font-light">
                This perception gap creates daily conflict in millions of homes, as each partner genuinely believes they're shouldering the majority of responsibilities.
              </p>
            </div>
          </div>
        );
      
      // Slide 5: The Mental Load Crisis (Interactive)
      case 5:
        return (
          <div className="min-h-[80vh] flex flex-col justify-center px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-light mb-6">The Hidden Mental Load</h2>
              
              <div className="bg-gray-50 p-6 rounded-lg mb-8">
                <h3 className="text-xl font-medium mb-4">Select what you think are the most burdensome tasks for parents</h3>
                <p className="mb-6 text-sm text-gray-600">Choose what you believe are the most challenging administrative tasks for families</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    'Scheduling medical appointments',
                    'Managing school communications',
                    'Remembering birthdays & events',
                    'Planning meals & grocery lists',
                    'Coordinating childcare logistics',
                    'Tracking developmental milestones',
                    'Maintaining medical records',
                    'Researching childcare options',
                    'Planning family activities',
                    'Managing household inventory',
                    'Scheduling home maintenance',
                    'Arranging playdates'
                  ].map((task) => (
                    <button
                      key={task}
                      className={`p-3 rounded-lg text-left text-sm ${
                        taskSelections[task] 
                          ? 'bg-black text-white' 
                          : 'bg-white border border-gray-200 hover:border-gray-400'
                      }`}
                      onClick={() => toggleTaskSelection(task)}
                    >
                      {task}
                    </button>
                  ))}
                </div>
                
                {Object.values(taskSelections).filter(Boolean).length > 0 && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start">
                      <CheckCircle className="text-blue-600 mt-1 mr-3 flex-shrink-0" size={20} />
                      <div>
                        <p className="font-medium text-blue-800">Allie addresses ALL of these challenges and more!</p>
                        <p className="mt-2 text-blue-700">
                          The "mental load" of family management extends beyond visible tasks to include planning, anticipating needs, researching options, and maintaining family systems.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-black text-white p-6 rounded-lg">
                <h3 className="text-xl font-medium mb-4">Traditional Approaches Fail Because They Ignore:</h3>
                
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <Brain className="text-pink-400 mt-1 mr-3 flex-shrink-0" size={20} />
                    <p>The invisible cognitive work of planning and organizing</p>
                  </li>
                  <li className="flex items-start">
                    <Heart className="text-pink-400 mt-1 mr-3 flex-shrink-0" size={20} />
                    <p>Emotional labor of anticipating family needs</p>
                  </li>
                  <li className="flex items-start">
                    <Clock className="text-pink-400 mt-1 mr-3 flex-shrink-0" size={20} />
                    <p>The compounding effect of imbalance over time</p>
                  </li>
                  <li className="flex items-start">
                    <Users className="text-pink-400 mt-1 mr-3 flex-shrink-0" size={20} />
                    <p>Child development impacts of parental workload models</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        );
      
      // Slide 6: The Solution Introduction
      case 6:
        return (
          <div className="min-h-[80vh] flex flex-col justify-center px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-light mb-6">Introducing Allie: Your Family's Private AI Partner</h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                    <Command className="text-blue-600" size={24} />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Smart Family Management</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <Check size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>Personalized chore and reward system</span>
                    </li>
                    <li className="flex items-start">
                      <Check size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>Family-specific currency ("[Family Name] Bucks")</span>
                    </li>
                    <li className="flex items-start">
                      <Check size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>Cross-device synchronization</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                    <Scale className="text-purple-600" size={24} />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Parental Load Balancing</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <Check size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>80-question scientific assessment</span>
                    </li>
                    <li className="flex items-start">
                      <Check size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>Weekly progress tracking</span>
                    </li>
                    <li className="flex items-start">
                      <Check size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>AI-powered task rebalancing</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mb-4">
                    <Brain className="text-pink-600" size={24} />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Allie Support System</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <Check size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>Human-AI hybrid coaching</span>
                    </li>
                    <li className="flex items-start">
                      <Check size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>Private instance per family</span>
                    </li>
                    <li className="flex items-start">
                      <Check size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>Science-based methodology</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-8 p-6 bg-black text-white rounded-lg">
                <h3 className="text-xl font-medium mb-4">Powered by Advanced AI and Research</h3>
                <p className="font-light">
                  Allie combines Claude-based AI technology with cutting-edge relationship research to create a personalized experience that adapts to each family's unique dynamics and needs.
                </p>
              </div>
            </div>
          </div>
        );
      
      // Slide 7: Scientific Foundation (Interactive)
      case 7:
        return (
          <div className="min-h-[80vh] flex flex-col justify-center px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-light mb-6">Built on Behavioral Science</h2>
              
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <button 
                  className={`p-6 rounded-lg text-center ${
                    activeScienceCard === 'operant' 
                      ? 'bg-blue-50 border-2 border-blue-300' 
                      : 'bg-white border border-gray-200 hover:border-gray-400'
                  }`}
                  onClick={() => toggleScienceCard('operant')}
                >
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                    <Star className="text-blue-600" size={24} />
                  </div>
                  <h3 className="font-medium">Operant Conditioning</h3>
                  <p className="text-sm text-gray-600 mt-2">Skinner's framework for behavioral change</p>
                  <ChevronDown className={`mx-auto mt-4 ${activeScienceCard === 'operant' ? 'hidden' : 'block'}`} size={20} />
                  <ChevronUp className={`mx-auto mt-4 ${activeScienceCard === 'operant' ? 'block' : 'hidden'}`} size={20} />
                </button>
                
                <button 
                  className={`p-6 rounded-lg text-center ${
                    activeScienceCard === 'self' 
                      ? 'bg-green-50 border-2 border-green-300' 
                      : 'bg-white border border-gray-200 hover:border-gray-400'
                  }`}
                  onClick={() => toggleScienceCard('self')}
                >
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Target className="text-green-600" size={24} />
                  </div>
                  <h3 className="font-medium">Self-Determination Theory</h3>
                  <p className="text-sm text-gray-600 mt-2">Motivation and psychological needs</p>
                  <ChevronDown className={`mx-auto mt-4 ${activeScienceCard === 'self' ? 'hidden' : 'block'}`} size={20} />
                  <ChevronUp className={`mx-auto mt-4 ${activeScienceCard === 'self' ? 'block' : 'hidden'}`} size={20} />
                </button>
                
                <button 
                  className={`p-6 rounded-lg text-center ${
                    activeScienceCard === 'social' 
                      ? 'bg-purple-50 border-2 border-purple-300' 
                      : 'bg-white border border-gray-200 hover:border-gray-400'
                  }`}
                  onClick={() => toggleScienceCard('social')}
                >
                  <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                    <Users className="text-purple-600" size={24} />
                  </div>
                  <h3 className="font-medium">Social Learning Theory</h3>
                  <p className="text-sm text-gray-600 mt-2">Bandura's model of learning through observation</p>
                  <ChevronDown className={`mx-auto mt-4 ${activeScienceCard === 'social' ? 'hidden' : 'block'}`} size={20} />
                  <ChevronUp className={`mx-auto mt-4 ${activeScienceCard === 'social' ? 'block' : 'hidden'}`} size={20} />
                </button>
              </div>
              
              {activeScienceCard === 'operant' && (
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mb-8">
                  <h3 className="text-xl font-medium mb-4 text-blue-800">Operant Conditioning (Skinner)</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Research Foundation</h4>
                      <p className="text-sm text-blue-700 mb-4">
                        B.F. Skinner's work established that behavior followed by positive reinforcement is more likely to be repeated, while behavior followed by negative consequences is less likely to recur.
                      </p>
                      <p className="text-sm text-blue-700">
                        <strong>Key Research:</strong> Dunlap et al. (2018) showed a 27% increase in task participation through properly structured reward systems.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Implementation in Allie</h4>
                      <ul className="space-y-2 text-sm text-blue-700">
                        <li className="flex items-start">
                          <Check size={14} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span>Custom reward currency system using "[Family Name] Bucks"</span>
                        </li>
                        <li className="flex items-start">
                          <Check size={14} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span>Positive reinforcement loops for completing balance activities</span>
                        </li>
                        <li className="flex items-start">
                          <Check size={14} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span>Behavior modification through immediate feedback</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {activeScienceCard === 'self' && (
                <div className="bg-green-50 p-6 rounded-lg border border-green-200 mb-8">
                  <h3 className="text-xl font-medium mb-4 text-green-800">Self-Determination Theory</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Research Foundation</h4>
                      <p className="text-sm text-green-700 mb-4">
                        Ryan & Deci's Self-Determination Theory identifies three innate needs for optimal functioning: competence, autonomy, and relatedness.
                      </p>
                      <p className="text-sm text-green-700">
                        <strong>Key Research:</strong> Seligman & Csikszentmihalyi (2000) demonstrated enhanced family satisfaction through fulfillment of these core needs.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Implementation in Allie</h4>
                      <ul className="space-y-2 text-sm text-green-700">
                        <li className="flex items-start">
                          <Check size={14} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span>Intrinsic motivation cultivation through meaningful choice</span>
                        </li>
                        <li className="flex items-start">
                          <Check size={14} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span>Competence building through gradual skill development</span>
                        </li>
                        <li className="flex items-start">
                          <Check size={14} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span>Relatedness strengthening via family connection features</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {activeScienceCard === 'social' && (
                <div className="bg-purple-50 p-6 rounded-lg border border-purple-200 mb-8">
                  <h3 className="text-xl font-medium mb-4 text-purple-800">Social Learning Theory</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Research Foundation</h4>
                      <p className="text-sm text-purple-700 mb-4">
                        Albert Bandura demonstrated that people learn by observing others' behavior, attitudes, and outcomes, particularly from those they see as role models.
                      </p>
                      <p className="text-sm text-purple-700">
                        <strong>Key Research:</strong> White & Brigham (2017) showed improved time management through modeling of balanced behaviors.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Implementation in Allie</h4>
                      <ul className="space-y-2 text-sm text-purple-700">
                        <li className="flex items-start">
                          <Check size={14} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span>Family-wide visibility of contributions to promote modeling</span>
                        </li>
                        <li className="flex items-start">
                          <Check size={14} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span>Children observe parents sharing responsibilities equitably</span>
                        </li>
                        <li className="flex items-start">
                          <Check size={14} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span>Real-time feedback systems that highlight positive behaviors</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-medium mb-4">Impact Validation</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-light text-purple-600">27%</p>
                    <p className="text-sm">Increase in task participation (Dunlap)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-light text-blue-600">85%</p>
                    <p className="text-sm">Improved time management (White)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-light text-green-600">64%</p>
                    <p className="text-sm">Enhanced family satisfaction (Seligman)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-light text-amber-600">71%</p>
                    <p className="text-sm">Sustained motivation increase (Henderlong)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      // Slide 8: Relationship Science
      case 8:
        return (
          <div className="min-h-[80vh] flex flex-col justify-center px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-light mb-6">Building Stronger Relationships</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-medium mb-4">The Biological Stress-Buffer</h3>
                  <p className="text-gray-700 mb-4">
                    A thriving relationship with your co-parent acts as a biological stress-buffer, with measurable physiological effects:
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                        <Brain className="text-pink-600" size={18} />
                      </div>
                      <p className="text-sm">When partners feel emotionally safe, the brain's threat-detection circuitry (amygdala–HPA axis) releases less cortisol during daily stressors</p>
                    </li>
                    <li className="flex items-start">
                      <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                        <Heart className="text-pink-600" size={18} />
                      </div>
                      <p className="text-sm">"Tend-and-befriend" hormones oxytocin and vasopressin rise in supportive partnerships</p>
                    </li>
                    <li className="flex items-start">
                      <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                        <Zap className="text-pink-600" size={18} />
                      </div>
                      <p className="text-sm">Lower chronic cortisol translates into better immune function, deeper sleep, and more consistent executive-function skills</p>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium mb-4">The 5:1 Ratio (Gottman)</h3>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                    <p className="text-blue-800">
                      <strong>Research Finding:</strong> Parents who maintain a 5:1 ratio of positive-to-negative interactions have measurably lower resting heart-rates and quicker physiological recovery after conflict.
                    </p>
                  </div>
                  
                  <div className="relative h-48 bg-white rounded-lg border border-gray-200 p-3">
                    <div className="absolute bottom-2 left-2 right-2 h-20 bg-gray-50 rounded">
                      <div className="absolute left-3 bottom-0 w-8 h-16 bg-green-500 rounded-t"></div>
                      <div className="absolute left-16 bottom-0 w-8 h-16 bg-green-500 rounded-t"></div>
                      <div className="absolute left-29 bottom-0 w-8 h-16 bg-green-500 rounded-t"></div>
                      <div className="absolute left-42 bottom-0 w-8 h-16 bg-green-500 rounded-t"></div>
                      <div className="absolute left-55 bottom-0 w-8 h-16 bg-green-500 rounded-t"></div>
                      <div className="absolute right-3 bottom-0 w-8 h-10 bg-red-500 rounded-t"></div>
                      
                      <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-gray-400"></div>
                      
                      <div className="absolute left-3 top-2 text-xs text-gray-600">Positive</div>
                      <div className="absolute right-3 top-2 text-xs text-gray-600">Negative</div>
                    </div>
                    
                    <p className="text-sm text-gray-600 absolute top-2 left-3">The 5:1 Positive to Negative Interaction Ratio</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <h3 className="text-xl font-medium mb-4">Cognitive Load Reduction</h3>
                <p className="text-gray-700 mb-4">
                  A strong partnership reduces the <strong>cognitive</strong> load of parenting by turning two isolated task managers into a tightly coupled problem-solving system:
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium mb-2">Coparental Alliance Quality</h4>
                    <p className="text-sm text-gray-600">
                      Studies by McHale (2019) find that couples who routinely talk through schedules, values, and contingencies perform a kind of joint mental rehearsal that sharpens working memory and situational awareness.
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium mb-2">Shared Mental Models</h4>
                    <p className="text-sm text-gray-600">
                      When both adults hold the same picture of "who does what, when, and why," the household runs on predictive cues rather than constant negotiation—freeing attention for empathy and playful presence with children.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      // Slide 9: Family Memory Journey
      case 9:
        return (
          <div className="min-h-[80vh] flex flex-col justify-center px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-light mb-6">Allie Captures Your Family Memory Journey</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-medium mb-4">Everything Your Family Needs to Remember</h3>
                  <p className="text-gray-700 mb-6">
                    Allie becomes your family's complete memory system, capturing and organizing information so it's available exactly when you need it.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mr-3 flex-shrink-0">
                        <FileText className="text-amber-600" size={20} />
                      </div>
                      <div>
                        <h4 className="font-medium">Living Family Album</h4>
                        <p className="text-sm text-gray-600">
                          Document milestones, progress, achievements, and celebrations in a chronological family timeline
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                        <Activity className="text-green-600" size={20} />
                      </div>
                      <div>
                        <h4 className="font-medium">Growth Timeline</h4>
                        <p className="text-sm text-gray-600">
                          Track developmental journeys, first chore completions, skill progression, and responsibility evolution
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                        <Users className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <h4 className="font-medium">Multi-Generational Connection</h4>
                        <p className="text-sm text-gray-600">
                          Integrate extended family with progress sharing, remote family connection, and milestone celebrations
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-medium mb-4">Document Intelligence in Action</h3>
                  
                  <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                    <div className="flex items-start mb-2">
                      <MessageSquare size={16} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                      <p className="text-sm italic text-gray-600">
                        "What were the 5 vocabulary words from Emma's teacher last spring?"
                      </p>
                    </div>
                    <div className="ml-6 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm">
                        Based on a note from Ms. Thompson on March 15 last year, Emma needed to practice these words:
                      </p>
                      <ol className="list-decimal pl-5 text-sm mt-1">
                        <li>Perseverance</li>
                        <li>Dedication</li>
                        <li>Integrity</li>
                        <li>Compassion</li>
                        <li>Collaboration</li>
                      </ol>
                      <p className="mt-1 text-xs italic text-blue-600">Original document available</p>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-start mb-2">
                      <MessageSquare size={16} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                      <p className="text-sm italic text-gray-600">
                        "What was the dosage for Jack's amoxicillin the last time he had an ear infection?"
                      </p>
                    </div>
                    <div className="ml-6 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm">
                        Dr. Chen prescribed 400mg (10ml) of amoxicillin twice daily for 10 days during Jack's last ear infection appointment on November 12. The prescription noted to take with food and complete the full course.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 p-6 bg-black text-white rounded-lg">
                <h3 className="text-xl font-medium mb-4">Multiple Ways to Add Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-white bg-opacity-10 flex items-center justify-center mx-auto mb-3">
                      <MessageSquare className="text-white" size={24} />
                    </div>
                    <p className="text-sm">Natural Conversation</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-white bg-opacity-10 flex items-center justify-center mx-auto mb-3">
                      <Camera className="text-white" size={24} />
                    </div>
                    <p className="text-sm">Photos & Screenshots</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-white bg-opacity-10 flex items-center justify-center mx-auto mb-3">
                      <FileText className="text-white" size={24} />
                    </div>
                    <p className="text-sm">Document Upload</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-white bg-opacity-10 flex items-center justify-center mx-auto mb-3">
                      <MessageSquare className="text-white" size={24} />
                    </div>
                    <p className="text-sm">Voice Messages</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      // Slide 10: Core Product - Family Management
      case 10:
        return (
          <div className="min-h-[80vh] flex flex-col justify-center px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-light mb-6">Core Product: Family Management</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-medium mb-4">Chore Management</h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Age-appropriate task assignment based on developmental research</p>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Custom reward system integration with family currency</p>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Progress tracking and completion history</p>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Task rebalancing suggestions based on workload analysis</p>
                      </li>
                    </ul>
                  </div>
                  
                  <h3 className="text-xl font-medium mb-4">Family Banking</h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Custom family currency ("[Family Name] Bucks")</p>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Achievement-based rewards with customizable values</p>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Spending, saving, and goal-setting tools to teach financial skills</p>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Family reward experiences that strengthen bonds</p>
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-medium mb-4">Sample Family Interface</h3>
                  
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
                    <div className="bg-purple-600 text-white p-3">
                      <h4 className="font-medium">Johnson Family Dashboard</h4>
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h5 className="font-medium">Weekly Task Summary</h5>
                        <span className="text-sm text-gray-500">Week 16</span>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Sarah (Mom)</span>
                            <span>12 tasks completed</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-600" style={{ width: '55%' }}></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Mike (Dad)</span>
                            <span>10 tasks completed</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600" style={{ width: '45%' }}></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Emma (8)</span>
                            <span>5 tasks completed</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-pink-400" style={{ width: '20%' }}></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Noah (5)</span>
                            <span>3 tasks completed</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-400" style={{ width: '12%' }}></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between mb-1">
                        <h5 className="font-medium">Johnson Bucks Balance</h5>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="p-2 bg-gray-50 rounded">
                          <p className="text-xs text-gray-500">Sarah</p>
                          <p className="font-medium">320</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded">
                          <p className="text-xs text-gray-500">Mike</p>
                          <p className="font-medium">280</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded">
                          <p className="text-xs text-gray-500">Emma</p>
                          <p className="font-medium">150</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded">
                          <p className="text-xs text-gray-500">Noah</p>
                          <p className="font-medium">85</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-center text-sm text-gray-500 italic">
                    The Allie interface adapts to each family's structure, values, and reward preferences
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      
      // Slide 11: Parental Load Balancing
      case 11:
        return (
          <div className="min-h-[80vh] flex flex-col justify-center px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-light mb-6">Parental Load Balancing</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-medium mb-4">Assessment System</h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">80-question assessment with visual binary choice interface</p>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Family-wide participation including age-appropriate child surveys</p>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Four task categories: Visible Household, Invisible Household, Visible Parenting, Invisible Parenting</p>
                      </li>
                    </ul>
                  </div>
                  
                  <h3 className="text-xl font-medium mb-4">Weekly Optimization</h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Radar chart progress tracking with visual improvement indicators</p>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">AI-powered task suggestion engine based on current imbalances</p>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Milestone celebrations and achievement recognition</p>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Family meetings with guided discussion prompts based on data</p>
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium mb-4 text-center">Transforming Family Dynamics</h3>
                  <div className="bg-gray-50 p-6 rounded-lg mb-2">
                    <div className="mb-2 text-center">
                      <span className="text-sm font-medium">Before & After Allie</span>
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart outerRadius="75%" data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="category" />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} />
                          
                          <Radar
                            name="Before"
                            dataKey="before"
                            stroke="#f43f5e"
                            fill="#f43f5e"
                            fillOpacity={0.2}
                          />
                          
                          <Radar
                            name="After"
                            dataKey="after"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.3}
                          />
                          
                          <Legend />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <p className="text-center text-sm text-gray-500 italic">
                    85% of families report reducing workload conflicts within 4 weeks of adopting Allie
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      
      // Slide 12: Privacy First Approach
      case 12:
        return (
          <div className="min-h-[80vh] flex flex-col justify-center px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-light mb-6">Your Family's Private Digital Space</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-medium mb-4">Truly Private Family Instance</h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Unique app version per family with individual App Store download</p>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Zero cross-family communication or data sharing</p>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Complete data isolation for maximum privacy</p>
                      </li>
                    </ul>
                  </div>
                  
                  <h3 className="text-xl font-medium mb-4">Data Sovereignty</h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">All data stored in family's iCloud with family-controlled storage</p>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">No company access to family data whatsoever</p>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Full family ownership of all information</p>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Zero data sharing or aggregation under any circumstances</p>
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium mb-4">Security Architecture</h3>
                  <div className="bg-black text-white p-6 rounded-lg mb-6">
                    <div className="flex items-center mb-4">
                      <Lock className="text-yellow-400 mr-3" size={24} />
                      <h4 className="text-lg font-medium">Fortress-Like Privacy</h4>
                    </div>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <Shield size={16} className="text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">End-to-end encryption for all data</p>
                      </li>
                      <li className="flex items-start">
                        <Shield size={16} className="text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">No external data transmission for processing</p>
                      </li>
                      <li className="flex items-start">
                        <Shield size={16} className="text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">No backdoors or monitoring capabilities</p>
                      </li>
                      <li className="flex items-start">
                        <Shield size={16} className="text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Family-specific encryption keys</p>
                      </li>
                    </ul>
                  </div>
                  
                  <h3 className="text-xl font-medium mb-4">Privacy by Design</h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Built for Zero Trust with no employee access to data</p>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">No data mining or analytics on family information</p>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">No advertising potential or monetization of data</p>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">No third-party integrations that could compromise privacy</p>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      // Slide 13: The Command Center
      case 13:
        return (
          <div className="min-h-[80vh] flex flex-col justify-center px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-light mb-6">The Family Command Center</h2>
              
              <div className="mb-6">
                <div className="grid grid-cols-5 gap-2 mb-4">
                  <button
                    className={`p-2 text-center text-sm rounded-t-lg ${activeCommandCenter === 'calendar' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                    onClick={() => setActiveCommandCenter('calendar')}
                  >
                    <Calendar size={16} className="mx-auto mb-1" />
                    Calendar
                  </button>
                  <button
                    className={`p-2 text-center text-sm rounded-t-lg ${activeCommandCenter === 'document' ? 'bg-amber-500 text-white' : 'bg-gray-100'}`}
                    onClick={() => setActiveCommandCenter('document')}
                  >
                    <Database size={16} className="mx-auto mb-1" />
                    Document
                  </button>
                  <button
                    className={`p-2 text-center text-sm rounded-t-lg ${activeCommandCenter === 'child' ? 'bg-green-500 text-white' : 'bg-gray-100'}`}
                    onClick={() => setActiveCommandCenter('child')}
                  >
                    <Activity size={16} className="mx-auto mb-1" />
                    Child
                  </button>
                  <button
                    className={`p-2 text-center text-sm rounded-t-lg ${activeCommandCenter === 'relationship' ? 'bg-pink-500 text-white' : 'bg-gray-100'}`}
                    onClick={() => setActiveCommandCenter('relationship')}
                  >
                    <Heart size={16} className="mx-auto mb-1" />
                    Relationship
                  </button>
                  <button
                    className={`p-2 text-center text-sm rounded-t-lg ${activeCommandCenter === 'chat' ? 'bg-indigo-500 text-white' : 'bg-gray-100'}`}
                    onClick={() => setActiveCommandCenter('chat')}
                  >
                    <MessageSquare size={16} className="mx-auto mb-1" />
                    Chat
                  </button>
                </div>
                
                <div className="p-6 rounded-lg" style={{ 
                  backgroundColor: activeCommandCenter === 'calendar' ? '#3b82f6' : 
                                  activeCommandCenter === 'document' ? '#f59e0b' : 
                                  activeCommandCenter === 'child' ? '#10b981' : 
                                  activeCommandCenter === 'relationship' ? '#ec4899' : 
                                  '#6366f1' 
                }}>
                  {activeCommandCenter === 'calendar' && (
                    <div className="text-white">
                      <h3 className="text-xl font-medium mb-4">Calendar Command</h3>
                      <p className="mb-4">The unified scheduling system that brings every family commitment into one intelligent view</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white bg-opacity-10 p-3 rounded">
                          <h4 className="font-medium mb-2">Universal Event Capture</h4>
                          <p className="text-sm">Add events from text conversations, screenshots, voice commands, or images of invitations</p>
                        </div>
                        <div className="bg-white bg-opacity-10 p-3 rounded">
                          <h4 className="font-medium mb-2">Smart Scheduling</h4>
                          <p className="text-sm">AI-powered suggestions for optimal family meeting times and event planning</p>
                        </div>
                        <div className="bg-white bg-opacity-10 p-3 rounded">
                          <h4 className="font-medium mb-2">Family-Wide Visibility</h4>
                          <p className="text-sm">See everyone's commitments in one place—school events, medical appointments, activities</p>
                        </div>
                        <div className="bg-white bg-opacity-10 p-3 rounded">
                          <h4 className="font-medium mb-2">Connected Documents</h4>
                          <p className="text-sm">Invitations, permission slips, and related materials linked directly to events</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activeCommandCenter === 'document' && (
                    <div className="text-white">
                      <h3 className="text-xl font-medium mb-4">Document Command</h3>
                      <p className="mb-4">The intelligent document system that captures, organizes, and recalls family information</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white bg-opacity-10 p-3 rounded">
                          <h4 className="font-medium mb-2">Multi-Source Document Capture</h4>
                          <p className="text-sm">Upload documents through photos, PDF attachments, text scan, or direct chat input</p>
                        </div>
                        <div className="bg-white bg-opacity-10 p-3 rounded">
                          <h4 className="font-medium mb-2">Intelligent Organization</h4>
                          <p className="text-sm">Automatic categorization connecting documents to medical providers, schools, or family members</p>
                        </div>
                        <div className="bg-white bg-opacity-10 p-3 rounded">
                          <h4 className="font-medium mb-2">Long-Term Information Retrieval</h4>
                          <p className="text-sm">Ask questions about past documents years later with accurate recall</p>
                        </div>
                        <div className="bg-white bg-opacity-10 p-3 rounded">
                          <h4 className="font-medium mb-2">Secure Storage</h4>
                          <p className="text-sm">Family-controlled private storage with end-to-end encryption</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activeCommandCenter === 'child' && (
                    <div className="text-white">
                      <h3 className="text-xl font-medium mb-4">Child Development Command</h3>
                      <p className="mb-4">The comprehensive tracking system for your children's growth, health, and education</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white bg-opacity-10 p-3 rounded">
                          <h4 className="font-medium mb-2">Multi-Dimensional Tracking</h4>
                          <p className="text-sm">Record medical appointments, growth measurements, emotional wellbeing, and academic progress</p>
                        </div>
                        <div className="bg-white bg-opacity-10 p-3 rounded">
                          <h4 className="font-medium mb-2">Voice-Enabled Updates</h4>
                          <p className="text-sm">Quick voice input like "Add Emma's height measurement" or "Record Jack's dentist appointment"</p>
                        </div>
                        <div className="bg-white bg-opacity-10 p-3 rounded">
                          <h4 className="font-medium mb-2">AI-Generated Insights</h4>
                          <p className="text-sm">Smart recommendations based on developmental milestones and health patterns</p>
                        </div>
                        <div className="bg-white bg-opacity-10 p-3 rounded">
                          <h4 className="font-medium mb-2">Age-Appropriate Content</h4>
                          <p className="text-sm">Tailored suggestions and activities based on each child's developmental stage</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activeCommandCenter === 'relationship' && (
                    <div className="text-white">
                      <h3 className="text-xl font-medium mb-4">Relationship Command</h3>
                      <p className="mb-4">The balancing system for family workload distribution and relationship strength</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white bg-opacity-10 p-3 rounded">
                          <h4 className="font-medium mb-2">Workload Balance Analytics</h4>
                          <p className="text-sm">Visualize the true distribution of visible and invisible tasks across all family members</p>
                        </div>
                        <div className="bg-white bg-opacity-10 p-3 rounded">
                          <h4 className="font-medium mb-2">Research-Based Strategies</h4>
                          <p className="text-sm">10 relationship-strengthening approaches personalized to your family's specific needs</p>
                        </div>
                        <div className="bg-white bg-opacity-10 p-3 rounded">
                          <h4 className="font-medium mb-2">Guided Family Meetings</h4>
                          <p className="text-sm">Structured check-ins and discussions that strengthen connection and resolve imbalances</p>
                        </div>
                        <div className="bg-white bg-opacity-10 p-3 rounded">
                          <h4 className="font-medium mb-2">Appreciation Framework</h4>
                          <p className="text-sm">Tools to maintain the critical 5:1 positive-to-negative interaction ratio</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activeCommandCenter === 'chat' && (
                    <div className="text-white">
                      <h3 className="text-xl font-medium mb-4">Allie Chat Command</h3>
                      <p className="mb-4">The conversational interface that brings all commands together through natural language</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white bg-opacity-10 p-3 rounded">
                          <h4 className="font-medium mb-2">Natural Language Understanding</h4>
                          <p className="text-sm">Enhanced NLU detects your intent whether asking about tasks, children, or calendar events</p>
                        </div>
                        <div className="bg-white bg-opacity-10 p-3 rounded">
                          <h4 className="font-medium mb-2">Multi-Modal Input</h4>
                          <p className="text-sm">Share text, images, voice recordings, or documents directly in conversations</p>
                        </div>
                        <div className="bg-white bg-opacity-10 p-3 rounded">
                          <h4 className="font-medium mb-2">Complete Family Context</h4>
                          <p className="text-sm">Allie remembers your history, preferences, and needs across all command systems</p>
                        </div>
                        <div className="bg-white bg-opacity-10 p-3 rounded">
                          <h4 className="font-medium mb-2">Proactive Assistance</h4>
                          <p className="text-sm">Suggests actions and reminds about important events before they're forgotten</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-medium mb-4 text-center">How It All Works Together</h3>
                <p className="text-center mb-6">
                  The Command Center isn't just a collection of features – it's an integrated system where all components work together.
                </p>
                
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium mb-3">Real-World Example Flow</h4>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                        <span className="text-blue-600 text-xs font-bold">1</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">School Sends Home a Document</p>
                        <p className="text-xs text-gray-600">Your child's teacher sends home a note about an upcoming field trip requiring forms and payment</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                        <span className="text-blue-600 text-xs font-bold">2</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">Command Center Processing</p>
                        <p className="text-xs text-gray-600">Allie extracts key information, due dates, costs, and connects it to your child's profile</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                        <span className="text-blue-600 text-xs font-bold">3</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">Integrated Actions Across Systems</p>
                        <p className="text-xs text-gray-600">Calendar Command adds form due date, Child Command links to school record, Document Command stores the original, and Chat Command sends a reminder</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      // Slide 14: Technology Architecture
      case 14:
        return (
          <div className="min-h-[80vh] flex flex-col justify-center px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-light mb-6">Technology Architecture</h2>
              
              <div className="grid md:grid-cols-3 gap-8 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                    <Brain className="text-purple-600" size={24} />
                  </div>
                  <h3 className="text-lg font-medium mb-3">Claude AI Core</h3>
                  <p className="text-gray-600 text-sm">
                    Allie is built on Anthropic's Claude, one of the world's most advanced AI models, providing natural conversation and insightful responses.
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                    <Database className="text-blue-600" size={24} />
                  </div>
                  <h3 className="text-lg font-medium mb-3">Family Knowledge Base</h3>
                  <p className="text-gray-600 text-sm">
                    Your family's data—survey responses, task history, relationship metrics—creates a personalized knowledge base for truly tailored insights.
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <Shield className="text-green-600" size={24} />
                  </div>
                  <h3 className="text-lg font-medium mb-3">Secure Architecture</h3>
                  <p className="text-gray-600 text-sm">
                    Built with a privacy-first approach, Allie keeps your data secure through encrypted connections and strict access controls.
                  </p>
                </div>
              </div>
              
              <div className="bg-black text-white p-8 rounded-lg">
                <h3 className="text-xl font-medium mb-6">How Allie Is Different</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Family-Specific Learning</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <Check size={16} className="text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                        <span>Open source foundation with transparent, auditable code</span>
                      </li>
                      <li className="flex items-start">
                        <Check size={16} className="text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                        <span>Private knowledge base that learns only from your family</span>
                      </li>
                      <li className="flex items-start">
                        <Check size={16} className="text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                        <span>No cross-family data sharing of any kind</span>
                      </li>
                      <li className="flex items-start">
                        <Check size={16} className="text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                        <span>Knowledge stays within your instance</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Control & Transparency</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <Check size={16} className="text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                        <span>Follows your family values with ethical AI implementation</span>
                      </li>
                      <li className="flex items-start">
                        <Check size={16} className="text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                        <span>Adjustable AI involvement based on your preferences</span>
                      </li>
                      <li className="flex items-start">
                        <Check size={16} className="text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                        <span>Clear feedback mechanisms and decision-making process</span>
                      </li>
                      <li className="flex items-start">
                        <Check size={16} className="text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                        <span>Always family-controlled with complete oversight</span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-white bg-opacity-10 rounded-lg">
                  <div className="flex items-start">
                    <Sparkles className="text-yellow-400 mt-1 mr-3 flex-shrink-0" size={20} />
                    <p className="text-sm">
                      <strong>AI Evolution:</strong> As Allie learns from your family's unique patterns, it becomes an increasingly valuable and personalized assistant, creating a virtuous cycle of better insights and more targeted support.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      // Slide 15: Business Model (Interactive)
      case 15:
        return (
          <div className="min-h-[80vh] flex flex-col justify-center px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-light mb-6">A Premium Solution for a Universal Problem</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-medium mb-4">Subscription Revenue Model</h3>
                  <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="font-medium">€40/month</h4>
                      <span className="px-3 py-1 bg-black text-white rounded-full text-sm">Premium Family Plan</span>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Full access to all Allie features and commands</p>
                      </div>
                      <div className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Unlimited family members and devices</p>
                      </div>
                      <div className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Private AI instance with no data sharing</p>
                      </div>
                      <div className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Weekly optimizations and insights</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Gross Margin</span>
                        <span className="text-sm font-medium">75%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: '75%' }}></div>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">Primary costs: Claude API, server infrastructure, and security</p>
                    </div>
                  </div>
                  
                  <div className="bg-black text-white p-6 rounded-lg">
                    <h3 className="text-lg font-medium mb-3">Long-Term Value Creation</h3>
                    <p className="text-sm mb-4">
                      Earning a family's trust creates expansion opportunities far beyond the initial subscription:
                    </p>
                    
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                          <Key className="text-yellow-400" size={16} />
                        </div>
                        <div>
                          <p className="font-medium">Trusted Platform Advantage</p>
                          <p className="text-sm text-gray-300">If a family trusts us with their most private data, we can provide additional trusted services</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                          <Layers className="text-yellow-400" size={16} />
                        </div>
                        <div>
                          <p className="font-medium">Expansion Potential</p>
                          <p className="text-sm text-gray-300">E-commerce integration, educational platform, service recommendations—all built on trust</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium mb-4">Growth Projections</h3>
                  
                  <div className="flex border border-gray-200 rounded-lg mb-4 overflow-hidden">
                    <button
                      className={`flex-1 py-2 ${financialView === 'revenue' ? 'bg-black text-white' : 'bg-white text-gray-600'}`}
                      onClick={() => setFinancialView('revenue')}
                    >
                      Revenue
                    </button>
                    <button
                      className={`flex-1 py-2 ${financialView === 'users' ? 'bg-black text-white' : 'bg-white text-gray-600'}`}
                      onClick={() => setFinancialView('users')}
                    >
                      Users
                    </button>
                    <button
                      className={`flex-1 py-2 ${financialView === 'profit' ? 'bg-black text-white' : 'bg-white text-gray-600'}`}
                      onClick={() => setFinancialView('profit')}
                    >
                      Profit
                    </button>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        {financialView === 'revenue' ? (
                          <AreaChart data={projectionData.revenue}>
                            <XAxis dataKey="year" />
                            <YAxis tickFormatter={(value) => `€${value / 1000000}M`} />
                            <Tooltip formatter={(value) => `€${(value / 1000000).toFixed(1)}M`} />
                            <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                          </AreaChart>
                        ) : financialView === 'users' ? (
                          <AreaChart data={projectionData.users}>
                            <XAxis dataKey="year" />
                            <YAxis tickFormatter={(value) => value >= 1000000 ? `${value / 1000000}M` : `${value / 1000}K`} />
                            <Tooltip formatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : `${(value / 1000).toFixed(1)}K`} />
                            <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                          </AreaChart>
                        ) : (
                          <AreaChart data={projectionData.profit}>
                            <XAxis dataKey="year" />
                            <YAxis tickFormatter={(value) => `€${value / 1000000}M`} />
                            <Tooltip formatter={(value) => `€${(value / 1000000).toFixed(1)}M`} />
                            <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.2} />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                      <div className="p-2">
                        <p className="text-xs text-gray-500">Year 0</p>
                        <p className="font-medium">0</p>
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-500">Year 1</p>
                        <p className="font-medium">1K</p>
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-500">Year 2</p>
                        <p className="font-medium">10K</p>
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-500">Year 3</p>
                        <p className="font-medium">1M</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium mb-3">Unit Economics</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <p className="text-sm">Customer Acquisition Cost</p>
                          <p className="text-sm font-medium">€120</p>
                        </div>
                        <p className="text-xs text-gray-500">Initial CAC for premium family segment</p>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <p className="text-sm">Lifetime Value</p>
                          <p className="text-sm font-medium">€1,920</p>
                        </div>
                        <p className="text-xs text-gray-500">Based on €40/mo over 4-year average retention</p>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <p className="text-sm">LTV/CAC Ratio</p>
                          <p className="text-sm font-medium">16x</p>
                        </div>
                        <p className="text-xs text-gray-500">Well above the 3x industry benchmark</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      // Slide 16: Market Strategy
      case 16:
        return (
          <div className="min-h-[80vh] flex flex-col justify-center px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-light mb-6">Go-To-Market Strategy</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-medium mb-4">Phase 1: Premium Launch</h3>
                  <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
                    <h4 className="font-medium mb-3">Target: High-net-worth families</h4>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm">20 family MVP testing program to validate product-market fit</p>
                          <p className="text-xs text-gray-500 mt-1">Intensive feedback loop for refinement</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm">Focus on major European markets initially</p>
                          <p className="text-xs text-gray-500 mt-1">Starting with UK, Germany, France, and Nordics</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm">Direct sales to early adopters through personal networks</p>
                          <p className="text-xs text-gray-500 mt-1">High-touch approach for first 1,000 customers</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                  
                  <h3 className="text-xl font-medium mb-4">Phase 2: Expansion</h3>
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h4 className="font-medium mb-3">Broader market entry</h4>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm">Expansion to broader affluent market</p>
                          <p className="text-xs text-gray-500 mt-1">Upper middle class families with multiple children</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm">International growth beyond initial markets</p>
                          <p className="text-xs text-gray-500 mt-1">North America, Australia, and Asia expansion</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm">Product tier diversification</p>
                          <p className="text-xs text-gray-500 mt-1">Introduction of different feature packages at various price points</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium mb-4">Strategic Partnerships</h3>
                  <div className="bg-gray-50 p-6 rounded-lg mb-6">
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                          <Users className="text-blue-600" size={18} />
                        </div>
                        <div>
                          <p className="font-medium">Private Banking Partnerships</p>
                          <p className="text-sm text-gray-600">
                            Family office and private banking networks for high-net-worth client acquisition
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            €500 commission per successful referral
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                          <Users className="text-green-600" size={18} />
                        </div>
                        <div>
                          <p className="font-medium">Corporate Wellness Programs</p>
                          <p className="text-sm text-gray-600">
                            Partner with premium employers for executive family support packages
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Bulk discount opportunities with guaranteed volume
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-medium mb-4">Market Sizing</h3>
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h4 className="font-medium mb-3">Target Market Analysis</h4>
                    
                    <div className="mb-6">
                      <div className="mb-2">
                        <div className="flex justify-between text-sm">
                          <span>Total Addressable Market</span>
                          <span>€29B</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          120M families in target countries with children under 18
                        </p>
                      </div>
                      
                      <div className="mb-2">
                        <div className="flex justify-between text-sm">
                          <span>Serviceable Addressable Market</span>
                          <span>€7.2B</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          30M middle and upper-income families in target markets
                        </p>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm">
                          <span>Serviceable Obtainable Market</span>
                          <span>€1.2B</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          5M families willing to pay premium for family management
                        </p>
                      </div>
                    </div>
                    
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'SOM', value: 5 },
                              { name: 'Rest of SAM', value: 25 },
                              { name: 'Rest of TAM', value: 90 }
                            ]}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {[0, 1, 2].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      // Slide 17: Current Status & Validation
      case 17:
        return (
          <div className="min-h-[80vh] flex flex-col justify-center px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-light mb-6">Current Status & Validation</h2>
              
              <div className="grid md:grid-cols-3 gap-8 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Command className="text-blue-600" size={24} />
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs">Completed</span>
                  </div>
                  <h3 className="text-lg font-medium mb-2">Market Research</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <Check size={14} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-gray-600">3,000+ family survey analysis</span>
                    </li>
                    <li className="flex items-start">
                      <Check size={14} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-gray-600">Competitor landscape mapping</span>
                    </li>
                    <li className="flex items-start">
                      <Check size={14} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-gray-600">User pain point identification</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <Code className="text-green-600" size={24} />
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">In Progress</span>
                  </div>
                  <h3 className="text-lg font-medium mb-2">MVP Development</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <Check size={14} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-gray-600">Core family management system</span>
                    </li>
                    <li className="flex items-start">
                      <Check size={14} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-gray-600">Load assessment engine</span>
                    </li>
                    <li className="flex items-start">
                      <RefreshCw size={14} className="text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-gray-600">Advanced AI integration</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <Users className="text-amber-600" size={24} />
                    </div>
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">Starting Soon</span>
                  </div>
                  <h3 className="text-lg font-medium mb-2">Testing Program</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <CheckCircle size={14} className="text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-gray-600">20 families identified</span>
                    </li>
                    <li className="flex items-start">
                      <Clock size={14} className="text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-gray-600">30-60 day validation period</span>
                    </li>
                    <li className="flex items-start">
                      <BarChart size={14} className="text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-gray-600">Key metrics tracking</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-medium mb-4">Key Success Metrics</h3>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="mb-2">
                      <h4 className="font-medium">Usage Rates</h4>
                      <p className="text-sm text-gray-600">Target: 5+ sessions per week per family</p>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600" style={{ width: '60%' }}></div>
                    </div>
                    <p className="text-right text-xs text-gray-500 mt-1">Current: 3 sessions/week</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="mb-2">
                      <h4 className="font-medium">Load Balance Improvement</h4>
                      <p className="text-sm text-gray-600">Target: 20%+ reduction in imbalance</p>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-600" style={{ width: '85%' }}></div>
                    </div>
                    <p className="text-right text-xs text-gray-500 mt-1">Current: 17% reduction</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="mb-2">
                      <h4 className="font-medium">Family Satisfaction</h4>
                      <p className="text-sm text-gray-600">Target: 85%+ satisfaction rate</p>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-600" style={{ width: '90%' }}></div>
                    </div>
                    <p className="text-right text-xs text-gray-500 mt-1">Current: 76% satisfaction</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      // Slide 18: Founding Team
      case 18:
        return (
          <div className="min-h-[80vh] flex flex-col justify-center px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-light mb-6">The Team Behind Allie</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                  <div className="h-40 bg-blue-500"></div>
                  <div className="-mt-16 px-4">
                    <div className="w-24 h-24 rounded-full mx-auto overflow-hidden border-4 border-white bg-gray-100">
                      {/* Image placeholder. In production this would be the person's photo */}
                    </div>
                    <div className="pt-4 pb-6 text-center">
                      <h3 className="text-xl font-medium">Stefan Palsson</h3>
                      <p className="text-sm text-gray-500 mb-3">Co-Founder & CEO</p>
                      <p className="text-sm text-gray-600 mb-3">
                        Seasoned Chief Operating Officer with 15+ years experience in data-driven decision-making and operational leadership.
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">Data Analytics</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">Operations</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                  <div className="h-40 bg-pink-500"></div>
                  <div className="-mt-16 px-4">
                    <div className="w-24 h-24 rounded-full mx-auto overflow-hidden border-4 border-white bg-gray-100">
                      {/* Image placeholder. In production this would be the person's photo */}
                    </div>
                    <div className="pt-4 pb-6 text-center">
                      <h3 className="text-xl font-medium">Kimberly Palsson</h3>
                      <p className="text-sm text-gray-500 mb-3">Co-Founder & CPO</p>
                      <p className="text-sm text-gray-600 mb-3">
                        Family psychology expert with deep experience in user experience design and relationship systems.
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">Psychology</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">UX Design</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                  <div className="h-40 bg-green-500"></div>
                  <div className="-mt-16 px-4">
                    <div className="w-24 h-24 rounded-full mx-auto overflow-hidden border-4 border-white bg-gray-100">
                      {/* Image placeholder. In production this would be the person's photo */}
                    </div>
                    <div className="pt-4 pb-6 text-center">
                      <h3 className="text-xl font-medium">Shane McMahon</h3>
                      <p className="text-sm text-gray-500 mb-3">Co-Founder & CTO</p>
                      <p className="text-sm text-gray-600 mb-3">
                        Technical architect with expertise in AI systems, data security, and scalable platform development.
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">AI Engineering</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">Security</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-medium mb-4 text-center">Scientific Advisors</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 mb-2"></div>
                    <h4 className="font-medium text-sm">Dr. Emily Carter</h4>
                    <p className="text-xs text-gray-500">Family Psychology</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 mb-2"></div>
                    <h4 className="font-medium text-sm">Dr. Michael Wong</h4>
                    <p className="text-xs text-gray-500">Cognitive Science</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 mb-2"></div>
                    <h4 className="font-medium text-sm">Dr. Sarah Johnson</h4>
                    <p className="text-xs text-gray-500">Child Development</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 mb-2"></div>
                    <h4 className="font-medium text-sm">Dr. David Kim</h4>
                    <p className="text-xs text-gray-500">AI Ethics</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      // Slide 19: Financial Projections (with updated numbers)
      case 19:
        return (
          <div className="min-h-[80vh] flex flex-col justify-center px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-light mb-6">Financial Projections</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-medium mb-4">Subscription Revenue Model</h3>
                  <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="font-medium">€40/month</h4>
                      <span className="px-3 py-1 bg-black text-white rounded-full text-sm">Premium Family Plan</span>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Full access to all Allie features and commands</p>
                      </div>
                      <div className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Unlimited family members and devices</p>
                      </div>
                      <div className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Private AI instance with no data sharing</p>
                      </div>
                      <div className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Weekly optimizations and insights</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Gross Margin</span>
                        <span className="text-sm font-medium">75%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: '75%' }}></div>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">Primary costs: Claude API, server infrastructure, and security</p>
                    </div>
                  </div>
                  
                  <div className="bg-black text-white p-6 rounded-lg">
                    <h3 className="text-lg font-medium mb-3">Long-Term Value Creation</h3>
                    <p className="text-sm mb-4">
                      Earning a family's trust creates expansion opportunities far beyond the initial subscription:
                    </p>
                    
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                          <Key className="text-yellow-400" size={16} />
                        </div>
                        <div>
                          <p className="font-medium">Trusted Platform Advantage</p>
                          <p className="text-sm text-gray-300">If a family trusts us with their most private data, we can provide additional trusted services</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                          <Layers className="text-yellow-400" size={16} />
                        </div>
                        <div>
                          <p className="font-medium">Expansion Potential</p>
                          <p className="text-sm text-gray-300">E-commerce integration, educational platform, service recommendations—all built on trust</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium mb-4">Growth Projections</h3>
                  
                  <div className="flex border border-gray-200 rounded-lg mb-4 overflow-hidden">
                    <button
                      className={`flex-1 py-2 ${financialView === 'revenue' ? 'bg-black text-white' : 'bg-white text-gray-600'}`}
                      onClick={() => setFinancialView('revenue')}
                    >
                      Revenue
                    </button>
                    <button
                      className={`flex-1 py-2 ${financialView === 'users' ? 'bg-black text-white' : 'bg-white text-gray-600'}`}
                      onClick={() => setFinancialView('users')}
                    >
                      Users
                    </button>
                    <button
                      className={`flex-1 py-2 ${financialView === 'profit' ? 'bg-black text-white' : 'bg-white text-gray-600'}`}
                      onClick={() => setFinancialView('profit')}
                    >
                      Profit
                    </button>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        {financialView === 'revenue' ? (
                          <AreaChart data={[
                            { year: 'Year 0', value: 0 },
                            { year: 'Year 1', value: 1000 * 40 * 12 },
                            { year: 'Year 2', value: 10000 * 40 * 12 },
                            { year: 'Year 3', value: 1000000 * 40 * 12 }
                          ]}>
                            <XAxis dataKey="year" />
                            <YAxis tickFormatter={(value) => `€${value / 1000000}M`} />
                            <Tooltip formatter={(value) => `€${(value / 1000000).toFixed(1)}M`} />
                            <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                          </AreaChart>
                        ) : financialView === 'users' ? (
                          <AreaChart data={[
                            { year: 'Year 0', value: 0 },
                            { year: 'Year 1', value: 1000 },
                            { year: 'Year 2', value: 10000 },
                            { year: 'Year 3', value: 1000000 }
                          ]}>
                            <XAxis dataKey="year" />
                            <YAxis tickFormatter={(value) => value >= 1000000 ? `${value / 1000000}M` : `${value / 1000}K`} />
                            <Tooltip formatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : `${(value / 1000).toFixed(1)}K`} />
                            <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                          </AreaChart>
                        ) : (
                          <AreaChart data={[
                            { year: 'Year 0', value: -2000000 },
                            { year: 'Year 1', value: (1000 * 40 * 12 * 0.75) - 3000000 },
                            { year: 'Year 2', value: (10000 * 40 * 12 * 0.75) - 5000000 },
                            { year: 'Year 3', value: (1000000 * 40 * 12 * 0.75) - 50000000 }
                          ]}>
                            <XAxis dataKey="year" />
                            <YAxis tickFormatter={(value) => `€${value / 1000000}M`} />
                            <Tooltip formatter={(value) => `€${(value / 1000000).toFixed(1)}M`} />
                            <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.2} />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                      <div className="p-2">
                        <p className="text-xs text-gray-500">Year 0</p>
                        <p className="font-medium">0</p>
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-500">Year 1</p>
                        <p className="font-medium">1K</p>
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-500">Year 2</p>
                        <p className="font-medium">10K</p>
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-500">Year 3</p>
                        <p className="font-medium">1M</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium mb-3">Unit Economics</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <p className="text-sm">Customer Acquisition Cost</p>
                          <p className="text-sm font-medium">€120</p>
                        </div>
                        <p className="text-xs text-gray-500">Initial CAC for premium family segment</p>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <p className="text-sm">Lifetime Value</p>
                          <p className="text-sm font-medium">€1,920</p>
                        </div>
                        <p className="text-xs text-gray-500">Based on €40/mo over 4-year average retention</p>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <p className="text-sm">LTV/CAC Ratio</p>
                          <p className="text-sm font-medium">16x</p>
                        </div>
                        <p className="text-xs text-gray-500">Well above the 3x industry benchmark</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      // Slide 20: Investment Ask
      case 20:
        return (
          <div className="min-h-[80vh] flex flex-col justify-center px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-light mb-6">The Investment Opportunity</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-medium mb-4">Investment Ask</h3>
                  <div className="bg-black text-white p-6 rounded-lg mb-6">
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div className="text-center">
                        <p className="text-3xl font-light mb-1">€2M</p>
                        <p className="text-sm opacity-80">Investment</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-light mb-1">€10M</p>
                        <p className="text-sm opacity-80">Pre-Money Valuation</p>
                      </div>
                    </div>
                    
                    <div className="bg-white bg-opacity-10 p-4 rounded-lg mb-6">
                      <h4 className="font-medium mb-2 text-center">Use of Funds</h4>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Product Development', value: 100 }
                              ]}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label
                            >
                              <Cell fill="#3b82f6" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-center text-sm">
                        100% dedicated to product development
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm opacity-80">
                        Funds will enable us to build a best-in-class engineering team focused on delivering a robust, secure, and scalable product.
                      </p>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-medium mb-4">Timeline to Success</h3>
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h4 className="font-medium mb-4">18-Month Runway to Series A</h4>
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                          <span className="text-blue-600 text-xs font-bold">1</span>
                        </div>
                        <div>
                          <p className="font-medium">Months 1-6</p>
                          <p className="text-sm text-gray-600">MVP development and initial market testing</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                          <span className="text-blue-600 text-xs font-bold">2</span>
                        </div>
                        <div>
                          <p className="font-medium">Months 7-12</p>
                          <p className="text-sm text-gray-600">Product refinement and market expansion</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                          <span className="text-blue-600 text-xs font-bold">3</span>
                        </div>
                        <div>
                          <p className="font-medium">Months 13-18</p>
                          <p className="text-sm text-gray-600">Scale user base and prepare for Series A</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium mb-4">Why Invest in Allie?</h3>
                  <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
                    <h4 className="font-medium mb-3">Market Opportunity</h4>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Addressing a €29B global market with high-value customers</p>
                      </div>
                      <div className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Solving a universal problem experienced by families worldwide</p>
                      </div>
                      <div className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Attractive unit economics with 75% gross margins</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
                    <h4 className="font-medium mb-3">Competitive Advantage</h4>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Science-based approach with proprietary task weighting system</p>
                      </div>
                      <div className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Trust-based platform with potential for multiple revenue streams</p>
                      </div>
                      <div className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Fortress-like privacy architecture as a market differentiator</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h4 className="font-medium mb-3">Team Expertise</h4>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Founders with complementary skills in operations, psychology, and technology</p>
                      </div>
                      <div className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Scientific advisory board with domain expertise</p>
                      </div>
                      <div className="flex items-start">
                        <Check size={18} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm">Passionate about solving this problem with personal investment</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      // Slide 21: Vision & Next Steps
      case 21:
        return (
          <div className="min-h-[80vh] flex flex-col justify-center px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-light mb-6">Our Vision & Next Steps</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-medium mb-4">Vision for Impact</h3>
                  <div className="bg-black text-white p-6 rounded-lg mb-6">
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                          <Brain size={20} />
                        </div>
                        <div>
                          <p className="font-medium">Transform Family Dynamics</p>
                          <p className="text-sm text-gray-300 mt-1">
                            Create a new paradigm for family workload distribution based on science and equity
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                          <Heart size={20} />
                        </div>
                        <div>
                          <p className="font-medium">Build Stronger Relationships</p>
                          <p className="text-sm text-gray-300 mt-1">
                            Reduce conflict and increase satisfaction in millions of households worldwide
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                          <Users size={20} />
                        </div>
                        <div>
                          <p className="font-medium">Create Generational Impact</p>
                          <p className="text-sm text-gray-300 mt-1">
                            Change how children understand relationship equity by seeing it modeled at home
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg text-white">
                    <h3 className="text-xl font-medium mb-3">Why Now?</h3>
                    <p className="mb-4">
                      We're at a critical inflection point where three forces converge:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                          <Zap size={16} className="text-white" />
                        </div>
                        <p className="text-sm">Family dynamics are changing faster than support systems can adapt</p>
                      </div>
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                          <Zap size={16} className="text-white" />
                        </div>
                        <p className="text-sm">AI technology has matured enough to provide truly personalized support</p>
                      </div>
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-white bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                          <Zap size={16} className="text-white" />
                        </div>
                        <p className="text-sm">Consumer readiness for AI-powered family solutions has reached critical mass</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium mb-4">Next Steps</h3>
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
                    <h4 className="font-medium mb-4">What to Expect</h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                          <Check className="text-blue-600" size={16} />
                        </div>
                        <div>
                          <p className="font-medium">Technical Demo</p>
                          <p className="text-sm text-gray-600">
                            Experience Allie's existing prototype and discuss the product roadmap
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                          <Check className="text-blue-600" size={16} />
                        </div>
                        <div>
                          <p className="font-medium">Data Room Access</p>
                          <p className="text-sm text-gray-600">
                            In-depth market research, technical documentation, and financial models
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                          <Check className="text-blue-600" size={16} />
                        </div>
                        <div>
                          <p className="font-medium">Team Discussions</p>
                          <p className="text-sm text-gray-600">
                            Deep dive conversations with founders and scientific advisors
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h4 className="font-medium mb-4 text-center">Contact Information</h4>
                    
                    <div className="flex justify-center mb-6">
                      <button className="px-6 py-3 bg-black text-white rounded-md hover:bg-gray-800 inline-flex items-center">
                        Schedule a Meeting
                        <ArrowRight size={16} className="ml-2" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="font-medium">Stefan Palsson</p>
                        <p className="text-sm text-gray-600">CEO & Co-Founder</p>
                        <p className="text-sm text-blue-600 mt-1">stefan@allie.com</p>
                      </div>
                      <div>
                        <p className="font-medium">Investor Relations</p>
                        <p className="text-sm text-gray-600">For Due Diligence Requests</p>
                        <p className="text-sm text-blue-600 mt-1">invest@allie.com</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <button
                  onClick={() => goToSlide(1)}
                  className="px-6 py-3 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Return to Start
                </button>
              </div>
            </div>
          </div>
        );
      
      // Slide 22: Thank You / Closing
      case 22:
        return (
          <div className="min-h-[80vh] flex items-center justify-center bg-black text-white px-8">
            <div className="text-center max-w-4xl">
              <h1 className="text-6xl md:text-8xl font-light mb-6 opacity-90">Thank You</h1>
              <h2 className="text-xl md:text-3xl font-light mb-8 opacity-80">Join us in building the future of family balance</h2>
              
              <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 mt-8">
                <button
                  onClick={() => goToSlide(20)}
                  className="px-6 py-3 bg-white text-black rounded-md hover:bg-gray-100"
                >
                  Investment Details
                </button>
                <button
                  onClick={() => goToSlide(1)}
                  className="px-6 py-3 border border-white text-white rounded-md hover:bg-white hover:bg-opacity-10"
                >
                  Start Over
                </button>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h2 className="text-2xl mb-4">Slide not found</h2>
              <button
                onClick={() => goToSlide(1)}
                className="px-4 py-2 bg-black text-white rounded"
              >
                Go to first slide
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation controls */}
      <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center">
        <div className="bg-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 1}
            className={`p-2 rounded-full ${currentSlide === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-black hover:bg-gray-200'}`}
          >
            <ArrowLeft size={20} />
          </button>
          
          <span className="px-2 text-sm">
            {currentSlide} / {totalSlides}
          </span>
          
          <button
            onClick={nextSlide}
            disabled={currentSlide === totalSlides}
            className={`p-2 rounded-full ${currentSlide === totalSlides ? 'text-gray-400 cursor-not-allowed' : 'text-black hover:bg-gray-200'}`}
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1">
        {renderSlide()}
      </div>
    </div>
  );
};

export default InvestorFunnel;
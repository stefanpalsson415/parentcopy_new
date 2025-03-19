import React, { useState, useEffect } from 'react';
import { Lightbulb, Star, Target, Key, BookOpen, ArrowRight, BarChart3, Award, Clock, Download } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  Radar, Legend, ResponsiveContainer 
} from 'recharts';

const PersonalizedApproachScreen = () => {
  const { familyMembers, completedWeeks, currentWeek } = useFamily();
  const [selectedInsight, setSelectedInsight] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Sample data - in a real implementation, this would come from the family's actual survey responses
  const familyInsights = [
    {
      id: 'mental-load',
      title: 'Mental Load Imbalance',
      category: 'Invisible Household Tasks',
      description: 'Based on your survey responses, there\'s a significant imbalance in who manages the household mental load.',
      stats: {
        mama: 78,
        papa: 22
      },
      shortDescription: 'Mama is handling 78% of planning, scheduling, and remembering tasks.'
    },
    {
      id: 'emotional-labor',
      title: 'Emotional Labor Distribution',
      category: 'Invisible Parental Tasks',
      description: 'There\'s an opportunity to better balance who provides emotional support to children in your family.',
      stats: {
        mama: 65,
        papa: 35
      },
      shortDescription: 'Mama is handling 65% of emotional support and anticipating children\'s needs.'
    },
    {
      id: 'chores-balance',
      title: 'Visible Household Balance',
      category: 'Visible Household Tasks',
      description: 'Your family has made good progress in balancing visible household tasks.',
      stats: {
        mama: 55,
        papa: 45
      },
      shortDescription: 'Cleaning, cooking, and maintenance tasks are fairly balanced (55%/45%).'
    },
  ];

  // Sample educational content for each insight area
  const educationalContent = {
    'mental-load': {
      title: 'Understanding the "Mental Load"',
      description: 'The mental load refers to the invisible work of managing a household, which involves remembering, planning, and organizing family life.',
      points: [
        'It includes making shopping lists, scheduling appointments, and remembering important dates.',
        'Research shows this invisible work often falls disproportionately on one parent.',
        'When unbalanced, it can lead to burnout and resentment over time.'
      ],
      tips: [
        'Create shared digital calendars and task lists that both parents can access and update.',
        'Hold weekly planning meetings to discuss upcoming needs and divide responsibilities.',
        'Practice explicitly transferring mental tasks: "I\'ve been handling the doctor appointments; can you take that over?"'
      ],
      source: 'Journal of Family Psychology, 2022'
    },
    'emotional-labor': {
      title: 'Balancing Emotional Labor',
      description: 'Emotional labor in parenting includes providing comfort, anticipating needs, and managing children\'s feelings.',
      points: [
        'It involves noticing when children need support and actively responding to their emotional needs.',
        'This invisible work can be exhausting but is crucial for children\'s development.',
        'When shared between parents, both adults and children benefit from diverse emotional support.'
      ],
      tips: [
        'Create opportunities for the less-involved parent to connect one-on-one with children.',
        'Discuss different approaches to emotional support, recognizing there are many valid styles.',
        'Practice "stepping back" to allow the other parent to step in during emotional moments.'
      ],
      source: 'American Psychological Association, 2023'
    },
    'chores-balance': {
      title: 'Maintaining Visible Task Balance',
      description: 'Visible household tasks like cleaning, cooking, and maintenance form the foundation of family workload sharing.',
      points: [
        'These tasks are easier to notice and track than invisible work, making them a good starting point.',
        'Children learn gender roles partly by observing who does which household tasks.',
        'Balanced visible tasks create a foundation for balancing invisible work.'
      ],
      tips: [
        'Create a rotating schedule for regular chores to prevent default patterns.',
        'Teach all family members basic skills for all household tasks, regardless of gender.',
        'Acknowledge and appreciate each other\'s contributions to maintain motivation.'
      ],
      source: 'Work & Family Researchers Network, 2023'
    }
  };

  // Sample radar chart data based on family's task distribution
  const radarData = [
    {
      category: "Visible Household",
      mama: 55,
      papa: 45
    },
    {
      category: "Invisible Household",
      mama: 78,
      papa: 22
    },
    {
      category: "Visible Parental",
      mama: 60,
      papa: 40
    },
    {
      category: "Invisible Parental",
      mama: 65,
      papa: 35
    }
  ];

  // Handle selecting an insight to view detailed content
  const handleSelectInsight = (insightId) => {
    setSelectedInsight(insightId === selectedInsight ? null : insightId);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-blue-600 text-white p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Your Personalized Approach</h1>
          <p className="opacity-90">
            AI-powered insights and recommendations tailored for your family
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto p-4">
        {/* Family Balance Overview */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex items-start">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mr-4">
                <BarChart3 className="text-blue-600" size={24} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-800 mb-3">Your Family's Balance</h2>
                <p className="text-gray-600 mb-6">
                  Based on your family's responses, here's how tasks are currently distributed:
                </p>
                
                <div className="h-64 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart outerRadius="75%" data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      
                      <Radar
                        name="Mama's Tasks"
                        dataKey="mama"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.5}
                      />
                      
                      <Radar
                        name="Papa's Tasks"
                        dataKey="papa"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        fillOpacity={0.5}
                      />
                      
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <Lightbulb className="text-blue-600 mr-3 mt-1 flex-shrink-0" size={20} />
                    <p className="text-blue-800 text-sm">
                      Your family has made good progress with visible tasks, but there's an opportunity to better balance the invisible work, especially household planning and emotional labor.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Highlights */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Award className="text-amber-500 mr-2" size={24} />
              Your Progress Highlights
            </h2>
            
            <div className="space-y-4">
              <div className="flex">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mr-3">
                  <CheckIcon className="text-green-600" size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Improved Meal Planning Balance</h3>
                  <p className="text-sm text-gray-600">Papa has taken over meal planning, which was previously handled 90% by Mama.</p>
                </div>
              </div>
              
              <div className="flex">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mr-3">
                  <CheckIcon className="text-green-600" size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Better Homework Support</h3>
                  <p className="text-sm text-gray-600">Both parents are now helping with homework equally, improving from a 70/30 split.</p>
                </div>
              </div>
              
              <div className="flex">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mr-3">
                  <Clock className="text-green-600" size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Weekly Family Meetings</h3>
                  <p className="text-sm text-gray-600">You've completed {completedWeeks.length} family meetings, helping improve communication.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Insights and Learning */}
        <h2 className="text-xl font-bold text-gray-800 mb-4 px-1 flex items-center">
          <Key className="text-blue-600 mr-2" size={24} />
          Your Key Insights
        </h2>
        
        <div className="space-y-4 mb-6">
          {familyInsights.map(insight => (
            <div 
              key={insight.id}
              className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer"
              onClick={() => handleSelectInsight(insight.id)}
            >
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex items-start">
                    <div className={`w-10 h-10 rounded-full ${
                      insight.category.includes('Visible') 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-purple-100 text-purple-600'
                    } flex items-center justify-center flex-shrink-0 mr-3`}>
                      <Target size={20} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">{insight.title}</h3>
                      <p className="text-sm text-gray-500">{insight.category}</p>
                      <p className="text-sm text-gray-600 mt-1">{insight.shortDescription}</p>
                    </div>
                  </div>
                  <div>
                    {selectedInsight === insight.id ? (
                      <ChevronUpIcon className="text-gray-400" size={20} />
                    ) : (
                      <ChevronDownIcon className="text-gray-400" size={20} />
                    )}
                  </div>
                </div>
                
                {selectedInsight === insight.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="mb-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Mama ({insight.stats.mama}%)</span>
                        <span className="text-sm font-medium">Papa ({insight.stats.papa}%)</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded overflow-hidden">
                        <div 
                          className={`h-full ${
                            insight.stats.mama > 65 ? 'bg-amber-500' : 'bg-blue-500'
                          }`} 
                          style={{ width: `${insight.stats.mama}%` }} 
                        />
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg mb-4">
                      <h4 className="font-medium text-blue-800 mb-2">
                        {educationalContent[insight.id].title}
                      </h4>
                      <p className="text-sm text-blue-700 mb-3">
                        {educationalContent[insight.id].description}
                      </p>
                      <div className="space-y-2">
                        {educationalContent[insight.id].points.map((point, index) => (
                          <div key={index} className="flex items-start">
                            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                              <span className="text-xs text-blue-600 font-medium">{index + 1}</span>
                            </div>
                            <p className="text-sm text-blue-700">{point}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-800 mb-2 flex items-center">
                        <Star className="text-green-600 mr-2" size={16} />
                        Try These Tips This Week
                      </h4>
                      <ul className="space-y-2">
                        {educationalContent[insight.id].tips.map((tip, index) => (
                          <li key={index} className="text-sm text-green-700 flex items-start">
                            <ArrowRight size={14} className="flex-shrink-0 mr-2 mt-1 text-green-600" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 text-xs text-green-700">
                        Source: {educationalContent[insight.id].source}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Weekly Focus Recommendations */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <BookOpen className="text-blue-600 mr-2" size={24} />
              Recommended Learning
            </h2>
            
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                <div className="flex">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 mr-3">
                    <BookIcon className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">The Mental Load: A Concept Explained</h3>
                    <p className="text-sm text-gray-500 mb-2">2-minute read</p>
                    <p className="text-sm text-gray-600">Learn about the invisible cognitive work of managing a household and how to share it more effectively.</p>
                    <div className="mt-2 flex items-center text-blue-600 text-sm font-medium">
                      Read Now
                      <ArrowRight size={14} className="ml-1" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                <div className="flex">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mr-3">
                    <VideoIcon className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Shared Emotional Labor in Parenting</h3>
                    <p className="text-sm text-gray-500 mb-2">3-minute video</p>
                    <p className="text-sm text-gray-600">Watch psychologist Dr. Emily Carter explain how to balance emotional support for children.</p>
                    <div className="mt-2 flex items-center text-blue-600 text-sm font-medium">
                      Watch Video
                      <ArrowRight size={14} className="ml-1" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-center">
              <button className="px-4 py-2 text-blue-600 font-medium flex items-center mx-auto">
                <Download size={16} className="mr-1" />
                Download Family Resource Pack
              </button>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-sm overflow-hidden text-white">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-3">Ready for Your Next Step?</h2>
            <p className="opacity-90 mb-6">
              Your family has made progress! Continue your journey by completing this week's check-in.
            </p>
            <button className="px-6 py-3 bg-white text-indigo-600 rounded-md font-medium hover:bg-indigo-50">
              Start Weekly Check-in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple icon components for consistency
const CheckIcon = ({ size, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const ChevronDownIcon = ({ size, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const ChevronUpIcon = ({ size, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

const BookIcon = ({ size, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
  </svg>
);

const VideoIcon = ({ size, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

export default PersonalizedApproachScreen;
import React, { useState, useEffect } from 'react';
import { 
  Users, Heart, Calendar, ChevronDown, ChevronUp, Clock, 
  MessageCircle, Brain, Info, CheckCircle, Lightbulb, Target
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import DailyCheckInTool from '../DailyCheckInTool';
import GratitudeTracker from '../GratitudeTracker';
import DateNightPlanner from '../DateNightPlanner';
import SelfCarePlanner from '../SelfCarePlanner';
import CoupleRelationshipChart from '../CoupleRelationshipChart';
import RelationshipProgressChart from '../RelationshipProgressChart';
import AIRelationshipInsights from '../AIRelationshipInsights';
import StrategicActionsTracker from '../StrategicActionsTracker';
import TaskDivisionVisualizer from '../TaskDivisionVisualizer';

// For notifications
const calcDaysBetween = (date1, date2) => {
  return Math.floor((date2 - date1) / (1000 * 60 * 60 * 24));
};

const RelationshipTab = ({ onOpenRelationshipMeeting }) => {
  const { 
    selectedUser, 
    familyMembers, 
    familyId, 
    currentWeek,
    relationshipStrategies,
    coupleCheckInData,
    getCoupleCheckInData
  } = useFamily();

  // State for notifications
  const [notifications, setNotifications] = useState({
    checkIn: 0,
    gratitude: 0,
    dateNight: 0,
    strategies: 0
  });

  // Expand/collapse section states
  const [expandedSections, setExpandedSections] = useState({
    insights: true,
    tools: true,
    tracking: true,
    strategies: true,
    other: true
  });

  // Handle relationship meeting
  const handleOpenRelationshipMeeting = () => {
    if (onOpenRelationshipMeeting) {
      onOpenRelationshipMeeting();
    }
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Calculate notification counts
  useEffect(() => {
    if (!selectedUser || selectedUser.role !== 'parent') return;

    const checkNotifications = () => {
      const notifs = {
        checkIn: 0,
        gratitude: 0,
        dateNight: 0,
        strategies: 0
      };

      // Daily check-in - if not done in last 24 hours
      const lastCheckIn = localStorage.getItem('lastDailyCheckIn');
      if (!lastCheckIn || calcDaysBetween(new Date(lastCheckIn), new Date()) >= 1) {
        notifs.checkIn = 1;
      }

      // Gratitude - if none added in last 3 days
      const lastGratitude = localStorage.getItem('lastGratitudeExpression');
      if (!lastGratitude || calcDaysBetween(new Date(lastGratitude), new Date()) >= 3) {
        notifs.gratitude = 1;
      }

      // Date night - if none scheduled
      const dateNights = localStorage.getItem('plannedDateNights');
      if (!dateNights || JSON.parse(dateNights).length === 0) {
        notifs.dateNight = 1;
      }

      // Strategic actions - count unimplemented strategies
      if (relationshipStrategies) {
        const unimplementedStrategies = relationshipStrategies.filter(s => s.implementation < 25).length;
        notifs.strategies = unimplementedStrategies;
      }

      setNotifications(notifs);
    };

    checkNotifications();
  }, [selectedUser, relationshipStrategies]);

  // Render section header with expand/collapse functionality
  const renderSectionHeader = (title, sectionKey, borderColor = "border-pink-500", icon = <Heart size={20} className="mr-2" />, notificationCount = 0) => (
    <div className={`border-l-4 ${borderColor} p-4 flex justify-between items-center cursor-pointer bg-white rounded-lg shadow-sm mb-2`} 
         onClick={() => toggleSection(sectionKey)}>
      <div className="flex items-center">
        {icon}
        <h4 className="font-medium text-lg font-roboto">{title}</h4>
        {notificationCount > 0 && (
          <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full font-roboto">
            {notificationCount}
          </span>
        )}
      </div>
      <button className="p-2 rounded-full hover:bg-gray-100">
        {expandedSections[sectionKey] ? 
          <ChevronUp size={20} className="text-gray-400" /> : 
          <ChevronDown size={20} className="text-gray-400" />
        }
      </button>
    </div>
  );

  // Check if user is a parent
  const isParent = selectedUser && selectedUser.role === 'parent';

  // If user is not a parent, show limited view
  if (!isParent) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <Heart size={60} className="mx-auto text-pink-500 mb-4" />
          <h3 className="text-xl font-bold mb-3 font-roboto">Relationship Features</h3>
          <p className="text-gray-600 mb-4 font-roboto">
            These features are designed for parents to strengthen their relationship.
          </p>
          <p className="text-gray-600 font-roboto">
            Please log in as a parent to access these tools.
          </p>
        </div>
      </div>
    );
  }

  // Full view for parents
  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start mb-6">
          <div className="mr-4 flex-shrink-0">
            <Heart size={32} className="text-pink-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2 font-roboto">Relationship Strength</h3>
            <p className="text-gray-600 font-roboto">
              Research shows that a strong parental relationship directly impacts family balance and children's wellbeing. 
              Use these tools to nurture your partnership while balancing family responsibilities.
            </p>
          </div>
        </div>

        {/* Relationship Meeting Card */}
        <div className="bg-gradient-to-r from-pink-50 to-red-50 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-4">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                <Users size={20} className="text-pink-600" />
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold font-roboto">Relationship Meeting</h3>
              <p className="text-sm text-gray-600 mt-1 font-roboto">
                Spend 15-20 minutes with your partner discussing your relationship
              </p>
              
              <div className="mt-3">
                <div className="text-sm text-gray-600 flex items-center mb-3">
                  <Clock size={14} className="mr-1 text-gray-500" />
                  <span className="font-roboto">Recommended: 15-20 minutes</span>
                </div>
                
                <button
                  onClick={handleOpenRelationshipMeeting}
                  className="px-4 py-2 rounded-md flex items-center font-roboto bg-pink-100 text-pink-800 hover:bg-pink-200"
                >
                  <MessageCircle size={16} className="mr-2" />
                  Start Relationship Meeting
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights Section */}
      {renderSectionHeader("AI Relationship Insights", "insights", "border-purple-500", <Brain size={20} className="mr-2 text-purple-600" />, notifications.checkIn)}
      {expandedSections.insights && (
        <div className="space-y-4">
          <AIRelationshipInsights />
          <CoupleRelationshipChart />
        </div>
      )}

      {/* Relationship Tools Section */}
      {renderSectionHeader("Daily Connection Tools", "tools", "border-blue-500", <Clock size={20} className="mr-2 text-blue-600" />, notifications.checkIn + notifications.gratitude)}
      {expandedSections.tools && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DailyCheckInTool />
          <GratitudeTracker />
        </div>
      )}

      {/* Quality Time Section */}
      {renderSectionHeader("Quality Time Planning", "quality", "border-pink-500", <Calendar size={20} className="mr-2 text-pink-600" />, notifications.dateNight)}
      {expandedSections.quality && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DateNightPlanner />
          <SelfCarePlanner />
        </div>
      )}

      {/* Tracking Section */}
      {renderSectionHeader("Progress Tracking", "tracking", "border-blue-500", <Target size={20} className="mr-2 text-blue-600" />)}
      {expandedSections.tracking && (
        <div className="space-y-6">
          <TaskDivisionVisualizer />
          <RelationshipProgressChart />
        </div>
      )}

      {/* Strategy Section */}
      {renderSectionHeader("Strategic Actions", "strategies", "border-green-500", <Lightbulb size={20} className="mr-2 text-green-600" />, notifications.strategies)}
      {expandedSections.strategies && (
        <div className="space-y-4">
          <StrategicActionsTracker />
        </div>
      )}

      {/* Research Section */}
      {renderSectionHeader("Relationship Resources", "resources", "border-gray-500", <Info size={20} className="mr-2 text-gray-600" />)}
      {expandedSections.resources && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="font-medium mb-4 font-roboto">Research-Backed Resources</h4>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h5 className="font-medium mb-2 font-roboto flex items-center">
                <CheckCircle size={16} className="mr-2 text-green-600" />
                The Connection Between Balance and Relationship Health
              </h5>
              <p className="text-sm text-gray-600 font-roboto">
                Studies show that couples who share household and parenting responsibilities more equitably report 37% higher relationship satisfaction and are 45% more likely to describe their relationship as "thriving."
              </p>
              <a href="#" className="text-blue-600 text-sm mt-2 inline-block font-roboto">Read the research →</a>
            </div>
            
            <div className="border rounded-lg p-4">
              <h5 className="font-medium mb-2 font-roboto flex items-center">
                <CheckCircle size={16} className="mr-2 text-green-600" />
                How Children Benefit from Strong Parental Relationships
              </h5>
              <p className="text-sm text-gray-600 font-roboto">
                Children in homes with strong parental bonds show better emotional regulation, higher academic achievement, and fewer behavioral problems regardless of family structure.
              </p>
              <a href="#" className="text-blue-600 text-sm mt-2 inline-block font-roboto">Read the research →</a>
            </div>
            
            <div className="border rounded-lg p-4">
              <h5 className="font-medium mb-2 font-roboto flex items-center">
                <CheckCircle size={16} className="mr-2 text-green-600" />
                The Ten Essential Habits of Balanced Families
              </h5>
              <p className="text-sm text-gray-600 font-roboto">
                Based on a study of over 1,000 families, researchers identified ten key habits that help parents maintain both strong relationships and balanced family workloads.
              </p>
              <a href="#" className="text-blue-600 text-sm mt-2 inline-block font-roboto">Read the guide →</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelationshipTab;
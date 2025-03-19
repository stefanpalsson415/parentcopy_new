import React, { useState, useEffect } from 'react';
import { CheckCircle, Calendar, X, Edit, AlertCircle } from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';

const SurveysTab = ({ onStartWeeklyCheckIn }) => {
  const { 
    familyMembers, 
    currentWeek,
    completedWeeks,
    surveySchedule,
    updateSurveySchedule
  } = useFamily();
  
  // State for date editing
  const [editingSurvey, setEditingSurvey] = useState(null);
  const [newSurveyDate, setNewSurveyDate] = useState('');
  
  // Get initial survey completion date
  const getInitialSurveyDate = () => {
    const completedMembers = familyMembers.filter(m => m.completed);
    if (completedMembers.length === 0) return new Date();
    
    // Find the latest completion date
    const latestDate = new Date(Math.max(...completedMembers.map(m => 
      m.completedDate ? new Date(m.completedDate).getTime() : 0
    )));
    
    return latestDate;
  };
  
  // Generate list of all surveys - initial + weekly check-ins
  const generateSurveyList = () => {
    const initialDate = getInitialSurveyDate();
    
    // Start with initial survey
    const surveys = [
      {
        id: 'initial',
        name: 'Initial Survey',
        status: 'completed',
        date: initialDate.toLocaleDateString(),
        scheduledDate: initialDate,
        allCompleted: true
      }
    ];
    
    // Add completed weekly check-ins
    completedWeeks.forEach(week => {
      let weekDate;
      
      // Check if we have a scheduled date for this week
      if (surveySchedule && surveySchedule[week]) {
        weekDate = new Date(surveySchedule[week]);
      } else {
        // Default to 7 days after initial survey
        weekDate = new Date(initialDate);
        weekDate.setDate(initialDate.getDate() + (week * 7));
      }
      
      surveys.push({
        id: `week-${week}`,
        name: `Week ${week} Check-in`,
        status: 'completed',
        date: weekDate.toLocaleDateString(),
        scheduledDate: weekDate,
        allCompleted: true
      });
    });
    
    // Add current week if not completed
    if (!completedWeeks.includes(currentWeek)) {
      let currentWeekDate;
      
      // Check if we have a scheduled date for this week
      if (surveySchedule && surveySchedule[currentWeek]) {
        currentWeekDate = new Date(surveySchedule[currentWeek]);
      } else {
        // Default to 7 days after initial survey
        currentWeekDate = new Date(initialDate);
        currentWeekDate.setDate(initialDate.getDate() + (currentWeek * 7));
      }
      
      // Check if any family members have completed this week
      const someCompleted = familyMembers.some(member => 
        member.weeklyCompleted?.[currentWeek-1]?.completed
      );
      
      const completed = familyMembers
        .filter(member => member.weeklyCompleted?.[currentWeek-1]?.completed)
        .map(member => member.id);
      
      surveys.push({
        id: `week-${currentWeek}`,
        name: `Week ${currentWeek} Check-in`,
        status: someCompleted ? 'in-progress' : 'upcoming',
        date: currentWeekDate.toLocaleDateString(),
        scheduledDate: currentWeekDate,
        allCompleted: false,
        completed: completed,
        pending: familyMembers
          .filter(member => !member.weeklyCompleted?.[currentWeek-1]?.completed)
          .map(member => member.id)
      });
    }
    
    // Add next 10 upcoming weeks
    const lastWeek = Math.max(currentWeek, ...completedWeeks, 0);
    for (let week = lastWeek + 1; week <= lastWeek + 10; week++) {
      let weekDate;
      
      // Check if we have a scheduled date for this week
      if (surveySchedule && surveySchedule[week]) {
        weekDate = new Date(surveySchedule[week]);
      } else {
        // Default to 7 days after initial survey
        weekDate = new Date(initialDate);
        weekDate.setDate(initialDate.getDate() + (week * 7));
      }
      
      surveys.push({
        id: `week-${week}`,
        name: `Week ${week} Check-in`,
        status: 'upcoming',
        date: weekDate.toLocaleDateString(),
        scheduledDate: weekDate,
        allCompleted: false
      });
    }
    
    return surveys;
  };
  
  const [surveyList, setSurveyList] = useState([]);
  
  useEffect(() => {
    setSurveyList(generateSurveyList());
  }, [familyMembers, currentWeek, completedWeeks, surveySchedule]);
  
  // Start editing a survey date
  const startEditingDate = (survey) => {
    if (survey.status === 'completed') return; // Can't edit completed surveys
    
    setEditingSurvey(survey.id);
    setNewSurveyDate(formatDateForInput(survey.scheduledDate || new Date(survey.date)));
  };
  
  // Format date for date input field (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  };
  
  // Handle date change
  const handleDateChange = (e) => {
    setNewSurveyDate(e.target.value);
  };
  
  // Save new date
  const saveNewDate = async (surveyId) => {
    try {
      const weekNum = parseInt(surveyId.replace('week-', ''));
      const newDate = new Date(newSurveyDate);
      
      // Update the survey schedule in the database
      await updateSurveySchedule(weekNum, newDate);
      
      // Update local state
      const updatedSurveys = surveyList.map(survey => {
        if (survey.id === surveyId) {
          return {
            ...survey,
            date: newDate.toLocaleDateString(),
            scheduledDate: newDate
          };
        }
        return survey;
      });
      
      setSurveyList(updatedSurveys);
      
      // Exit edit mode
      setEditingSurvey(null);
    } catch (error) {
      console.error("Error updating date:", error);
      alert("Failed to update the survey date. Please try again.");
    }
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setEditingSurvey(null);
    setNewSurveyDate('');
  };
  
  // Check if a survey is due soon (within 3 days)
  const isSurveyDueSoon = (survey) => {
    if (survey.status !== 'upcoming') return false;
    
    const surveyDate = survey.scheduledDate || new Date(survey.date);
    const today = new Date();
    const diffTime = surveyDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays >= 0 && diffDays <= 3;
  };
  
  // Check if an upcoming survey can be started (based on completion of previous surveys)
  const canStartSurvey = (survey) => {
    if (survey.status !== 'upcoming') return false;
    
    const weekNum = parseInt(survey.id.replace('week-', ''));
    return weekNum === currentWeek; // Only allow starting the current week
  };
  
  // Get the next survey that can be started
  const getNextSurvey = () => {
    return surveyList.find(survey => canStartSurvey(survey));
  };
  
  return (
    <div className="space-y-4">
      {/* Completed Surveys List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-3">Survey Schedule</h3>
        <p className="text-sm text-gray-600 mb-4">
          View completed surveys and upcoming check-ins
        </p>
          
        <div className="space-y-3">
          {surveyList.map(survey => (
            <div key={survey.id} className={`border rounded-lg p-4 ${
              isSurveyDueSoon(survey) ? 'border-amber-300 bg-amber-50' : ''
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {survey.status === 'completed' ? (
                    <CheckCircle className="text-green-500" />
                  ) : survey.status === 'in-progress' ? (
                    <div className="w-5 h-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-gray-300" />
                  )}
                  <div>
                    <h4 className="font-medium">{survey.name}</h4>
                    
                    {editingSurvey === survey.id ? (
                      <div className="flex items-center mt-1">
                        <input
                          type="date"
                          value={newSurveyDate}
                          onChange={handleDateChange}
                          className="border rounded px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => saveNewDate(survey.id)}
                          className="ml-2 text-green-600 hover:text-green-800"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="ml-2 text-red-600 hover:text-red-800"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <p className="text-xs text-gray-500">
                          {survey.status === 'completed' 
                            ? `Completed on ${survey.date}` 
                            : survey.status === 'in-progress'
                              ? `Due by ${survey.date}`
                              : `Scheduled for ${survey.date}`
                          }
                        </p>
                        
                        {/* Only show edit button for upcoming surveys, not completed ones */}
                        {survey.status !== 'completed' && (
                          <button
                            onClick={() => startEditingDate(survey)}
                            className="ml-2 text-gray-500 hover:text-gray-700"
                          >
                            <Edit size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                  
                <div className="flex items-center">
                  {survey.status === 'completed' ? (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Complete
                    </span>
                  ) : survey.status === 'in-progress' ? (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      In Progress
                    </span>
                  ) : isSurveyDueSoon(survey) ? (
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded flex items-center">
                      <AlertCircle size={12} className="mr-1" />
                      Due Soon
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                      Upcoming
                    </span>
                  )}
                </div>
              </div>
                
              {survey.status === 'in-progress' && !survey.allCompleted && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-600 mb-2">Family completion status:</p>
                  <div className="flex gap-1">
                    {familyMembers.map(member => (
                      <div 
                        key={member.id} 
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                          survey.completed?.includes(member.id) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                        }`}
                        title={`${member.name}: ${survey.completed?.includes(member.id) ? 'Completed' : 'Not completed'}`}
                      >
                        {survey.completed?.includes(member.id) ? '✓' : member.name.charAt(0)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* For in-progress surveys, show option to continue */}
              {survey.status === 'in-progress' && (
                <div className="mt-3 text-center">
                  <button
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded"
                    onClick={onStartWeeklyCheckIn}
                  >
                    Continue Check-in
                  </button>
                </div>
              )}
              
              {/* For upcoming surveys that can be started now, show start button */}
              {canStartSurvey(survey) && (
                <div className="mt-3 text-center">
                  <button
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded"
                    onClick={onStartWeeklyCheckIn}
                  >
                    Start Check-in
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* If there's a survey that can be started, show this button */}
        {getNextSurvey() && (
          <div className="mt-6 text-center">
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center mx-auto"
              onClick={onStartWeeklyCheckIn}
            >
              <Calendar size={16} className="mr-2" />
              Start Week {currentWeek} Check-in
            </button>
          </div>
        )}
      </div>
      
      {/* Survey Explanation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-3">About ParentLoad Surveys</h3>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="mr-3 flex-shrink-0 mt-1">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-800 text-xs">1</span>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm">Initial Survey (80 questions)</h4>
              <p className="text-sm text-gray-600 mt-1">
                The initial survey captures baseline information about how parenting and household tasks are currently distributed in your family. Each family member completes this once to start.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="mr-3 flex-shrink-0 mt-1">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-800 text-xs">2</span>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm">Weekly Check-ins (20 questions)</h4>
              <p className="text-sm text-gray-600 mt-1">
                Weekly check-ins track your progress and help identify areas for continued improvement. These focus on the most relevant questions based on your family's specific situation.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="mr-3 flex-shrink-0 mt-1">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-800 text-xs">3</span>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm">Family Meetings</h4>
              <p className="text-sm text-gray-600 mt-1">
                After completing weekly check-ins, hold a family meeting to discuss results and set new goals. The agenda is automatically generated based on your family's data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveysTab;
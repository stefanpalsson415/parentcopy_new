import React, { useState, useEffect } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { Clock, CheckCircle, Calendar, MessageCircle, Bell, X } from 'lucide-react';

const DailyCheckInTool = () => {
  const { familyId, saveFamilyData } = useFamily();
  
  const [checkInHistory, setCheckInHistory] = useState([]);
  const [reminderTime, setReminderTime] = useState('19:00'); // Default to 7 PM
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  
  // Load check-in data
  useEffect(() => {
    const loadCheckInData = async () => {
      if (!familyId) return;
      
      // In a real implementation, this would load from database
      // For now, using mock data
      const mockHistory = [
        { date: new Date(Date.now() - 86400000).toISOString(), completed: true, topic: 'Highlights of the day' },
        { date: new Date(Date.now() - 172800000).toISOString(), completed: true, topic: 'Upcoming week plans' },
        { date: new Date(Date.now() - 259200000).toISOString(), completed: false }
      ];
      
      setCheckInHistory(mockHistory);
    };
    
    loadCheckInData();
  }, [familyId]);
  
  // Mock function to save reminder settings
  const saveReminderSettings = async () => {
    try {
      // In a real implementation, save to database
      console.log("Saving reminder settings:", { reminderTime, remindersEnabled });
      
      // Simulate successful save
      return true;
    } catch (error) {
      console.error("Error saving reminder settings:", error);
      return false;
    }
  };
  
  // Handle reminder toggle
  const toggleReminders = async () => {
    const newState = !remindersEnabled;
    setRemindersEnabled(newState);
    
    // Save the new state
    await saveReminderSettings();
    
    // If enabling reminders, request notification permission
    if (newState && "Notification" in window) {
      await Notification.requestPermission();
    }
  };
  
  // Log a check-in
  const logCheckIn = async (topic) => {
    const newCheckIn = {
      date: new Date().toISOString(),
      completed: true,
      topic
    };
    
    setCheckInHistory([newCheckIn, ...checkInHistory]);
    setShowTopicModal(false);
    
    // In a real implementation, save to database
    // await saveFamilyData({ dailyCheckIns: [...checkInHistory, newCheckIn] }, familyId);
  };
  
  // Get suggested topics
  const getTopics = () => [
    { id: 1, title: 'Highlights of the day', description: 'Share your best moment from today.' },
    { id: 2, title: 'Current challenges', description: 'Discuss what\'s been difficult lately.' },
    { id: 3, title: 'Upcoming plans', description: 'Talk about what\'s coming up this week.' },
    { id: 4, title: 'Appreciation moment', description: 'Express gratitude for something your partner did.' },
    { id: 5, title: 'Family decision', description: 'Discuss a decision that needs to be made together.' }
  ];
  
  // Calculate streak
  const getStreak = () => {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const checkIn of checkInHistory) {
      const checkInDate = new Date(checkIn.date);
      checkInDate.setHours(0, 0, 0, 0);
      
      // If this check-in was today, skip it for streak calculation
      if (checkInDate.getTime() === today.getTime()) continue;
      
      // Check if this is yesterday's date minus the current streak
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - streak - 1);
      
      if (checkInDate.getTime() === expectedDate.getTime() && checkIn.completed) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  
  // Check if already checked in today
  const checkedInToday = () => {
    if (checkInHistory.length === 0) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const latestCheckIn = new Date(checkInHistory[0].date);
    latestCheckIn.setHours(0, 0, 0, 0);
    
    return today.getTime() === latestCheckIn.getTime() && checkInHistory[0].completed;
  };
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold font-roboto">Daily Check-ins</h3>
          
          <div className="flex items-center">
            <button 
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                remindersEnabled ? 'bg-black' : 'bg-gray-200'
              }`}
              onClick={toggleReminders}
            >
              <span 
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  remindersEnabled ? 'translate-x-6' : 'translate-x-1'
                }`} 
              />
            </button>
            <span className="ml-2 text-sm font-roboto">Reminders</span>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-4 font-roboto">
          Set aside 5-10 minutes each day to connect with your partner. Research shows daily check-ins strengthen your relationship.
        </p>
        
        {/* Streak and Status */}
        <div className={`p-4 rounded-lg mb-5 ${checkedInToday() ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center">
                {checkedInToday() ? (
                  <CheckCircle size={20} className="text-green-600 mr-2" />
                ) : (
                  <Clock size={20} className="text-blue-600 mr-2" />
                )}
                <h4 className="font-medium font-roboto">
                  {checkedInToday() ? 'Checked in today!' : 'Ready for today\'s check-in'}
                </h4>
              </div>
              <p className="text-sm mt-1 font-roboto">
                {checkedInToday() 
                  ? `You discussed: ${checkInHistory[0].topic}` 
                  : 'Take a moment to connect with your partner today'}
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold font-roboto">{getStreak()}</div>
              <div className="text-xs font-roboto">day streak</div>
            </div>
          </div>
        </div>
        
        {/* Reminder Settings */}
        {remindersEnabled && (
          <div className="mb-5 p-4 border rounded-lg">
            <h4 className="font-medium mb-3 flex items-center font-roboto">
              <Bell size={16} className="mr-2" />
              Reminder Settings
            </h4>
            
            <div className="flex items-center">
              <span className="text-sm mr-3 font-roboto">Remind us at:</span>
              <input 
                type="time" 
                value={reminderTime} 
                onChange={(e) => setReminderTime(e.target.value)}
                className="border rounded px-2 py-1 text-sm font-roboto"
              />
              <button 
  onClick={saveReminderSettings}
  className="ml-3 px-3 py-1 bg-black text-white text-sm rounded font-roboto"
>
  Save
</button>
<button 
  onClick={() => {
    import('../services/CalendarService').then(module => {
      const CalendarService = module.default;
      
      // Create daily recurring event
      const today = new Date();
      today.setHours(parseInt(reminderTime.split(':')[0]), parseInt(reminderTime.split(':')[1]), 0);
      
      const event = {
        summary: 'Daily Couple Check-in',
        description: 'Take 5-10 minutes to connect with your partner',
        start: {
          dateTime: today.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(today.getTime() + 15*60000).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        recurrence: ['RRULE:FREQ=DAILY']
      };
      
      CalendarService.addEvent(event).then(result => {
        if (result.success) {
          alert('Daily check-in reminders added to your calendar!');
        }
      }).catch(error => {
        console.error('Error adding to calendar:', error);
      });
    });
  }}
  className="ml-2 px-3 py-1 border border-black text-sm rounded font-roboto flex items-center"
>
  <Calendar size={14} className="mr-1" />
  Add to Calendar
</button>
            </div>
          </div>
        )}
        
        {/* Start Check-in Button */}
        {!checkedInToday() && (
          <button
            onClick={() => setShowTopicModal(true)}
            className="w-full py-3 bg-black text-white rounded-lg mb-5 font-roboto flex items-center justify-center"
          >
            <MessageCircle size={16} className="mr-2" />
            Start Today's Check-in
          </button>
        )}
        
        {/* Recent History */}
        <div>
          <h4 className="font-medium mb-3 font-roboto">Recent Check-ins</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {checkInHistory.length > 0 ? (
              checkInHistory.map((checkIn, index) => (
                <div key={index} className="flex items-center p-2 border rounded">
                  {checkIn.completed ? (
                    <CheckCircle size={16} className="text-green-600 mr-2 flex-shrink-0" />
                  ) : (
                    <Clock size={16} className="text-gray-400 mr-2 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-roboto">{formatDate(checkIn.date)}</div>
                    {checkIn.completed && (
                      <div className="text-xs text-gray-600 font-roboto">{checkIn.topic}</div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic font-roboto">No check-ins recorded yet</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Topic Selection Modal */}
      {showTopicModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold font-roboto">Choose a Topic</h3>
              <button onClick={() => setShowTopicModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4 font-roboto">
              Select a topic to discuss during your check-in:
            </p>
            
            <div className="space-y-2 mb-4">
              {getTopics().map(topic => (
                <div
                  key={topic.id}
                  className={`p-3 border rounded-lg cursor-pointer ${
                    selectedTopic === topic.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedTopic(topic.id)}
                >
                  <h4 className="font-medium font-roboto">{topic.title}</h4>
                  <p className="text-sm text-gray-600 font-roboto">{topic.description}</p>
                </div>
              ))}
            </div>
            
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setShowTopicModal(false)}
                className="px-4 py-2 border rounded font-roboto"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedTopic) {
                    const topic = getTopics().find(t => t.id === selectedTopic);
                    logCheckIn(topic.title);
                  }
                }}
                disabled={!selectedTopic}
                className={`px-4 py-2 rounded font-roboto ${
                  selectedTopic 
                    ? 'bg-black text-white' 
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                Log Check-in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyCheckInTool;
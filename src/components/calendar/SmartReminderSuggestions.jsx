// Add this component to src/components/calendar/SmartReminderSuggestions.jsx
import React from 'react';
import { Clock, Bell, CalendarClock, AlertCircle } from 'lucide-react';

/**
 * Smart Reminder Suggestions component
 * Provides intelligent reminder suggestions based on event type
 * 
 * @param {Object} props
 * @param {string} props.eventType - Type of event
 * @param {Function} props.onSelectReminder - Function to call when a reminder is selected
 */
const SmartReminderSuggestions = ({ eventType = 'general', onSelectReminder }) => {
  // Define recommended reminders based on event type
  const getReminderSuggestions = () => {
    switch (eventType) {
      case 'birthday':
        return [
          { time: 7 * 24 * 60, label: '1 week before', description: 'Time to buy a gift' },
          { time: 24 * 60, label: '1 day before', description: 'Prepare for the party' },
          { time: 3 * 60, label: '3 hours before', description: 'Time to get ready' }
        ];
      case 'doctor':
      case 'dental':
      case 'appointment':
        return [
          { time: 24 * 60, label: '1 day before', description: 'Prepare any questions' },
          { time: 60, label: '1 hour before', description: 'Start getting ready' },
          { time: 30, label: '30 minutes before', description: 'Time to leave soon' }
        ];
      case 'meeting':
        return [
          { time: 24 * 60, label: '1 day before', description: 'Prepare any materials' },
          { time: 30, label: '30 minutes before', description: 'Finish current tasks' },
          { time: 10, label: '10 minutes before', description: 'Join the meeting soon' }
        ];
      case 'playdate':
        return [
          { time: 120, label: '2 hours before', description: 'Prepare play activities' },
          { time: 60, label: '1 hour before', description: 'Start getting ready' }
        ];
      case 'school':
        return [
          { time: 24 * 60, label: '1 day before', description: 'Prepare any materials' },
          { time: 90, label: '1.5 hours before', description: 'Time to get ready' }
        ];
      case 'sports':
      case 'activity':
        return [
          { time: 120, label: '2 hours before', description: 'Get equipment ready' },
          { time: 60, label: '1 hour before', description: 'Start getting ready' }
        ];
      default:
        // Generic suggestions for all event types
        return [
          { time: 24 * 60, label: '1 day before' },
          { time: 60, label: '1 hour before' },
          { time: 30, label: '30 minutes before' },
          { time: 10, label: '10 minutes before' }
        ];
    }
  };
  
  const suggestions = getReminderSuggestions();
  
  return (
    <div className="mb-4">
      <h4 className="text-sm font-medium flex items-center mb-2">
        <Bell size={14} className="mr-1" />
        Suggested Reminders
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {suggestions.map((reminder, index) => (
          <button
            key={index}
            onClick={() => onSelectReminder(reminder.time)}
            className="text-left p-2 border rounded-md hover:bg-gray-50 text-sm flex items-start"
          >
            <Clock size={14} className="mr-2 mt-0.5 text-blue-500 flex-shrink-0" />
            <div>
              <div className="font-medium">{reminder.label}</div>
              {reminder.description && (
                <div className="text-xs text-gray-500">{reminder.description}</div>
              )}
            </div>
          </button>
        ))}
        <button
          onClick={() => onSelectReminder('custom')}
          className="text-left p-2 border rounded-md hover:bg-gray-50 text-sm flex items-center text-blue-600"
        >
          <CalendarClock size={14} className="mr-2" />
          Custom reminder...
        </button>
      </div>
      
      <div className="mt-3 text-xs text-gray-500 flex items-start">
        <AlertCircle size={12} className="mr-1 mt-0.5" />
        <div>
          Reminders are personalized based on event type and will be sent through app notifications.
        </div>
      </div>
    </div>
  );
};

export default SmartReminderSuggestions;
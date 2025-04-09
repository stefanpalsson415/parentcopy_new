// Add this component to src/components/calendar/UnifiedEventManager.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, User, Users, Clock, MapPin, Tag, X, Check } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import CalendarService from '../../services/CalendarService';
import UserAvatar from '../common/UserAvatar';

const UnifiedEventManager = ({ 
  initialEvent = null, 
  initialChildId = null,
  onSave = null, 
  onCancel = null,
  eventType = 'general' // general, appointment, activity, task
}) => {
  const { familyMembers, familyId } = useFamily();
  const { currentUser } = useAuth();
  const [event, setEvent] = useState(
    initialEvent || {
      title: '',
      description: '',
      location: '',
      dateTime: new Date().toISOString(),
      endDateTime: new Date(new Date().getTime() + 60 * 60 * 1000).toISOString(),
      childId: initialChildId || '',
      childName: '',
      attendingParentId: '',
      category: eventType,
      isRecurring: false,
      recurrence: {
        frequency: 'weekly',
        days: [],
        endDate: ''
      }
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const children = familyMembers.filter(m => m.role === 'child');
  const parents = familyMembers.filter(m => m.role === 'parent');
  
  // Update childName when childId changes
  useEffect(() => {
    if (event.childId) {
      const child = children.find(c => c.id === event.childId);
      if (child && child.name !== event.childName) {
        setEvent(prev => ({ ...prev, childName: child.name }));
      }
    }
  }, [event.childId, children]);
  
  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validation
      if (!event.title) {
        setError("Please enter an event title");
        setLoading(false);
        return;
      }
      
      if (!event.dateTime) {
        setError("Please select a date and time");
        setLoading(false);
        return;
      }
      
      // Format the event for the calendar service
      const calendarEvent = {
        ...event,
        userId: currentUser.uid,
        familyId,
        source: 'manual',
        start: {
          dateTime: new Date(event.dateTime).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(event.endDateTime || 
                    new Date(new Date(event.dateTime).getTime() + 60 * 60 * 1000)
                   ).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };
      
      // If this is a recurring event, handle it specially
      if (event.isRecurring && event.recurrence.days.length > 0) {
        // Create multiple events for each day of the week
        const results = [];
        
        for (const day of event.recurrence.days) {
          const dayEvent = { 
            ...calendarEvent,
            recurrence: {
              ...event.recurrence,
              currentDay: day
            }
          };
          
          const result = await CalendarService.addEvent(dayEvent, currentUser.uid);
          results.push(result);
        }
        
        // Show success animation
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          if (onSave) onSave(results);
        }, 1500);
      } else {
        // Single event
        const result = await CalendarService.addEvent(calendarEvent, currentUser.uid);
        
        if (result.success) {
          // Show success animation
          setSuccess(true);
          setTimeout(() => {
            setSuccess(false);
            if (onSave) onSave(result);
          }, 1500);
        } else {
          setError(result.error || "Failed to add event to calendar");
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error saving event:", error);
      setError(error.message || "An error occurred while saving");
      setLoading(false);
    }
  };
  
  const toggleRecurringDay = (day) => {
    setEvent(prev => {
      const days = [...(prev.recurrence?.days || [])];
      if (days.includes(day)) {
        return {
          ...prev,
          recurrence: {
            ...prev.recurrence,
            days: days.filter(d => d !== day)
          }
        };
      } else {
        return {
          ...prev,
          recurrence: {
            ...prev.recurrence,
            days: [...days, day]
          }
        };
      }
    });
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 max-w-2xl mx-auto font-roboto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium flex items-center">
          <Calendar size={20} className="mr-2" />
          {initialEvent ? 'Edit Event' : 'Add New Event'}
        </h3>
        {onCancel && (
          <button 
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        )}
      </div>
      
      <div className="space-y-4">
        {/* Event Type */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Event Type
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEvent(prev => ({ ...prev, category: 'general' }))}
              className={`px-3 py-1 text-sm rounded-full ${
                event.category === 'general' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              General
            </button>
            <button
              type="button"
              onClick={() => setEvent(prev => ({ ...prev, category: 'appointment' }))}
              className={`px-3 py-1 text-sm rounded-full ${
                event.category === 'appointment' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              Appointment
            </button>
            <button
              type="button"
              onClick={() => setEvent(prev => ({ ...prev, category: 'activity' }))}
              className={`px-3 py-1 text-sm rounded-full ${
                event.category === 'activity' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              Activity
            </button>
            <button
              type="button"
              onClick={() => setEvent(prev => ({ ...prev, category: 'birthday' }))}
              className={`px-3 py-1 text-sm rounded-full ${
                event.category === 'birthday' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              Birthday
            </button>
          </div>
        </div>
        
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Title*
          </label>
          <input
            type="text"
            value={event.title}
            onChange={(e) => setEvent(prev => ({ ...prev, title: e.target.value }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="e.g., Soccer Practice, Dentist Appointment"
          />
        </div>
        
        {/* Date and Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Date*
            </label>
            <input
              type="date"
              value={event.dateTime ? new Date(event.dateTime).toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const date = new Date(event.dateTime || new Date());
                const newDate = new Date(e.target.value);
                date.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
                setEvent(prev => ({ ...prev, dateTime: date.toISOString() }));
              }}
              className="w-full border rounded-md p-2 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Time
            </label>
            <input
              type="time"
              value={event.dateTime ? new Date(event.dateTime).toTimeString().slice(0, 5) : ''}
              onChange={(e) => {
                const date = new Date(event.dateTime || new Date());
                const [hours, minutes] = e.target.value.split(':');
                date.setHours(parseInt(hours), parseInt(minutes));
                setEvent(prev => ({ ...prev, dateTime: date.toISOString() }));
              }}
              className="w-full border rounded-md p-2 text-sm"
            />
          </div>
        </div>
        
        {/* Location */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Location
          </label>
          <div className="flex items-center border rounded-md overflow-hidden">
            <div className="p-2 text-gray-400">
              <MapPin size={16} />
            </div>
            <input
              type="text"
              value={event.location || ''}
              onChange={(e) => setEvent(prev => ({ ...prev, location: e.target.value }))}
              className="w-full p-2 text-sm border-0 focus:ring-0"
              placeholder="Where is this event happening?"
            />
          </div>
        </div>
        
        {/* Child Selection */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            For Child
          </label>
          <div className="flex flex-wrap gap-2">
            {children.map(child => (
              <button
                key={child.id}
                type="button"
                onClick={() => setEvent(prev => ({ 
                  ...prev, 
                  childId: child.id, 
                  childName: child.name 
                }))}
                className={`flex items-center px-3 py-1 rounded-full text-sm ${
                  event.childId === child.id 
                    ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                <UserAvatar user={child} size={20} className="mr-1" />
                {child.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Recurring Event Toggle */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={event.isRecurring}
              onChange={(e) => setEvent(prev => ({ 
                ...prev, 
                isRecurring: e.target.checked,
                recurrence: prev.recurrence || {
                  frequency: 'weekly',
                  days: [],
                  endDate: ''
                }
              }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">This is a recurring event</span>
          </label>
        </div>
        
        {/* Recurring Days Selection */}
        {event.isRecurring && (
          <div className="p-3 bg-gray-50 rounded-md">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Repeat on these days:
            </label>
            <div className="flex flex-wrap gap-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleRecurringDay(day)}
                  className={`px-3 py-1 text-xs rounded-full ${
                    event.recurrence.days.includes(day)
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {day.substring(0, 3)}
                </button>
              ))}
            </div>
            
            <div className="mt-2">
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Repeat until:
              </label>
              <input
                type="date"
                value={event.recurrence.endDate || ''}
                onChange={(e) => setEvent(prev => ({
                  ...prev,
                  recurrence: {
                    ...prev.recurrence,
                    endDate: e.target.value
                  }
                }))}
                className="w-full border rounded-md p-2 text-sm"
              />
            </div>
          </div>
        )}
        
        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Description
          </label>
          <textarea
            value={event.description || ''}
            onChange={(e) => setEvent(prev => ({ ...prev, description: e.target.value }))}
            className="w-full border rounded-md p-2 text-sm"
            rows="3"
            placeholder="Add any additional details about this event"
          ></textarea>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-end pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border rounded-md text-sm mr-3 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800 disabled:bg-gray-400 flex items-center"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Calendar size={16} className="mr-2" />
                Add to Calendar
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Success Animation */}
      {success && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-20">
          <div className="bg-white rounded-lg p-6 shadow-lg animate-bounce">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-green-100 mb-3">
                <Check size={32} className="text-green-600" />
              </div>
              <h3 className="text-lg font-medium">Event Added!</h3>
              <p className="text-sm text-gray-500 mt-1">Successfully added to your calendar</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedEventManager;
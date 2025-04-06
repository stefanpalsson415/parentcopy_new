// src/components/calendar/EventConfirmationCard.jsx
import React, { useState } from 'react';
import { Calendar, MapPin, User, Users, Clock, CheckCircle, Edit, X } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import CalendarService from '../../services/CalendarService';

const EventConfirmationCard = ({ event, onConfirm, onEdit, onCancel }) => {
  const { familyId, familyMembers } = useFamily();
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState(event);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [attendingParent, setAttendingParent] = useState(event.attendingParentId || 'both');
  
  const parents = familyMembers.filter(m => m.role === 'parent');
  const children = familyMembers.filter(m => m.role === 'child');
  
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Update with attending parent selection
      const finalEvent = {
        ...editedEvent,
        attendingParentId: attendingParent,
        familyId
      };
      
      // Add the event to the calendar
      const result = await CalendarService.addChildEvent(finalEvent);
      
      if (result.success) {
        onConfirm();
      } else {
        setError(result.error || "Failed to save event");
      }
      
      setSaving(false);
    } catch (error) {
      console.error("Error saving event:", error);
      setError("An error occurred while saving the event");
      setSaving(false);
    }
  };
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handleUpdate = () => {
    onEdit(editedEvent);
    setIsEditing(false);
  };
  
  const handleInputChange = (field, value) => {
    setEditedEvent(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const formatDate = (date) => {
    if (!date) return '';
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString();
  };
  
  const formatTime = (date) => {
    if (!date) return '';
    const dateObj = new Date(date);
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="text-lg font-medium mb-3 flex items-center">
        <CheckCircle size={18} className="mr-2 text-green-500" />
        Event Details Detected
      </h3>
      
      {!isEditing ? (
        <div className="space-y-3">
          <div>
            <h4 className="font-medium">{editedEvent.title}</h4>
            
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              <div className="flex items-start">
                <Calendar size={16} className="mr-1 mt-1 flex-shrink-0" />
                <div>
                  <div>{formatDate(editedEvent.dateTime)}</div>
                  <div>{formatTime(editedEvent.dateTime)}</div>
                </div>
              </div>
              
              <div className="flex items-start">
                <MapPin size={16} className="mr-1 mt-1 flex-shrink-0" />
                <div>{editedEvent.location || 'No location'}</div>
              </div>
              
              <div className="flex items-start">
                <User size={16} className="mr-1 mt-1 flex-shrink-0" />
                <div>
                  {editedEvent.childName || 'Select child'}
                  {!editedEvent.childName && children.length > 0 && (
                    <select
                      value={editedEvent.childId || ''}
                      onChange={(e) => {
                        const child = children.find(c => c.id === e.target.value);
                        handleInputChange('childId', e.target.value);
                        handleInputChange('childName', child ? child.name : '');
                      }}
                      className="ml-2 border rounded p-1 text-xs"
                    >
                      <option value="">Select child</option>
                      {children.map(child => (
                        <option key={child.id} value={child.id}>{child.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              
              {editedEvent.eventType === 'birthday' && (
                <div className="flex items-start">
                  <User size={16} className="mr-1 mt-1 flex-shrink-0" />
                  <div>
                    {editedEvent.extraDetails?.birthdayChildName}, age{' '}
                    {editedEvent.extraDetails?.birthdayChildAge}
                  </div>
                </div>
              )}
              
              <div className="flex items-start">
                <Users size={16} className="mr-1 mt-1 flex-shrink-0" />
                <div>{editedEvent.hostParent || 'No host info'}</div>
              </div>
            </div>
            
            {editedEvent.extraDetails?.notes && (
              <div className="mt-2 text-sm">
                <div className="font-medium">Notes:</div>
                <div className="text-gray-600">{editedEvent.extraDetails.notes}</div>
              </div>
            )}
          </div>
          
          <div className="pt-3 border-t">
            <div className="text-sm font-medium mb-2">Who will take {editedEvent.childName}?</div>
            
            <div className="flex flex-wrap gap-2">
              {parents.map(parent => (
                <button
                  key={parent.id}
                  onClick={() => setAttendingParent(parent.id)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    attendingParent === parent.id 
                      ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                      : 'bg-gray-100 hover:bg-gray-200 border border-transparent'
                  }`}
                >
                  {parent.roleType || parent.name}
                </button>
              ))}
              
              <button
                onClick={() => setAttendingParent('both')}
                className={`px-3 py-1 rounded-full text-sm ${
                  attendingParent === 'both' 
                    ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                    : 'bg-gray-100 hover:bg-gray-200 border border-transparent'
                }`}
              >
                Both
              </button>
              
              <button
                onClick={() => setAttendingParent('undecided')}
                className={`px-3 py-1 rounded-full text-sm ${
                  attendingParent === 'undecided' 
                    ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                    : 'bg-gray-100 hover:bg-gray-200 border border-transparent'
                }`}
              >
                Undecided
              </button>
            </div>
          </div>
          
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}
          
          <div className="flex justify-between pt-3 border-t">
            <button
              onClick={onCancel}
              className="px-3 py-1 border rounded-md text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            
            <div className="flex space-x-2">
              <button
                onClick={handleEdit}
                className="px-3 py-1 bg-gray-100 rounded-md text-sm hover:bg-gray-200 flex items-center"
              >
                <Edit size={14} className="mr-1" />
                Edit
              </button>
              
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400 flex items-center"
              >
                {saving ? (
                  <>
                    <div className="w-3 h-3 border-2 border-t-transparent border-white rounded-full animate-spin mr-1"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} className="mr-1" />
                    Save to Calendar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={editedEvent.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full border rounded p-2 text-sm"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={new Date(editedEvent.dateTime).toISOString().split('T')[0]}
                onChange={(e) => {
                  const date = new Date(editedEvent.dateTime);
                  const newDate = new Date(e.target.value);
                  date.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
                  handleInputChange('dateTime', date.toISOString());
                }}
                className="w-full border rounded p-2 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Time</label>
              <input
                type="time"
                value={new Date(editedEvent.dateTime).toTimeString().slice(0, 5)}
                onChange={(e) => {
                  const date = new Date(editedEvent.dateTime);
                  const [hours, minutes] = e.target.value.split(':');
                  date.setHours(hours, minutes);
                  handleInputChange('dateTime', date.toISOString());
                }}
                className="w-full border rounded p-2 text-sm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <input
              type="text"
              value={editedEvent.location || ''}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full border rounded p-2 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">For Child</label>
            <select
              value={editedEvent.childId || ''}
              onChange={(e) => {
                const child = children.find(c => c.id === e.target.value);
                handleInputChange('childId', e.target.value);
                handleInputChange('childName', child ? child.name : '');
              }}
              className="w-full border rounded p-2 text-sm"
            >
              <option value="">Select child</option>
              {children.map(child => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Host</label>
            <input
              type="text"
              value={editedEvent.hostParent || ''}
              onChange={(e) => handleInputChange('hostParent', e.target.value)}
              className="w-full border rounded p-2 text-sm"
            />
          </div>
          
          {editedEvent.eventType === 'birthday' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Birthday Child</label>
                <input
                  type="text"
                  value={editedEvent.extraDetails?.birthdayChildName || ''}
                  onChange={(e) => setEditedEvent(prev => ({
                    ...prev,
                    extraDetails: {
                      ...prev.extraDetails,
                      birthdayChildName: e.target.value
                    }
                  }))}
                  className="w-full border rounded p-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Age</label>
                <input
                  type="number"
                  value={editedEvent.extraDetails?.birthdayChildAge || ''}
                  onChange={(e) => setEditedEvent(prev => ({
                    ...prev,
                    extraDetails: {
                      ...prev.extraDetails,
                      birthdayChildAge: parseInt(e.target.value)
                    }
                  }))}
                  className="w-full border rounded p-2 text-sm"
                  min="1"
                  max="18"
                />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={editedEvent.extraDetails?.notes || ''}
              onChange={(e) => setEditedEvent(prev => ({
                ...prev,
                extraDetails: {
                  ...prev.extraDetails,
                  notes: e.target.value
                }
              }))}
              className="w-full border rounded p-2 text-sm min-h-[80px]"
            ></textarea>
          </div>
          
          <div className="flex justify-end pt-3 border-t">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 border rounded-md text-sm hover:bg-gray-50 mr-2"
            >
              <X size={14} className="mr-1 inline" />
              Cancel
            </button>
            
            <button
              onClick={handleUpdate}
              className="px-4 py-1 bg-black text-white rounded-md hover:bg-gray-800"
            >
              <CheckCircle size={14} className="mr-1 inline" />
              Update
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventConfirmationCard;
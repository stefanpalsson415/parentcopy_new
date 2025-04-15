// src/components/calendar/index.js
/**
 * Allie Calendar Components Library
 * 
 * This file exports all calendar-related components to provide a standardized
 * interface for calendar functionality across the application.
 */

// Main calendar components
import RevisedFloatingCalendarWidget from './RevisedFloatingCalendarWidget';
import EnhancedEventManager from './EnhancedEventManager';

// Sub-components
import CalendarHeader from './CalendarHeader';
import CalendarGrid from './CalendarGrid';
import CalendarFilters from './CalendarFilters';
import EventsList from './EventsList';
import EventDetails from './EventDetails';
import MergedEventParser from './MergedEventParser';
import SmartReminderSuggestions from './SmartReminderSuggestions';
import CalendarPromptChip from './CalendarPromptChip';

// Integration components
import CalendarIntegrationButton from './CalendarIntegrationButton';
import AllieCalendarEvents from './AllieCalendarEvents';
import RelationshipEventCard from './RelationshipEventCard';


// Re-export everything under a consistent namespace
export {
  // Main components
  EnhancedEventManager as EventManager,
  RevisedFloatingCalendarWidget as FloatingCalendar,
  
  // Sub-components for advanced use cases
  CalendarHeader,
  CalendarGrid,
  CalendarFilters,
  EventsList,
  EventDetails,
  MergedEventParser as EventParser,
  SmartReminderSuggestions,
  CalendarPromptChip,
  
  // Integration components
  CalendarIntegrationButton,
  AllieCalendarEvents,
  RelationshipEventCard
};

// Default export the most commonly used component
export default RevisedFloatingCalendarWidget;
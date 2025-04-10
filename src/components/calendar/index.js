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

// Integration components
import CalendarIntegrationButton from './CalendarIntegrationButton';
import AllieCalendarEvents from './AllieCalendarEvents';

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
  
  // Integration components
  CalendarIntegrationButton,
  AllieCalendarEvents,
};

// Default export the most commonly used component
export default RevisedFloatingCalendarWidget;
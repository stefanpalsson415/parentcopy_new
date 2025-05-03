import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
} from 'react-native';
import { X, ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { format, addMonths, subMonths, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { useFamily } from '../../contexts/FamilyContext';
import { useEvents } from '../../contexts/EventContext';
import EventListItem from './EventListItem';

const { width, height } = Dimensions.get('window');

const MobileFloatingCalendar = ({ onClose }) => {
  // State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [opacity] = useState(new Animated.Value(0));
  
  // Contexts
  const { familyId, familyMembers } = useFamily();
  const { events, loading, refreshEvents } = useEvents();
  
  // Filter events for selected date
  const selectedDateEvents = events.filter(event => 
    isSameDay(new Date(event.startDate), selectedDate)
  );
  
  // Animate in on mount
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Refresh events when component mounts
    refreshEvents(familyId);
  }, []);
  
  // Navigate to previous month
  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  
  // Navigate to next month
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  // Handle closing the calendar
  const handleClose = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };
  
  // Generate days for the current month view
  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };
  
  // Render calendar header
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={prevMonth}>
        <ChevronLeft size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.monthText}>
        {format(currentMonth, 'MMMM yyyy')}
      </Text>
      <TouchableOpacity onPress={nextMonth}>
        <ChevronRight size={24} color="#333" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={handleClose}
      >
        <X size={24} color="#333" />
      </TouchableOpacity>
    </View>
  );
  
  // Render days of week header
  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <View style={styles.daysContainer}>
        {days.map(day => (
          <Text key={day} style={styles.dayText}>{day}</Text>
        ))}
      </View>
    );
  };
  
  // Render calendar cells
  const renderCells = () => {
    const days = getDaysInMonth();
    
    return (
      <View style={styles.cellsContainer}>
        {days.map(day => {
          // Check if this day has events
          const hasEvents = events.some(event => 
            isSameDay(new Date(event.startDate), day)
          );
          
          return (
            <TouchableOpacity
              key={day.toString()}
              style={[
                styles.cell,
                !isSameMonth(day, currentMonth) && styles.disabledCell,
                isSameDay(day, selectedDate) && styles.selectedCell,
                isToday(day) && styles.todayCell,
              ]}
              onPress={() => setSelectedDate(day)}
            >
              <Text style={[
                styles.cellText,
                isSameDay(day, selectedDate) && styles.selectedCellText,
                isToday(day) && styles.todayCellText,
              ]}>
                {format(day, 'd')}
              </Text>
              {hasEvents && (
                <View style={[
                  styles.eventDot,
                  isSameDay(day, selectedDate) && styles.selectedEventDot
                ]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };
  
  // Render events list
  const renderEvents = () => (
    <View style={styles.eventsContainer}>
      <View style={styles.eventsHeader}>
        <Text style={styles.eventsTitle}>
          Events for {format(selectedDate, 'MMMM d, yyyy')}
        </Text>
        <TouchableOpacity style={styles.addButton}>
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {selectedDateEvents.length > 0 ? (
        <FlatList
          data={selectedDateEvents}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <EventListItem event={item} />}
        />
      ) : (
        <View style={styles.noEventsContainer}>
          <Text style={styles.noEventsText}>
            No events scheduled for this day
          </Text>
        </View>
      )}
    </View>
  );
  
  return (
    <Animated.View 
      style={[
        styles.container,
        { opacity }
      ]}
    >
      <View style={styles.calendarContainer}>
        {/* Calendar header */}
        {renderHeader()}
        
        {/* Days of week */}
        {renderDays()}
        
        {/* Calendar cells */}
        {renderCells()}
        
        {/* Events list */}
        {renderEvents()}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  calendarContainer: {
    width: width * 0.9,
    height: height * 0.7,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  daysContainer: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingHorizontal: 8,
  },
  dayText: {
    flex: 1,
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
  },
  cellsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  cellText: {
    fontSize: 16,
  },
  disabledCell: {
    opacity: 0.3,
  },
  selectedCell: {
    backgroundColor: '#0084ff',
    borderRadius: 20,
  },
  selectedCellText: {
    color: '#fff',
  },
  todayCell: {
    borderWidth: 1,
    borderColor: '#0084ff',
    borderRadius: 20,
  },
  todayCellText: {
    color: '#0084ff',
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0084ff',
    marginTop: 4,
  },
  selectedEventDot: {
    backgroundColor: '#fff',
  },
  eventsContainer: {
    flex: 1,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  eventsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#0084ff',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noEventsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noEventsText: {
    color: '#999',
    textAlign: 'center',
  },
});

export default MobileFloatingCalendar;
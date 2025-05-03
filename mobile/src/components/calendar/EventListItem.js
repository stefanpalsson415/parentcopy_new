import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, User } from 'lucide-react-native';

const EventListItem = ({ event, onPress }) => {
  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'h:mm a');
  };
  
  // Get event color based on category
  const getEventColor = (category) => {
    const colorMap = {
      appointment: '#FF6B6B',
      work: '#4ECDC4',
      personal: '#45B7D1',
      family: '#FFA62B',
      children: '#A8DF65',
      date: '#E88BE4',
      relationship: '#E88BE4',
      default: '#0084ff',
    };
    
    return colorMap[category?.toLowerCase()] || colorMap.default;
  };
  
  const eventColor = getEventColor(event.category);
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onPress && onPress(event)}
      activeOpacity={0.7}
    >
      <View style={[styles.colorStrip, { backgroundColor: eventColor }]} />
      <View style={styles.contentContainer}>
        <Text style={styles.titleText}>{event.title}</Text>
        
        <View style={styles.detailsContainer}>
          {event.startDate && (
            <View style={styles.detailItem}>
              <Clock size={14} color="#666" style={styles.icon} />
              <Text style={styles.detailText}>
                {formatTime(event.startDate)}
                {event.endDate && ` - ${formatTime(event.endDate)}`}
              </Text>
            </View>
          )}
          
          {event.location && (
            <View style={styles.detailItem}>
              <MapPin size={14} color="#666" style={styles.icon} />
              <Text style={styles.detailText} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
          )}
          
          {event.attendees && event.attendees.length > 0 && (
            <View style={styles.detailItem}>
              <User size={14} color="#666" style={styles.icon} />
              <Text style={styles.detailText} numberOfLines={1}>
                {event.attendees.join(', ')}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  colorStrip: {
    width: 6,
    backgroundColor: '#0084ff',
  },
  contentContainer: {
    flex: 1,
    padding: 12,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  detailsContainer: {
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  icon: {
    marginRight: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
});

export default EventListItem;
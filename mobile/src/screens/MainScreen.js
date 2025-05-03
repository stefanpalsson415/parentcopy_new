import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Calendar } from 'lucide-react-native';
import MobileAllieChat from '../components/chat/MobileAllieChat';
import MobileFloatingCalendar from '../components/calendar/MobileFloatingCalendar';
import TouchableIcon from '../components/common/TouchableIcon';

const MainScreen = () => {
  const [showCalendar, setShowCalendar] = useState(false);
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Allie Chat takes the full screen when calendar is hidden */}
      <MobileAllieChat fullScreen={!showCalendar} />
      
      {/* Floating calendar can be shown/hidden */}
      {showCalendar && (
        <MobileFloatingCalendar 
          onClose={() => setShowCalendar(false)}
        />
      )}
      
      {/* Calendar toggle button - always visible */}
      {!showCalendar && (
        <TouchableIcon
          icon={Calendar}
          size={24}
          color="#0084ff"
          style={styles.calendarButton}
          onPress={() => setShowCalendar(true)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  calendarButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 14,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 100,
  },
});

export default MainScreen;
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

const TouchableIcon = ({ icon: Icon, size, color, style, onPress }) => {
  return (
    <TouchableOpacity 
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon size={size} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TouchableIcon;
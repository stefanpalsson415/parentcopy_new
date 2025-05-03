import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

const ChatMessage = ({ message }) => {
  const { currentUser } = useAuth();
  const isUser = message.sender !== 'allie';
  
  // Format timestamp for display
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Handle typing indicator
  if (message.isTyping) {
    return (
      <View style={[styles.messageContainer, styles.allieContainer]}>
        <View style={[styles.messageBubble, styles.allieBubble]}>
          <ActivityIndicator size="small" color="#555" />
        </View>
      </View>
    );
  }
  
  return (
    <View style={[
      styles.messageContainer,
      isUser ? styles.userContainer : styles.allieContainer
    ]}>
      <View style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.allieBubble,
        message.error && styles.errorBubble
      ]}>
        <Text style={[
          styles.messageText,
          isUser ? styles.userText : styles.allieText
        ]}>
          {message.text}
        </Text>
      </View>
      <Text style={styles.timestamp}>
        {formatTime(message.timestamp)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  allieContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 4,
  },
  userBubble: {
    backgroundColor: '#0084ff',
  },
  allieBubble: {
    backgroundColor: '#f0f0f0',
  },
  errorBubble: {
    backgroundColor: '#ffeeee',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  allieText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
});

export default ChatMessage;
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Mic, Send, Camera, X } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useFamily } from '../../contexts/FamilyContext';
import ChatMessage from './ChatMessage';
import TouchableIcon from '../common/TouchableIcon';
import * as Speech from 'expo-speech';
import * as Voice from 'expo-voice';
import ClaudeMobileService from '../../services/ClaudeMobileService';

const MobileAllieChat = ({ fullScreen = true }) => {
  const { currentUser } = useAuth();
  const { familyId, selectedUser, familyMembers } = useFamily();
  
  // State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  
  // Refs
  const flatListRef = useRef(null);
  
  // Load messages on component mount
  useEffect(() => {
    if (familyId) {
      loadMessages();
    }
  }, [familyId]);
  
  // Configure voice recognition
  useEffect(() => {
    const setupVoice = async () => {
      try {
        await Voice.destroy();
        await Voice.initialize();
        
        Voice.onSpeechStart = () => {
          console.log('Speech started');
        };
        
        Voice.onSpeechEnd = () => {
          console.log('Speech ended');
        };
        
        Voice.onSpeechResults = (e) => {
          if (e.value && e.value[0]) {
            setInput(e.value[0]);
            setIsListening(false);
            setShowVoiceInput(false);
          }
        };
        
        Voice.onSpeechError = (e) => {
          console.error('Speech error:', e);
          setIsListening(false);
        };
      } catch (error) {
        console.error('Error initializing voice:', error);
      }
    };
    
    setupVoice();
    return () => Voice.destroy();
  }, []);
  
  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd();
      }, 100);
    }
  }, [messages]);
  
  const loadMessages = async () => {
    try {
      setLoading(true);
      // This would use ChatPersistenceService in the real app
      // For this example, we'll just add a welcome message
      setMessages([
        {
          id: '1',
          sender: 'allie',
          text: `Hi ${selectedUser?.name || 'there'}! I'm Allie, your family assistant. How can I help you today?`,
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    // Add user message to chat
    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // Process the message
    try {
      setLoading(true);
      
      // Add typing indicator
      setMessages(prev => [...prev, {
        id: 'typing-' + Date.now(),
        sender: 'allie',
        isTyping: true,
        timestamp: new Date().toISOString()
      }]);
      
      // Get response from Claude
      const response = await ClaudeMobileService.getResponse(
        input,
        familyId,
        messages.slice(-5).map(m => m.text)
      );
      
      // Replace typing indicator with real response
      setMessages(prev => prev.filter(m => !m.isTyping).concat({
        id: Date.now().toString(),
        sender: 'allie',
        text: response,
        timestamp: new Date().toISOString()
      }));
      
      // Read response aloud (optional feature, can be toggled)
      // Speech.speak(response, { rate: 0.9, pitch: 1.0 });
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Add error message
      setMessages(prev => prev.filter(m => !m.isTyping).concat({
        id: Date.now().toString(),
        sender: 'allie',
        text: "I'm having trouble responding right now. Please try again.",
        timestamp: new Date().toISOString()
      }));
    } finally {
      setLoading(false);
    }
  };
  
  const startListening = async () => {
    try {
      setIsListening(true);
      setShowVoiceInput(true);
      await Voice.start('en-US');
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      setIsListening(false);
    }
  };
  
  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
    }
  };
  
  // Render voice input modal
  const renderVoiceInputModal = () => {
    if (!showVoiceInput) return null;
    
    return (
      <View style={styles.voiceInputContainer}>
        <View style={styles.voiceInputContent}>
          <Text style={styles.voiceInputTitle}>
            {isListening ? 'Listening...' : 'Processing...'}
          </Text>
          
          <View style={styles.micContainer}>
            <View style={[
              styles.micButton,
              isListening && styles.micButtonActive
            ]}>
              <Mic size={32} color={isListening ? '#fff' : '#0084ff'} />
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => {
              stopListening();
              setShowVoiceInput(false);
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        fullScreen ? styles.fullScreen : styles.partialScreen
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Chat messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ChatMessage message={item} />}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />
      
      {/* Input area */}
      <View style={styles.inputContainer}>
        <TouchableIcon
          icon={Camera}
          size={24}
          color="#666"
          style={styles.iconButton}
          onPress={() => {
            // Handle photo upload
          }}
        />
        
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message Allie..."
          multiline
          onSubmitEditing={handleSend}
        />
        
        {input.trim() ? (
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handleSend}
            disabled={loading}
          >
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.micButton}
            onPress={startListening}
          >
            <Mic size={24} color="#0084ff" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Voice input modal */}
      {renderVoiceInputModal()}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f8ff',
  },
  fullScreen: {
    height: '100%',
  },
  partialScreen: {
    height: '60%',
  },
  messageList: {
    padding: 16,
    paddingBottom: 80,
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    padding: 10,
    maxHeight: 100,
    backgroundColor: '#f8f8f8',
  },
  iconButton: {
    padding: 8,
  },
  sendButton: {
    backgroundColor: '#0084ff',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#0084ff',
  },
  micButtonActive: {
    backgroundColor: '#0084ff',
  },
  voiceInputContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  voiceInputContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  voiceInputTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
  },
  micContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: '#0084ff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MobileAllieChat;
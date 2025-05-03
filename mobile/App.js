import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './src/contexts/AuthContext';
import { FamilyProvider } from './src/contexts/FamilyContext';
import { EventProvider } from './src/contexts/EventContext';
import LoginScreen from './src/screens/LoginScreen';
import MainScreen from './src/screens/MainScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <AuthProvider>
        <FamilyProvider>
          <EventProvider>
            <StatusBar style="auto" />
            <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Main" component={MainScreen} />
            </Stack.Navigator>
          </EventProvider>
        </FamilyProvider>
      </AuthProvider>
    </NavigationContainer>
  );
}
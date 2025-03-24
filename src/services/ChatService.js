// src/services/ChatService.js
import { db } from './firebase';
import ClaudeService from './ClaudeService';
import { knowledgeBase } from '../data/AllieKnowledgeBase';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, doc, getDoc, limit } from 'firebase/firestore';

class ChatService {
  // Load messages for a family
  async loadMessages(familyId) {
    try {
      if (!familyId) {
        console.warn("No familyId provided to loadMessages");
        return [];
      }

      const q = query(
        collection(db, "chatMessages"),
        where("familyId", "==", familyId),
        orderBy("timestamp", "asc")
      );
      
      const querySnapshot = await getDocs(q);
      const messages = [];
      
      querySnapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`Loaded ${messages.length} messages for family ${familyId}`);
      return messages;
    } catch (error) {
      console.error("Error loading messages:", error);
      return [];
    }
  }
  
  // Save a message to the database
  async saveMessage(message) {
    try {
      if (!message.familyId) {
        console.error("Cannot save message without familyId", message);
        return false;
      }

      const docRef = await addDoc(collection(db, "chatMessages"), {
        ...message,
        createdAt: serverTimestamp()
      });
      
      console.log(`Message saved with ID: ${docRef.id}`);
      return true;
    } catch (error) {
      console.error("Error saving message:", error);
      return false;
    }
  }
  
  // Get AI response to a message
  // Get AI response to a message
// Get AI response to a message
async getAIResponse(text, familyId, previousMessages) {
  try {
    // Log request with more details for debugging
    console.log("Allie Chat request:", { 
      text, 
      familyId, 
      previousMessagesCount: previousMessages?.length || 0
    });
    
    // Better error handling for missing familyId
    if (!familyId) {
      console.warn("getAIResponse called without familyId");
      return "I need access to your family data to provide personalized responses. Please ensure you're logged in correctly.";
    }
    
    // Verify we have the minimally required data to proceed
    if (!text || text.trim() === '') {
      console.warn("Empty message text received");
      return "I didn't receive any message to respond to. Please try again.";
    }
    
    // Add a start timestamp for performance tracking
    const startTime = Date.now();
    console.log(`Starting AI response generation at ${new Date().toISOString()}`);
      
    // Get family data from Firestore for context
    let familyData = {};
    try {
      console.log("Getting family context for:", familyId);
      familyData = await this.getFamilyContext(familyId);
      console.log("Got family context with keys:", Object.keys(familyData));
    } catch (contextError) {
      console.error("Error getting family context:", contextError);
      return "I'm having trouble accessing your family data right now. Please try again in a moment.";
    }
      
    // Check if we actually got meaningful family data
    if (!familyData || Object.keys(familyData).length < 3) {
      console.warn("Insufficient family data for personalized response");
      return "I couldn't retrieve your complete family data. Please try refreshing the page or logging in again.";
    }
      
    // Add knowledge base to context
    familyData.knowledgeBase = knowledgeBase;
      
    // Format messages for Claude API
    const formattedMessages = previousMessages
      .slice(-10) // Last 10 messages for context
      .map(msg => ({
        role: msg.sender === 'allie' ? 'assistant' : 'user',
        content: msg.text
      }));

    // Add the current message
    formattedMessages.push({
      role: 'user',
      content: text
    });
    
    console.log("Sending to Claude API via proxy:", {
      messageCount: formattedMessages.length,
      contextSize: JSON.stringify(familyData).length,
      familyDataKeys: Object.keys(familyData)
    });
      
    // Call the Claude API through our service with updated code
    let response;
    try {
      response = await ClaudeService.generateResponse(
        formattedMessages, 
        familyData
      );
      console.log("Claude API call succeeded with response length:", response?.length);
    } catch (apiError) {
      console.error("Claude API error details:", apiError);
      // Try fallback response first before giving up
      response = ClaudeService.createPersonalizedResponse(text, familyData);
      console.log("Using fallback personalized response:", response?.substring(0, 50) + "...");
    }
      
    // If we got a response, return it
    if (response && response.length > 0) {
      return response;
    }
      
    // If we got here, something went wrong but didn't throw an error
    return "I should be able to answer this with your family's data, but I'm having trouble processing it right now. Could you try asking in a different way?";
  } catch (error) {
    console.error("Error getting AI response:", error);
      
    // Provide more specific error message for common issues
    if (error.message?.includes("timeout")) {
      return "I'm taking longer than expected to process your question. This might be due to high demand. Please try again in a moment.";
    }
      
    if (text.toLowerCase().includes("survey") || text.toLowerCase().includes("data")) {
      return "I'd like to analyze your survey data, but I'm having trouble accessing it right now. Please try refreshing the page or asking again in a few moments.";
    }
      
    return "I'm having trouble processing your question right now. While I'm reconnecting, you can explore the dashboard for insights or check your tasks in the Tasks tab.";
  }
}

  // Get family context for AI response
  async getFamilyContext(familyId) {
    try {
      // Get family data from Firestore
      const docRef = doc(db, "families", familyId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // NEW: Get survey responses from the surveyResponses collection
        const surveyResponsesQuery = query(
          collection(db, "surveyResponses"), 
          where("familyId", "==", familyId)
        );
        const surveyResponsesSnapshot = await getDocs(surveyResponsesQuery);
        
        // Process and merge all responses
        const completeResponses = {};
        surveyResponsesSnapshot.forEach((doc) => {
          const responseData = doc.data();
          if (responseData.responses) {
            // Merge all responses together
            Object.assign(completeResponses, responseData.responses);
          }
        });
        
        console.log("Retrieved survey responses:", Object.keys(completeResponses).length);
        
        // Extract survey data if available
        let surveyData = {};
        if (completeResponses && Object.keys(completeResponses).length > 0) {
          surveyData = {
            totalQuestions: Object.keys(completeResponses).length,
            mamaPercentage: this.calculateMamaPercentage(completeResponses),
            categories: this.getCategoryBreakdown(completeResponses),
            responses: completeResponses  // Include the actual responses
          };
        } else {
          // Check if responses are directly in the family document (fallback)
          if (data.surveyResponses && Object.keys(data.surveyResponses).length > 0) {
            surveyData = {
              totalQuestions: Object.keys(data.surveyResponses).length,
              mamaPercentage: this.calculateMamaPercentage(data.surveyResponses),
              categories: this.getCategoryBreakdown(data.surveyResponses),
              responses: data.surveyResponses
            };
          }
        }
        
        // Get the full task list
        const tasks = data.tasks || [];
        
        // Get week history data for insights
        const weekHistory = data.weekHistory || {};
        
        // Get impactInsights if available
        const impactInsights = data.impactInsights || [];
        
        // Get balance scores if available
        let balanceScores = null;
        try {
          // Try to calculate current weighted balance scores
          if (data.weightedScores) {
            balanceScores = data.weightedScores;
          }
        } catch (e) {
          console.warn("Error getting balance scores:", e);
        }
        
        // Get relationship strategies data
        let relationshipData = {};
        try {
          const stratDocRef = doc(db, "relationshipStrategies", familyId);
          const stratDocSnap = await getDoc(stratDocRef);
          
          if (stratDocSnap.exists()) {
            const strategies = stratDocSnap.data().strategies || [];
            
            relationshipData = {
              implementedStrategies: strategies.filter(s => s.implementation > 50).map(s => s.name),
              topStrategy: strategies.sort((a, b) => b.implementation - a.implementation)[0]?.name,
              avgImplementation: strategies.length > 0 
                ? strategies.reduce((sum, s) => sum + s.implementation, 0) / strategies.length 
                : 0,
              allStrategies: strategies  // Include all strategies
            };
          }
        } catch (e) {
          console.error("Error getting relationship strategies:", e);
        }
        
        // Get couple check-in data
        let coupleData = {};
        try {
          const checkInQuery = query(
            collection(db, "coupleCheckIns"),
            where("familyId", "==", familyId),
            orderBy("completedAt", "desc"),
            limit(5)  // Get the last 5 check-ins for trend analysis
          );
          
          const checkInSnapshot = await getDocs(checkInQuery);
          if (!checkInSnapshot.empty) {
            const checkIns = checkInSnapshot.docs.map(doc => doc.data());
            
            coupleData = {
              lastCheckIn: checkIns[0].completedAt?.toDate?.().toISOString() || null,
              satisfaction: checkIns[0].data?.satisfaction || null,
              communication: checkIns[0].data?.communication || null,
              history: checkIns  // Include full history of check-ins
            };
          }
        } catch (e) {
          console.error("Error getting couple check-in data:", e);
        }
        
        // Create the return object
        const contextData = {
          familyId: familyId,
          familyName: data.familyName,
          adults: data.familyMembers.filter(m => m.role === 'parent').length,
          children: data.familyMembers.filter(m => m.role === 'child'),
          familyMembers: data.familyMembers,  // Include all family members
          currentWeek: data.currentWeek,
          completedWeeks: data.completedWeeks || [],
          surveyData,
          tasks,  // Include all tasks
          weekHistory,  // Include week history
          impactInsights,  // Include impact insights
          balanceScores,  // Include balance scores
          relationshipData,
          coupleData
        };
  
        // Log the context data for debugging
        console.log("Family context generated:", {
          dataKeys: Object.keys(contextData),
          hasResponses: !!contextData.surveyData?.responses,
          responseCount: contextData.surveyData?.responses ? Object.keys(contextData.surveyData.responses).length : 0,
          tasksCount: contextData.tasks?.length || 0
        });
  
        return contextData;
      }
      
      return {};
    } catch (error) {
      console.error("Error getting family context:", error);
      return {};
    }
  }
  
  // Helper method to calculate mama percentage from survey responses
  calculateMamaPercentage(responses) {
    let mamaCount = 0;
    let totalCount = 0;
    
    Object.values(responses).forEach(response => {
      if (response === 'Mama' || response === 'Papa') {
        totalCount++;
        if (response === 'Mama') {
          mamaCount++;
        }
      }
    });
    
    return totalCount > 0 ? (mamaCount / totalCount) * 100 : 50;
  }
  
  // Helper method to get category breakdown from survey responses
  getCategoryBreakdown(responses) {
    const categories = {
      "Visible Household Tasks": { mama: 0, papa: 0, total: 0 },
      "Invisible Household Tasks": { mama: 0, papa: 0, total: 0 },
      "Visible Parental Tasks": { mama: 0, papa: 0, total: 0 },
      "Invisible Parental Tasks": { mama: 0, papa: 0, total: 0 }
    };
    
    // Simple categorization based on question IDs (approximate)
    // In a real implementation, you would have a mapping of question IDs to categories
    Object.entries(responses).forEach(([key, value]) => {
      if (value !== 'Mama' && value !== 'Papa') return;
      
      // Extract question number if possible
      const match = key.match(/q(\d+)/);
      if (!match) return;
      
      const qNum = parseInt(match[1]);
      let category;
      
      if (qNum <= 20) {
        category = "Visible Household Tasks";
      } else if (qNum <= 40) {
        category = "Invisible Household Tasks";
      } else if (qNum <= 60) {
        category = "Visible Parental Tasks";
      } else {
        category = "Invisible Parental Tasks";
      }
      
      categories[category].total++;
      if (value === 'Mama') {
        categories[category].mama++;
      } else {
        categories[category].papa++;
      }
    });
    
    // Calculate percentages
    Object.keys(categories).forEach(category => {
      const { mama, total } = categories[category];
      if (total > 0) {
        categories[category].mamaPercent = (mama / total) * 100;
        categories[category].papaPercent = 100 - (mama / total) * 100;
      } else {
        categories[category].mamaPercent = 50;
        categories[category].papaPercent = 50;
      }
    });
    
    return categories;
  }
}

export default new ChatService();
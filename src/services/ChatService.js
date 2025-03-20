// src/services/ChatService.js
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import ClaudeService from './ClaudeService';
// Add this import at the top of the file
import { knowledgeBase } from '../data/AllieKnowledgeBase';

class ChatService {
  // Load messages for a family
  async loadMessages(familyId) {
    try {
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
      
      return messages;
    } catch (error) {
      console.error("Error loading messages:", error);
      throw error;
    }
  }
  
  // Save a message to the database
  async saveMessage(message) {
    try {
      await addDoc(collection(db, "chatMessages"), {
        ...message,
        createdAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error("Error saving message:", error);
      throw error;
    }
  }
  

// Find and update the getAIResponse method (typically around line 50-80)
async getAIResponse(text, familyId, previousMessages) {
  try {
    // Get family data from Firestore for context
    const familyData = await this.getFamilyContext(familyId);
    
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
    
    // Call the Claude API through our service
    const response = await ClaudeService.generateResponse(
      formattedMessages, 
      familyData
    );
    
    return response;
  } catch (error) {
    console.error("Error getting AI response:", error);
    return "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment.";
  }
}
  
  // Get family context data for the AI
  // Update the getFamilyContext method
async getFamilyContext(familyId) {
  try {
    // Get family data from Firestore
    const docRef = doc(db, "families", familyId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Extract survey data if available
      let surveyData = {};
      if (data.surveyResponses) {
        surveyData = {
          totalQuestions: Object.keys(data.surveyResponses).length,
          mamaPercentage: this.calculateMamaPercentage(data.surveyResponses),
          categories: this.getCategoryBreakdown(data.surveyResponses)
        };
      }
      
      // NEW: Get relationship strategies data
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
              : 0
          };
        }
      } catch (e) {
        console.error("Error getting relationship strategies:", e);
      }
      
      // NEW: Get couple check-in data
      let coupleData = {};
      try {
        const checkInQuery = query(
          collection(db, "coupleCheckIns"),
          where("familyId", "==", familyId),
          orderBy("completedAt", "desc"),
          limit(1)
        );
        
        const checkInSnapshot = await getDocs(checkInQuery);
        if (!checkInSnapshot.empty) {
          const latestCheckIn = checkInSnapshot.docs[0].data();
          
          coupleData = {
            lastCheckIn: latestCheckIn.completedAt?.toDate?.().toISOString() || null,
            satisfaction: latestCheckIn.data?.satisfaction || null,
            communication: latestCheckIn.data?.communication || null
          };
        }
      } catch (e) {
        console.error("Error getting couple check-in data:", e);
      }
      
      return {
        familyName: data.familyName,
        adults: data.familyMembers.filter(m => m.role === 'parent').length,
        children: data.familyMembers.filter(m => m.role === 'child'),
        currentWeek: data.currentWeek,
        surveyData,
        relationshipData, // NEW
        coupleData // NEW
      };
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
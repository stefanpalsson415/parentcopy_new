// src/services/ChildAnalyticsService.js
import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  orderBy 
} from 'firebase/firestore';
import { knowledgeBase } from '../data/AllieKnowledgeBase';

class ChildAnalyticsService {
  /**
   * Retrieve and analyze complete child data history
   * @param {string} familyId - Family ID
   * @param {string} childId - Child ID
   * @returns {Promise<Object>} Child data with analytics
   */
  async getChildAnalytics(familyId, childId) {
    try {
      if (!familyId || !childId) {
        throw new Error("Family ID and Child ID are required");
      }
      
      // Get basic child information
      const childData = await this.getChildData(familyId, childId);
      
      // Get child's medical appointments
      const medicalData = await this.getMedicalHistory(familyId, childId);
      
      // Get child's growth data
      const growthData = await this.getGrowthData(familyId, childId);
      
      // Get child's emotional well-being data
      const emotionalData = await this.getEmotionalData(familyId, childId);
      
      // Get child's academic data
      const academicData = await this.getAcademicData(familyId, childId);
      
      // Get activity data
      const activityData = await this.getActivityData(familyId, childId);
      
      // Process data for insights
      return {
        basicInfo: childData,
        medicalAnalytics: this.analyzeMedicalData(medicalData, childData),
        growthAnalytics: this.analyzeGrowthData(growthData, childData),
        emotionalAnalytics: this.analyzeEmotionalData(emotionalData),
        academicAnalytics: this.analyzeAcademicData(academicData),
        activityAnalytics: this.analyzeActivityData(activityData),
        insights: this.generateInsights({
          childData,
          medicalData,
          growthData,
          emotionalData,
          academicData,
          activityData
        })
      };
    } catch (error) {
      console.error("Error getting child analytics:", error);
      throw error;
    }
  }
  
  /**
   * Get basic child information
   * @param {string} familyId - Family ID
   * @param {string} childId - Child ID
   * @returns {Promise<Object>} Child data
   */
  async getChildData(familyId, childId) {
    try {
      // Try to get from family member collection first
      const childDocRef = doc(db, "familyMembers", childId);
      const childDoc = await getDoc(childDocRef);
      
      if (childDoc.exists()) {
        return childDoc.data();
      }
      
      // Fallback: try to get from family document
      const familyDocRef = doc(db, "families", familyId);
      const familyDoc = await getDoc(familyDocRef);
      
      if (familyDoc.exists()) {
        const familyData = familyDoc.data();
        const child = familyData.familyMembers?.find(m => m.id === childId);
        
        if (child) {
          return child;
        }
      }
      
      throw new Error("Child not found");
    } catch (error) {
      console.error("Error getting child data:", error);
      throw error;
    }
  }
  
  /**
   * Get child's medical history
   * @param {string} familyId - Family ID
   * @param {string} childId - Child ID
   * @returns {Promise<Array>} Medical appointments
   */
  async getMedicalHistory(familyId, childId) {
    try {
      // First check for dedicated medical collection
      const medicalQuery = query(
        collection(db, "medicalAppointments"),
        where("familyId", "==", familyId),
        where("childId", "==", childId),
        orderBy("date", "desc")
      );
      
      const medicalSnapshot = await getDocs(medicalQuery);
      const appointments = [];
      
      medicalSnapshot.forEach(doc => {
        appointments.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // If we found appointments, return them
      if (appointments.length > 0) {
        return appointments;
      }
      
      // Fallback: check family document for childrenData
      const familyDocRef = doc(db, "families", familyId);
      const familyDoc = await getDoc(familyDocRef);
      
      if (familyDoc.exists()) {
        const familyData = familyDoc.data();
        return familyData.childrenData?.[childId]?.medicalAppointments || [];
      }
      
      return [];
    } catch (error) {
      console.error("Error getting medical history:", error);
      return [];
    }
  }
  
  /**
   * Get child's growth data
   * @param {string} familyId - Family ID
   * @param {string} childId - Child ID
   * @returns {Promise<Array>} Growth measurements
   */
  async getGrowthData(familyId, childId) {
    try {
      // First check for dedicated growth collection
      const growthQuery = query(
        collection(db, "childGrowth"),
        where("familyId", "==", familyId),
        where("childId", "==", childId),
        orderBy("date", "desc")
      );
      
      const growthSnapshot = await getDocs(growthQuery);
      const measurements = [];
      
      growthSnapshot.forEach(doc => {
        measurements.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // If we found measurements, return them
      if (measurements.length > 0) {
        return measurements;
      }
      
      // Fallback: check family document for childrenData
      const familyDocRef = doc(db, "families", familyId);
      const familyDoc = await getDoc(familyDocRef);
      
      if (familyDoc.exists()) {
        const familyData = familyDoc.data();
        return familyData.childrenData?.[childId]?.growthData || [];
      }
      
      return [];
    } catch (error) {
      console.error("Error getting growth data:", error);
      return [];
    }
  }
  
  /**
   * Get child's emotional well-being data
   * @param {string} familyId - Family ID
   * @param {string} childId - Child ID
   * @returns {Promise<Array>} Emotional check-ins
   */
  async getEmotionalData(familyId, childId) {
    try {
      // First check for dedicated emotional collection
      const emotionalQuery = query(
        collection(db, "emotionalWellbeing"),
        where("familyId", "==", familyId),
        where("childId", "==", childId),
        orderBy("date", "desc")
      );
      
      const emotionalSnapshot = await getDocs(emotionalQuery);
      const checkIns = [];
      
      emotionalSnapshot.forEach(doc => {
        checkIns.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // If we found check-ins, return them
      if (checkIns.length > 0) {
        return checkIns;
      }
      
      // Fallback: check family document for childrenData
      const familyDocRef = doc(db, "families", familyId);
      const familyDoc = await getDoc(familyDocRef);
      
      if (familyDoc.exists()) {
        const familyData = familyDoc.data();
        return familyData.childrenData?.[childId]?.emotionalCheckIns || [];
      }
      
      return [];
    } catch (error) {
      console.error("Error getting emotional data:", error);
      return [];
    }
  }
  
  /**
   * Get child's academic data
   * @param {string} familyId - Family ID
   * @param {string} childId - Child ID
   * @returns {Promise<Array>} Academic records
   */
  async getAcademicData(familyId, childId) {
    try {
      // First check for dedicated academic collection
      const academicQuery = query(
        collection(db, "academicRecords"),
        where("familyId", "==", familyId),
        where("childId", "==", childId),
        orderBy("date", "desc")
      );
      
      const academicSnapshot = await getDocs(academicQuery);
      const records = [];
      
      academicSnapshot.forEach(doc => {
        records.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // If we found records, return them
      if (records.length > 0) {
        return records;
      }
      
      // Fallback: check family document for childrenData
      const familyDocRef = doc(db, "families", familyId);
      const familyDoc = await getDoc(familyDocRef);
      
      if (familyDoc.exists()) {
        const familyData = familyDoc.data();
        return familyData.childrenData?.[childId]?.academicRecords || [];
      }
      
      return [];
    } catch (error) {
      console.error("Error getting academic data:", error);
      return [];
    }
  }
  
  /**
   * Get child's activity data
   * @param {string} familyId - Family ID
   * @param {string} childId - Child ID
   * @returns {Promise<Array>} Activity records
   */
  async getActivityData(familyId, childId) {
    try {
      // First check for dedicated activities collection
      const activityQuery = query(
        collection(db, "childActivities"),
        where("familyId", "==", familyId),
        where("childId", "==", childId),
        orderBy("date", "desc")
      );
      
      const activitySnapshot = await getDocs(activityQuery);
      const activities = [];
      
      activitySnapshot.forEach(doc => {
        activities.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // If we found activities, return them
      if (activities.length > 0) {
        return activities;
      }
      
      // Fallback: check family document for childrenData
      const familyDocRef = doc(db, "families", familyId);
      const familyDoc = await getDoc(familyDocRef);
      
      if (familyDoc.exists()) {
        const familyData = familyDoc.data();
        return familyData.childrenData?.[childId]?.activities || [];
      }
      
      return [];
    } catch (error) {
      console.error("Error getting activity data:", error);
      return [];
    }
  }
  
  /**
   * Analyze medical data for insights
   * @param {Array} medicalData - Medical history
   * @param {Object} childData - Basic child info
   * @returns {Object} Medical analytics
   */
  analyzeMedicalData(medicalData, childData) {
    // Skip if no data
    if (!medicalData || medicalData.length === 0) {
      return {
        lastCheckup: null,
        upcomingAppointments: [],
        pastAppointments: [],
        vaccineStatus: 'unknown',
        checkupStatus: 'unknown',
        recommendations: []
      };
    }
    
    // Get child's age
    const childAge = this.calculateChildAge(childData);
    
    // Sort appointments by date
    const sortedAppointments = [...medicalData].sort((a, b) => {
      const dateA = new Date(a.date || a.dateTime);
      const dateB = new Date(b.date || b.dateTime);
      return dateB - dateA; // Newest first
    });
    
    // Filter past and upcoming appointments
    const now = new Date();
    const upcomingAppointments = sortedAppointments.filter(apt => {
      const aptDate = new Date(apt.date || apt.dateTime);
      return aptDate > now;
    });
    
    const pastAppointments = sortedAppointments.filter(apt => {
      const aptDate = new Date(apt.date || apt.dateTime);
      return aptDate <= now;
    });
    
    // Find the last checkup
    const checkups = pastAppointments.filter(apt => 
      apt.appointmentType?.toLowerCase().includes('checkup') ||
      apt.type?.toLowerCase().includes('checkup') ||
      apt.title?.toLowerCase().includes('checkup') ||
      apt.title?.toLowerCase().includes('well visit') ||
      apt.title?.toLowerCase().includes('annual')
    );
    
    const lastCheckup = checkups.length > 0 ? checkups[0] : null;
    
    // Get recommended checkup frequency based on age
    let recommendedFrequency = 12; // Default: annual
    
    if (childAge < 1) {
      recommendedFrequency = 2; // Every 2 months for infants
    } else if (childAge < 3) {
      recommendedFrequency = 3; // Every 3 months for toddlers
    } else if (childAge < 6) {
      recommendedFrequency = 6; // Every 6 months for preschoolers
    }
    
    // Determine checkup status
    let checkupStatus = 'unknown';
    let checkupRecommendation = null;
    
    if (lastCheckup) {
      const lastCheckupDate = new Date(lastCheckup.date || lastCheckup.dateTime);
      const monthsSinceCheckup = this.getMonthsDifference(lastCheckupDate, now);
      
      if (monthsSinceCheckup > recommendedFrequency) {
        checkupStatus = 'overdue';
        checkupRecommendation = `Last checkup was ${monthsSinceCheckup.toFixed(1)} months ago. Recommended frequency for a ${childAge}-year-old is every ${recommendedFrequency} months.`;
      } else {
        checkupStatus = 'up-to-date';
      }
    } else {
      checkupStatus = 'unknown';
      checkupRecommendation = `No checkup records found. Recommended frequency for a ${childAge}-year-old is every ${recommendedFrequency} months.`;
    }
    
    // Get vaccine info from knowledge base
    const milestones = knowledgeBase?.whitepapers?.childDevelopment?.medicalCheckups || {};
    
    // Determine age category
    let ageCategory;
    if (childAge < 1) ageCategory = 'infant';
    else if (childAge < 3) ageCategory = 'toddler';
    else if (childAge < 6) ageCategory = 'preschool';
    else if (childAge < 13) ageCategory = 'schoolAge';
    else ageCategory = 'adolescent';
    
    // Get recommended vaccines for age
    const recommendedSchedule = milestones[ageCategory]?.schedule || '';
    const recommendedVaccines = milestones[ageCategory]?.vaccines || '';
    
    // Generate recommendations
    const recommendations = [];
    
    if (checkupRecommendation) {
      recommendations.push({
        type: 'checkup',
        message: checkupRecommendation,
        priority: checkupStatus === 'overdue' ? 'high' : 'medium'
      });
    }
    
    if (upcomingAppointments.length === 0 && checkupStatus === 'overdue') {
      recommendations.push({
        type: 'schedule',
        message: `Consider scheduling a checkup for ${childData.name}.`,
        priority: 'medium'
      });
    }
    
    return {
      lastCheckup,
      upcomingAppointments,
      pastAppointments: pastAppointments.slice(0, 5), // Limit to recent 5
      recommendedSchedule,
      recommendedVaccines,
      checkupStatus,
      vaccineStatus: 'unknown', // Without detailed vaccine records, we can't determine
      recommendations
    };
  }
  
  /**
   * Analyze growth data for insights
   * @param {Array} growthData - Growth measurements
   * @param {Object} childData - Basic child info
   * @returns {Object} Growth analytics
   */
  analyzeGrowthData(growthData, childData) {
    // Skip if no data
    if (!growthData || growthData.length === 0) {
      return {
        latestMeasurements: null,
        growthPercentiles: null,
        growthTrends: null,
        recommendations: []
      };
    }
    
    // Sort measurements by date
    const sortedMeasurements = [...growthData].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA; // Newest first
    });
    
    // Get latest measurements
    const latestMeasurements = sortedMeasurements[0];
    
    // Calculate growth trends if we have at least 2 measurements
    let growthTrends = null;
    
    if (sortedMeasurements.length >= 2) {
      const oldestMeasurement = sortedMeasurements[sortedMeasurements.length - 1];
      const latestMeasurement = sortedMeasurements[0];
      
      const dateDiff = this.getMonthsDifference(
        new Date(oldestMeasurement.date),
        new Date(latestMeasurement.date)
      );
      
      // Only calculate if measurements are at least 1 month apart
      if (dateDiff >= 1) {
        const heightChange = latestMeasurement.height - oldestMeasurement.height;
        const weightChange = latestMeasurement.weight - oldestMeasurement.weight;
        
        growthTrends = {
          heightChangeTotal: heightChange,
          heightChangePerMonth: heightChange / dateDiff,
          weightChangeTotal: weightChange,
          weightChangePerMonth: weightChange / dateDiff,
          period: dateDiff
        };
      }
    }
    
    // Generate percentile data
    // Note: In a real implementation, you would use CDC or WHO growth charts
    // For this example, we'll use a simplified approach
    const growthPercentiles = this.estimatePercentiles(latestMeasurements, childData);
    
    // Generate recommendations
    const recommendations = [];
    
    // Check if measurements are recent
    if (latestMeasurements) {
      const measurementDate = new Date(latestMeasurements.date);
      const now = new Date();
      const monthsSinceMeasurement = this.getMonthsDifference(measurementDate, now);
      
      // Get child's age
      const childAge = this.calculateChildAge(childData);
      
      // Determine recommended frequency
      let recommendedFrequency = 12; // Default: annual
      
      if (childAge < 1) {
        recommendedFrequency = 2; // Every 2 months for infants
      } else if (childAge < 3) {
        recommendedFrequency = 3; // Every 3 months for toddlers
      } else if (childAge < 6) {
        recommendedFrequency = 6; // Every 6 months for preschoolers
      }
      
      if (monthsSinceMeasurement > recommendedFrequency) {
        recommendations.push({
          type: 'measurement',
          message: `Last growth measurements were ${monthsSinceMeasurement.toFixed(1)} months ago. Consider updating ${childData.name}'s height and weight.`,
          priority: 'medium'
        });
      }
    }
    
    return {
      latestMeasurements,
      growthHistory: sortedMeasurements.slice(0, 10), // Limit to most recent 10
      growthPercentiles,
      growthTrends,
      recommendations
    };
  }
  
  /**
   * Analyze emotional data for insights
   * @param {Array} emotionalData - Emotional check-ins
   * @returns {Object} Emotional analytics
   */
  analyzeEmotionalData(emotionalData) {
    // Skip if no data
    if (!emotionalData || emotionalData.length === 0) {
      return {
        recentMood: null,
        moodTrends: null,
        recommendations: []
      };
    }
    
    // Sort check-ins by date
    const sortedCheckIns = [...emotionalData].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA; // Newest first
    });
    
    // Get the most recent mood
    const recentMood = sortedCheckIns[0];
    
    // Count emotions for trend analysis
    const emotionCounts = {};
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    let recentEmotions = 0;
    
    sortedCheckIns.forEach(checkIn => {
      const emotion = checkIn.emotion || checkIn.mood;
      if (!emotion) return;
      
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      
      // Count recent emotions (past month)
      const checkInDate = new Date(checkIn.date);
      if (checkInDate >= lastMonth) {
        recentEmotions++;
      }
    });
    
    // Find predominant emotions
    const emotionEntries = Object.entries(emotionCounts);
    emotionEntries.sort((a, b) => b[1] - a[1]);
    
    const predominantEmotions = emotionEntries.slice(0, 3).map(([emotion, count]) => ({
      emotion,
      count,
      percentage: (count / sortedCheckIns.length * 100).toFixed(1)
    }));
    
    // Generate recommendations
    const recommendations = [];
    
    // Check if check-ins are regular
    const now = new Date();
    if (recentMood) {
      const lastCheckInDate = new Date(recentMood.date);
      const daysSinceLastCheckIn = Math.floor((now - lastCheckInDate) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastCheckIn > 7) {
        recommendations.push({
          type: 'emotional_checkin',
          message: `Last emotional check-in was ${daysSinceLastCheckIn} days ago. Regular check-ins help track emotional well-being.`,
          priority: 'medium'
        });
      }
    }
    
    // If negative emotions are predominant, suggest support
    const negativeEmotions = ['sad', 'angry', 'worried', 'scared', 'anxious', 'stressed', 'upset'];
    const predominantNegative = predominantEmotions.find(e => 
      negativeEmotions.includes(e.emotion.toLowerCase()) && 
      parseFloat(e.percentage) > 40
    );
    
    if (predominantNegative) {
      recommendations.push({
        type: 'emotional_support',
        message: `${predominantNegative.emotion} has been a common emotion (${predominantNegative.percentage}%). Consider discussing feelings more frequently.`,
        priority: 'high'
      });
    }
    
    return {
      recentMood,
      moodHistory: sortedCheckIns.slice(0, 10),
      predominantEmotions,
      moodTrends: {
        totalCheckIns: sortedCheckIns.length,
        recentCheckIns: recentEmotions,
        predominantEmotions
      },
      recommendations
    };
  }
  
  /**
   * Analyze academic data for insights
   * @param {Array} academicData - Academic records
   * @returns {Object} Academic analytics
   */
  analyzeAcademicData(academicData) {
    // Skip if no data
    if (!academicData || academicData.length === 0) {
      return {
        currentAssignments: [],
        completedAssignments: [],
        subjects: [],
        recommendations: []
      };
    }
    
    // Sort by date
    const sortedRecords = [...academicData].sort((a, b) => {
      const dateA = new Date(a.dueDate || a.date);
      const dateB = new Date(b.dueDate || b.date);
      return dateB - dateA; // Newest first
    });
    
    // Split into current and completed assignments
    const now = new Date();
    const currentAssignments = sortedRecords.filter(record => {
      const dueDate = new Date(record.dueDate || record.date);
      return dueDate >= now && !record.completed;
    });
    
    const completedAssignments = sortedRecords.filter(record => 
      record.completed
    );
    
    // Group by subject
    const subjectMap = {};
    
    sortedRecords.forEach(record => {
      const subject = record.subject || 'Other';
      if (!subjectMap[subject]) {
        subjectMap[subject] = {
          name: subject,
          assignments: 0,
          completed: 0,
          upcoming: 0
        };
      }
      
      subjectMap[subject].assignments++;
      
      if (record.completed) {
        subjectMap[subject].completed++;
      } else {
        const dueDate = new Date(record.dueDate || record.date);
        if (dueDate >= now) {
          subjectMap[subject].upcoming++;
        }
      }
    });
    
    const subjects = Object.values(subjectMap);
    
    // Generate recommendations
    const recommendations = [];
    
    // Check for upcoming deadlines
    const upcomingDeadlines = currentAssignments.filter(assignment => {
      const dueDate = new Date(assignment.dueDate || assignment.date);
      const daysUntilDue = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
      return daysUntilDue <= 3; // Due within 3 days
    });
    
    if (upcomingDeadlines.length > 0) {
      recommendations.push({
        type: 'upcoming_deadline',
        message: `${upcomingDeadlines.length} assignment${upcomingDeadlines.length > 1 ? 's are' : ' is'} due within the next 3 days.`,
        priority: 'high'
      });
    }
    
    return {
      currentAssignments,
      completedAssignments: completedAssignments.slice(0, 10), // Limit to most recent 10
      subjects,
      recommendations
    };
  }
  
  /**
   * Analyze activity data for insights
   * @param {Array} activityData - Activity records
   * @returns {Object} Activity analytics
   */
  analyzeActivityData(activityData) {
    // Skip if no data
    if (!activityData || activityData.length === 0) {
      return {
        upcomingActivities: [],
        activityCategories: [],
        recommendations: []
      };
    }
    
    // Sort by date
    const sortedActivities = [...activityData].sort((a, b) => {
      const dateA = new Date(a.date || a.dateTime);
      const dateB = new Date(b.date || b.dateTime);
      return dateA - dateB; // Oldest first
    });
    
    // Filter upcoming activities
    const now = new Date();
    const upcomingActivities = sortedActivities.filter(activity => {
      const activityDate = new Date(activity.date || activity.dateTime);
      return activityDate >= now;
    });
    
    // Group by category/type
    const categoryMap = {};
    
    sortedActivities.forEach(activity => {
      const category = activity.activityType || activity.type || 'Other';
      if (!categoryMap[category]) {
        categoryMap[category] = {
          name: category,
          count: 0,
          upcoming: 0
        };
      }
      
      categoryMap[category].count++;
      
      const activityDate = new Date(activity.date || activity.dateTime);
      if (activityDate >= now) {
        categoryMap[category].upcoming++;
      }
    });
    
    const activityCategories = Object.values(categoryMap);
    
    // Generate recommendations
    const recommendations = [];
    
    // Check activity balance
    if (activityCategories.length === 1) {
      recommendations.push({
        type: 'activity_variety',
        message: `All activities are in the ${activityCategories[0].name} category. Consider adding variety with different types of activities.`,
        priority: 'low'
      });
    }
    
    return {
      upcomingActivities,
      activityCategories,
      recommendations
    };
  }
  
  /**
   * Generate comprehensive insights from all child data
   * @param {Object} allData - All child data
   * @returns {Array} Generated insights
   */
  generateInsights(allData) {
    const insights = [];
    const { childData, medicalData, growthData, emotionalData, academicData, activityData } = allData;
    
    // Overall wellness insights
    if (medicalData?.length > 0 && emotionalData?.length > 0) {
      insights.push({
        title: "Comprehensive Wellness",
        category: "Overall",
        description: `You're tracking both physical and emotional health for ${childData.name}, which provides a comprehensive picture of overall well-being.`,
        actionItem: "Continue regular check-ins for both physical and emotional health."
      });
    }
    
    // Balance insights
    if (activityData?.length > 0 && academicData?.length > 0) {
      insights.push({
        title: "Academic-Activity Balance",
        category: "Balance",
        description: `You're tracking both academic progress and activities for ${childData.name}, which helps maintain a healthy balance.`,
        actionItem: "Ensure neither academics nor activities are causing stress or overwhelm."
      });
    }
    
    // Development insights
    if (growthData?.length > 0) {
      insights.push({
        title: "Growth Tracking",
        category: "Development",
        description: `Regular growth tracking helps ensure ${childData.name} is developing physically as expected.`,
        actionItem: "Consider discussing growth patterns with your healthcare provider at the next check-up."
      });
    }
    
    // Emotional insights
    if (emotionalData?.length > 0) {
      const emotionalAnalytics = this.analyzeEmotionalData(emotionalData);
      const predominantEmotion = emotionalAnalytics.predominantEmotions?.[0];
      
      if (predominantEmotion) {
        insights.push({
          title: "Emotional Patterns",
          category: "Emotional",
          description: `${childData.name}'s most common emotion is ${predominantEmotion.emotion} (${predominantEmotion.percentage}% of check-ins).`,
          actionItem: `Talk about feelings regularly to understand what triggers ${predominantEmotion.emotion} feelings.`
        });
      }
    }
    
    // Missing data insights
    const missingData = [];
    if (!medicalData || medicalData.length === 0) missingData.push("medical appointments");
    if (!growthData || growthData.length === 0) missingData.push("growth measurements");
    if (!emotionalData || emotionalData.length === 0) missingData.push("emotional check-ins");
    if (!academicData || academicData.length === 0) missingData.push("academic records");
    if (!activityData || activityData.length === 0) missingData.push("activities");
    
    if (missingData.length > 0) {
      insights.push({
        title: "Complete Your Tracking",
        category: "Recommendations",
        description: `Adding information about ${missingData.join(", ")} would provide a more complete picture of ${childData.name}'s development.`,
        actionItem: `Start tracking ${missingData[0]} to enhance your insights.`
      });
    }
    
    return insights;
  }
  
  /**
   * Calculate child's age in years
   * @param {Object} childData - Child information
   * @returns {number} Age in years
   */
  calculateChildAge(childData) {
    if (!childData.birthDate && !childData.age) {
      return 0; // Unknown age
    }
    
    if (childData.age) {
      return parseFloat(childData.age);
    }
    
    // Calculate from birth date
    const birthDate = new Date(childData.birthDate);
    const now = new Date();
    
    let age = now.getFullYear() - birthDate.getFullYear();
    const monthDiff = now.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
  
  /**
   * Calculate months between two dates
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {number} Months difference
   */
  getMonthsDifference(startDate, endDate) {
    const yearDiff = endDate.getFullYear() - startDate.getFullYear();
    const monthDiff = endDate.getMonth() - startDate.getMonth();
    
    return yearDiff * 12 + monthDiff;
  }
  
  /**
   * Estimate growth percentiles for a child
   * @param {Object} measurements - Growth measurements
   * @param {Object} childData - Child information
   * @returns {Object} Estimated percentiles
   */
  estimatePercentiles(measurements, childData) {
    // Note: In a real implementation, you would use CDC or WHO growth charts
    // This is a simplified estimation for demo purposes
    
    if (!measurements || !childData) {
      return null;
    }
    
    // Calculate child's age
    const childAge = this.calculateChildAge(childData);
    
    // Mock percentile data for demonstration
    // In a real implementation, this would use actual growth chart data
    let heightPercentile, weightPercentile;
    
    // Simplified logic for demo purposes
    if (childData.gender === 'female') {
      // Female height percentiles (very simplified)
      if (measurements.height < 90) heightPercentile = 10;
      else if (measurements.height < 100) heightPercentile = 25;
      else if (measurements.height < 110) heightPercentile = 50;
      else if (measurements.height < 120) heightPercentile = 75;
      else heightPercentile = 90;
      
      // Female weight percentiles (very simplified)
      if (measurements.weight < 15) weightPercentile = 10;
      else if (measurements.weight < 20) weightPercentile = 25;
      else if (measurements.weight < 25) weightPercentile = 50;
      else if (measurements.weight < 30) weightPercentile = 75;
      else weightPercentile = 90;
    } else {
      // Male height percentiles (very simplified)
      if (measurements.height < 95) heightPercentile = 10;
      else if (measurements.height < 105) heightPercentile = 25;
      else if (measurements.height < 115) heightPercentile = 50;
      else if (measurements.height < 125) heightPercentile = 75;
      else heightPercentile = 90;
      
      // Male weight percentiles (very simplified)
      if (measurements.weight < 17) weightPercentile = 10;
      else if (measurements.weight < 22) weightPercentile = 25;
      else if (measurements.weight < 27) weightPercentile = 50;
      else if (measurements.weight < 32) weightPercentile = 75;
      else weightPercentile = 90;
    }
    
    return {
      height: heightPercentile,
      weight: weightPercentile
    };
  }
  
  /**
   * Process natural language query about child data
   * @param {string} query - Natural language query
   * @param {string} familyId - Family ID
   * @param {string} childId - Child ID
   * @returns {Promise<Object>} Query result
   */
  async processNaturalLanguageQuery(query, familyId, childId) {
    try {
      // Load child analytics
      const childAnalytics = await this.getChildAnalytics(familyId, childId);
      
      // Analyze query intent
      const queryType = this.analyzeQueryIntent(query);
      
      let result = {
        answer: null,
        data: null,
        visualizationType: null
      };
      
      // Process query based on detected intent
      switch (queryType.intent) {
        case 'growth_trend':
          result = this.processGrowthQuery(query, childAnalytics);
          break;
        case 'medical_history':
          result = this.processMedicalQuery(query, childAnalytics);
          break;
        case 'emotional_trend':
          result = this.processEmotionalQuery(query, childAnalytics);
          break;
        case 'academic_progress':
          result = this.processAcademicQuery(query, childAnalytics);
          break;
        case 'activity_summary':
          result = this.processActivityQuery(query, childAnalytics);
          break;
        case 'recommendation':
          result = this.processRecommendationQuery(query, childAnalytics);
          break;
        default:
          // General query
          result = this.processGeneralQuery(query, childAnalytics);
      }
      
      return {
        ...result,
        queryType,
        childName: childAnalytics.basicInfo.name,
        childId
      };
    } catch (error) {
      console.error("Error processing natural language query:", error);
      return {
        answer: "I'm sorry, I couldn't process your query about the child's data.",
        error: error.message
      };
    }
  }
  
  /**
   * Analyze the intent of a natural language query
   * @param {string} query - The query to analyze
   * @returns {Object} The detected intent
   */
  analyzeQueryIntent(query) {
    const normalizedQuery = query.toLowerCase();
    
    // Define intent patterns
    const intentPatterns = {
      growth_trend: [
        /growth/i, /height/i, /weight/i, /tall/i, 
        /growing/i, /percentile/i, /measurement/i
      ],
      medical_history: [
        /medical/i, /doctor/i, /appointment/i, /checkup/i, 
        /vaccine/i, /visit/i, /pediatrician/i, /health/i
      ],
      emotional_trend: [
        /emotion/i, /feeling/i, /mood/i, /happy/i, 
        /sad/i, /emotional/i, /behavior/i, /well-being/i
      ],
      academic_progress: [
        /school/i, /grade/i, /homework/i, /academic/i, 
        /class/i, /assignment/i, /subject/i, /study/i
      ],
      activity_summary: [
        /activity/i, /sport/i, /class/i, /lesson/i, 
        /hobby/i, /schedule/i, /extracurricular/i, /program/i
      ],
      recommendation: [
        /recommend/i, /suggest/i, /should/i, /advice/i, 
        /tip/i, /idea/i, /help/i, /guide/i
      ]
    };
    
    // Score each intent based on pattern matches
    const scores = {};
    
    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      scores[intent] = 0;
      
      for (const pattern of patterns) {
        if (pattern.test(normalizedQuery)) {
          scores[intent] += 1;
        }
      }
    }
    
    // Find the highest scoring intent
    let topIntent = null;
    let topScore = 0;
    
    for (const [intent, score] of Object.entries(scores)) {
      if (score > topScore) {
        topIntent = intent;
        topScore = score;
      }
    }
    
    // Default to general query if no clear intent or low confidence
    if (!topIntent || topScore < 1) {
      topIntent = 'general';
    }
    
    return {
      intent: topIntent,
      confidence: topScore,
      query: normalizedQuery
    };
  }
  
  /**
   * Process a growth-related query
   * @param {string} query - The query
   * @param {Object} childAnalytics - Child analytics data
   * @returns {Object} Query result
   */
  processGrowthQuery(query, childAnalytics) {
    const { growthAnalytics, basicInfo } = childAnalytics;
    
    // Check if we have growth data
    if (!growthAnalytics.latestMeasurements) {
      return {
        answer: `I don't have any growth measurements for ${basicInfo.name} yet. You can add height and weight data in the child tracking section.`,
        data: null,
        visualizationType: null
      };
    }
    
    // Check query specifics
    const isAboutHeight = query.includes('height') || query.includes('tall');
    const isAboutWeight = query.includes('weight');
    const isAboutPercentile = query.includes('percentile') || query.includes('compare');
    const isAboutTrend = query.includes('trend') || query.includes('growing') || query.includes('change');
    
    let answer = '';
    let data = null;
    let visualizationType = null;
    
    // Handle percentile queries
    if (isAboutPercentile) {
      const percentiles = growthAnalytics.growthPercentiles;
      
      if (percentiles) {
        if (isAboutHeight) {
          answer = `${basicInfo.name} is currently in the ${percentiles.height}th percentile for height.`;
        } else if (isAboutWeight) {
          answer = `${basicInfo.name} is currently in the ${percentiles.weight}th percentile for weight.`;
        } else {
          answer = `${basicInfo.name} is currently in the ${percentiles.height}th percentile for height and the ${percentiles.weight}th percentile for weight.`;
        }
      } else {
        answer = `I don't have enough data to calculate percentiles for ${basicInfo.name}.`;
      }
      
      data = growthAnalytics.latestMeasurements;
      visualizationType = 'percentile';
    }
    // Handle trend queries
    else if (isAboutTrend) {
      if (growthAnalytics.growthTrends) {
        const trends = growthAnalytics.growthTrends;
        
        if (isAboutHeight) {
          answer = `Over the past ${trends.period.toFixed(1)} months, ${basicInfo.name} has grown ${trends.heightChangeTotal.toFixed(1)} cm (about ${trends.heightChangePerMonth.toFixed(1)} cm per month).`;
        } else if (isAboutWeight) {
          answer = `Over the past ${trends.period.toFixed(1)} months, ${basicInfo.name}'s weight has changed by ${trends.weightChangeTotal.toFixed(1)} kg (about ${trends.weightChangePerMonth.toFixed(1)} kg per month).`;
        } else {
          answer = `Over the past ${trends.period.toFixed(1)} months, ${basicInfo.name} has grown ${trends.heightChangeTotal.toFixed(1)} cm in height and changed by ${trends.weightChangeTotal.toFixed(1)} kg in weight.`;
        }
      } else {
        answer = `I don't have enough growth measurements to analyze trends for ${basicInfo.name}. At least two measurements are needed.`;
      }
      
      data = growthAnalytics.growthHistory;
      visualizationType = 'growth_trend';
    }
    // Handle general growth queries
    else {
      const latest = growthAnalytics.latestMeasurements;
      
      if (isAboutHeight) {
        answer = `${basicInfo.name}'s current height is ${latest.height} cm, last measured on ${new Date(latest.date).toLocaleDateString()}.`;
      } else if (isAboutWeight) {
        answer = `${basicInfo.name}'s current weight is ${latest.weight} kg, last measured on ${new Date(latest.date).toLocaleDateString()}.`;
      } else {
        answer = `${basicInfo.name}'s current measurements are: height ${latest.height} cm, weight ${latest.weight} kg, last updated on ${new Date(latest.date).toLocaleDateString()}.`;
      }
      
      data = latest;
      visualizationType = 'current_measurements';
    }
    
    return {
      answer,
      data,
      visualizationType
    };
  }
  
  /**
   * Process a medical-related query
   * @param {string} query - The query
   * @param {Object} childAnalytics - Child analytics data
   * @returns {Object} Query result
   */
  processMedicalQuery(query, childAnalytics) {
    const { medicalAnalytics, basicInfo } = childAnalytics;
    
    // Check query specifics
    const isAboutCheckup = query.includes('checkup') || query.includes('wellness') || query.includes('check-up');
    const isAboutAppointment = query.includes('appointment') || query.includes('doctor') || query.includes('visit');
    const isAboutUpcoming = query.includes('upcoming') || query.includes('scheduled') || query.includes('next');
    const isAboutPast = query.includes('past') || query.includes('previous') || query.includes('last');
    
    let answer = '';
    let data = null;
    let visualizationType = null;
    
    // Handle checkup queries
    if (isAboutCheckup) {
      if (medicalAnalytics.lastCheckup) {
        const lastCheckup = medicalAnalytics.lastCheckup;
        const lastCheckupDate = new Date(lastCheckup.date || lastCheckup.dateTime);
        
        answer = `${basicInfo.name}'s last checkup was on ${lastCheckupDate.toLocaleDateString()}.`;
        
        if (medicalAnalytics.checkupStatus === 'overdue') {
          answer += ` This is overdue based on the recommended schedule for ${basicInfo.name}'s age.`;
        } else if (medicalAnalytics.checkupStatus === 'up-to-date') {
          answer += ` This is within the recommended frequency for ${basicInfo.name}'s age.`;
        }
      } else {
        answer = `I don't have any checkup records for ${basicInfo.name}.`;
      }
      
      data = medicalAnalytics.lastCheckup;
      visualizationType = 'last_checkup';
    }
    // Handle upcoming appointment queries
    else if (isAboutUpcoming && isAboutAppointment) {
      if (medicalAnalytics.upcomingAppointments && medicalAnalytics.upcomingAppointments.length > 0) {
        const upcomingAppointment = medicalAnalytics.upcomingAppointments[0];
        const appointmentDate = new Date(upcomingAppointment.date || upcomingAppointment.dateTime);
        
        answer = `${basicInfo.name}'s next appointment is ${upcomingAppointment.title || upcomingAppointment.appointmentType || 'a medical appointment'} on ${appointmentDate.toLocaleDateString()}.`;
        
        if (upcomingAppointment.location) {
          answer += ` It will be at ${upcomingAppointment.location}.`;
        }
      } else {
        answer = `There are no upcoming medical appointments scheduled for ${basicInfo.name}.`;
      }
      
      data = medicalAnalytics.upcomingAppointments;
      visualizationType = 'upcoming_appointments';
    }
    // Handle past appointment queries
    else if (isAboutPast && isAboutAppointment) {
      if (medicalAnalytics.pastAppointments && medicalAnalytics.pastAppointments.length > 0) {
        const pastAppointment = medicalAnalytics.pastAppointments[0];
        const appointmentDate = new Date(pastAppointment.date || pastAppointment.dateTime);
        
        answer = `${basicInfo.name}'s most recent appointment was ${pastAppointment.title || pastAppointment.appointmentType || 'a medical appointment'} on ${appointmentDate.toLocaleDateString()}.`;
      } else {
        answer = `I don't have any past medical appointment records for ${basicInfo.name}.`;
      }
      
      data = medicalAnalytics.pastAppointments;
      visualizationType = 'appointment_history';
    }
    // Handle general medical queries
    else {
      answer = `${basicInfo.name}'s medical records show `;
      
      if (medicalAnalytics.pastAppointments && medicalAnalytics.pastAppointments.length > 0) {
        answer += `${medicalAnalytics.pastAppointments.length} past appointment(s)`;
        
        if (medicalAnalytics.upcomingAppointments && medicalAnalytics.upcomingAppointments.length > 0) {
          answer += ` and ${medicalAnalytics.upcomingAppointments.length} upcoming appointment(s).`;
        } else {
          answer += ` with no upcoming appointments scheduled.`;
        }
      } else if (medicalAnalytics.upcomingAppointments && medicalAnalytics.upcomingAppointments.length > 0) {
        answer = `${basicInfo.name} has ${medicalAnalytics.upcomingAppointments.length} upcoming appointment(s) but no past appointments recorded.`;
      } else {
        answer = `I don't have any medical appointment records for ${basicInfo.name}.`;
      }
      
      // Add checkup status if available
      if (medicalAnalytics.checkupStatus === 'overdue') {
        answer += ` ${basicInfo.name} appears to be overdue for a checkup.`;
      }
      
      data = {
        past: medicalAnalytics.pastAppointments,
        upcoming: medicalAnalytics.upcomingAppointments
      };
      
      visualizationType = 'medical_summary';
    }
    
    return {
      answer,
      data,
      visualizationType
    };
  }
  
  /**
   * Process an emotional-related query
   * @param {string} query - The query
   * @param {Object} childAnalytics - Child analytics data
   * @returns {Object} Query result
   */
  processEmotionalQuery(query, childAnalytics) {
    const { emotionalAnalytics, basicInfo } = childAnalytics;
    
    // Check if we have emotional data
    if (!emotionalAnalytics.recentMood) {
      return {
        answer: `I don't have any emotional check-ins recorded for ${basicInfo.name} yet. You can add them in the child tracking section.`,
        data: null,
        visualizationType: null
      };
    }
    
    // Check query specifics
    const isAboutRecent = query.includes('recent') || query.includes('latest') || query.includes('current');
    const isAboutTrend = query.includes('trend') || query.includes('pattern') || query.includes('over time');
    const isAboutSpecificEmotion = query.includes('happy') || query.includes('sad') || query.includes('angry') || query.includes('afraid');
    
    let answer = '';
    let data = null;
    let visualizationType = null;
    
    // Handle recent mood queries
    if (isAboutRecent) {
      const recentMood = emotionalAnalytics.recentMood;
      const moodDate = new Date(recentMood.date);
      
      answer = `${basicInfo.name}'s most recent mood check-in was "${recentMood.emotion || recentMood.mood}" on ${moodDate.toLocaleDateString()}.`;
      
      if (recentMood.notes) {
        answer += ` Notes: "${recentMood.notes}"`;
      }
      
      data = recentMood;
      visualizationType = 'recent_mood';
    }
    // Handle trend queries
    else if (isAboutTrend) {
      const trends = emotionalAnalytics.moodTrends;
      
      answer = `${basicInfo.name}'s most common emotions are: `;
      
      emotionalAnalytics.predominantEmotions.forEach((emotion, index) => {
        if (index > 0) answer += index === emotionalAnalytics.predominantEmotions.length - 1 ? ' and ' : ', ';
        answer += `${emotion.emotion} (${emotion.percentage}%)`;
      });
      
      answer += `. These are based on ${trends.totalCheckIns} recorded check-ins.`;
      
      data = {
        checkIns: emotionalAnalytics.moodHistory,
        predominantEmotions: emotionalAnalytics.predominantEmotions
      };
      
      visualizationType = 'mood_trend';
    }
    // Handle specific emotion queries
    else if (isAboutSpecificEmotion) {
      // Extract the emotion from the query
      let targetEmotion = '';
      if (query.includes('happy')) targetEmotion = 'happy';
      else if (query.includes('sad')) targetEmotion = 'sad';
      else if (query.includes('angry')) targetEmotion = 'angry';
      else if (query.includes('afraid')) targetEmotion = 'afraid';
      
      // Find any matching emotions
      const emotionData = emotionalAnalytics.predominantEmotions.find(e => 
        e.emotion.toLowerCase() === targetEmotion
      );
      
      if (emotionData) {
        answer = `${basicInfo.name} has been ${targetEmotion} in ${emotionData.percentage}% of mood check-ins.`;
      } else {
        answer = `${basicInfo.name} hasn't been recorded as ${targetEmotion} in any mood check-ins.`;
      }
      
      data = emotionalAnalytics.moodHistory.filter(m => 
        (m.emotion || m.mood).toLowerCase() === targetEmotion
      );
      
      visualizationType = 'specific_emotion';
    }
    // Handle general emotional queries
    else {
      const recentMood = emotionalAnalytics.recentMood;
      const moodDate = new Date(recentMood.date);
      
      answer = `${basicInfo.name}'s most recent mood was "${recentMood.emotion || recentMood.mood}" on ${moodDate.toLocaleDateString()}. `;
      
      if (emotionalAnalytics.predominantEmotions.length > 0) {
        answer += `The most common emotion overall is "${emotionalAnalytics.predominantEmotions[0].emotion}" (${emotionalAnalytics.predominantEmotions[0].percentage}% of check-ins).`;
      }
      
      data = {
        recentMood: emotionalAnalytics.recentMood,
        moodHistory: emotionalAnalytics.moodHistory,
        predominantEmotions: emotionalAnalytics.predominantEmotions
      };
      
      visualizationType = 'emotional_summary';
    }
    
    return {
      answer,
      data,
      visualizationType
    };
  }
  
  /**
   * Process an academic-related query
   * @param {string} query - The query
   * @param {Object} childAnalytics - Child analytics data
   * @returns {Object} Query result
   */
  processAcademicQuery(query, childAnalytics) {
    const { academicAnalytics, basicInfo } = childAnalytics;
    
    // Check if we have academic data
    if ((!academicAnalytics.currentAssignments || academicAnalytics.currentAssignments.length === 0) &&
        (!academicAnalytics.completedAssignments || academicAnalytics.completedAssignments.length === 0)) {
      return {
        answer: `I don't have any academic records for ${basicInfo.name} yet. You can add homework assignments and other academic information in the child tracking section.`,
        data: null,
        visualizationType: null
      };
    }
    
    // Check query specifics
    const isAboutHomework = query.includes('homework') || query.includes('assignment');
    const isAboutSubject = query.includes('subject') || query.includes('class');
    const isAboutUpcoming = query.includes('upcoming') || query.includes('due') || query.includes('pending');
    const isAboutCompleted = query.includes('completed') || query.includes('finished') || query.includes('done');
    
    let answer = '';
    let data = null;
    let visualizationType = null;
    
    // Handle current assignments queries
    if (isAboutHomework && isAboutUpcoming) {
      if (academicAnalytics.currentAssignments && academicAnalytics.currentAssignments.length > 0) {
        answer = `${basicInfo.name} has ${academicAnalytics.currentAssignments.length} pending assignment(s): `;
        
        academicAnalytics.currentAssignments.forEach((assignment, index) => {
          if (index > 0) answer += ', ';
          
          const dueDate = new Date(assignment.dueDate || assignment.date);
          answer += `"${assignment.title || assignment.name || 'Assignment'}" due on ${dueDate.toLocaleDateString()}`;
          
          if (assignment.subject) {
            answer += ` (${assignment.subject})`;
          }
        });
      } else {
        answer = `${basicInfo.name} doesn't have any pending assignments recorded.`;
      }
      
      data = academicAnalytics.currentAssignments;
      visualizationType = 'current_assignments';
    }
    // Handle completed assignments queries
    else if (isAboutHomework && isAboutCompleted) {
      if (academicAnalytics.completedAssignments && academicAnalytics.completedAssignments.length > 0) {
        answer = `${basicInfo.name} has completed ${academicAnalytics.completedAssignments.length} assignment(s). The most recent was "${academicAnalytics.completedAssignments[0].title || academicAnalytics.completedAssignments[0].name || 'Assignment'}"`;
        
        if (academicAnalytics.completedAssignments[0].subject) {
          answer += ` for ${academicAnalytics.completedAssignments[0].subject}`;
        }
        
        answer += '.';
      } else {
        answer = `${basicInfo.name} doesn't have any completed assignments recorded.`;
      }
      
      data = academicAnalytics.completedAssignments;
      visualizationType = 'completed_assignments';
    }
    // Handle subject queries
    else if (isAboutSubject) {
      if (academicAnalytics.subjects && academicAnalytics.subjects.length > 0) {
        answer = `${basicInfo.name}'s subjects include: `;
        
        academicAnalytics.subjects.forEach((subject, index) => {
          if (index > 0) answer += index === academicAnalytics.subjects.length - 1 ? ' and ' : ', ';
          
          answer += `${subject.name} (${subject.assignments} assignment(s), ${subject.completed} completed)`;
        });
      } else {
        answer = `I don't have subject information for ${basicInfo.name}'s academic records.`;
      }
      
      data = academicAnalytics.subjects;
      visualizationType = 'subjects';
    }
    // Handle general academic queries
    else {
      answer = `${basicInfo.name}'s academic records show `;
      
      if (academicAnalytics.currentAssignments && academicAnalytics.currentAssignments.length > 0) {
        answer += `${academicAnalytics.currentAssignments.length} pending assignment(s)`;
        
        if (academicAnalytics.completedAssignments && academicAnalytics.completedAssignments.length > 0) {
          answer += ` and ${academicAnalytics.completedAssignments.length} completed assignment(s).`;
        } else {
          answer += ` with no completed assignments recorded.`;
        }
      } else if (academicAnalytics.completedAssignments && academicAnalytics.completedAssignments.length > 0) {
        answer = `${basicInfo.name} has ${academicAnalytics.completedAssignments.length} completed assignment(s) but no pending assignments.`;
      } else {
        answer = `I don't have any academic assignment records for ${basicInfo.name}.`;
      }
      
      if (academicAnalytics.subjects && academicAnalytics.subjects.length > 0) {
        answer += ` Assignments span ${academicAnalytics.subjects.length} subject(s).`;
      }
      
      data = {
        current: academicAnalytics.currentAssignments,
        completed: academicAnalytics.completedAssignments,
        subjects: academicAnalytics.subjects
      };
      
      visualizationType = 'academic_summary';
    }
    
    return {
      answer,
      data,
      visualizationType
    };
  }
  
  /**
   * Process an activity-related query
   * @param {string} query - The query
   * @param {Object} childAnalytics - Child analytics data
   * @returns {Object} Query result
   */
  processActivityQuery(query, childAnalytics) {
    const { activityAnalytics, basicInfo } = childAnalytics;
    
    // Check if we have activity data
    if ((!activityAnalytics.upcomingActivities || activityAnalytics.upcomingActivities.length === 0) &&
        (!activityAnalytics.activityCategories || activityAnalytics.activityCategories.length === 0)) {
      return {
        answer: `I don't have any activity records for ${basicInfo.name} yet. You can add activities in the child tracking section.`,
        data: null,
        visualizationType: null
      };
    }
    
    // Check query specifics
    const isAboutUpcoming = query.includes('upcoming') || query.includes('scheduled') || query.includes('next');
    const isAboutType = query.includes('type') || query.includes('category') || query.includes('kinds');
    
    let answer = '';
    let data = null;
    let visualizationType = null;
    
    // Handle upcoming activities queries
    if (isAboutUpcoming) {
      if (activityAnalytics.upcomingActivities && activityAnalytics.upcomingActivities.length > 0) {
        answer = `${basicInfo.name} has ${activityAnalytics.upcomingActivities.length} upcoming activities: `;
        
        activityAnalytics.upcomingActivities.slice(0, 3).forEach((activity, index) => {
          if (index > 0) answer += ', ';
          
          const activityDate = new Date(activity.date || activity.dateTime);
          answer += `"${activity.title || activity.activityName || activity.type || 'Activity'}" on ${activityDate.toLocaleDateString()}`;
        });
        
        if (activityAnalytics.upcomingActivities.length > 3) {
          answer += `, and ${activityAnalytics.upcomingActivities.length - 3} more.`;
        } else {
          answer += '.';
        }
      } else {
        answer = `${basicInfo.name} doesn't have any upcoming activities recorded.`;
      }
      
      data = activityAnalytics.upcomingActivities;
      visualizationType = 'upcoming_activities';
    }
    // Handle activity type queries
    else if (isAboutType) {
      if (activityAnalytics.activityCategories && activityAnalytics.activityCategories.length > 0) {
        answer = `${basicInfo.name} participates in these types of activities: `;
        
        activityAnalytics.activityCategories.forEach((category, index) => {
          if (index > 0) answer += index === activityAnalytics.activityCategories.length - 1 ? ' and ' : ', ';
          
          answer += `${category.name} (${category.count} total)`;
        });
      } else {
        answer = `I don't have activity category information for ${basicInfo.name}.`;
      }
      
      data = activityAnalytics.activityCategories;
      visualizationType = 'activity_categories';
    }
    // Handle general activity queries
    else {
      const totalActivities = activityAnalytics.activityCategories.reduce((sum, category) => sum + category.count, 0);
      
      answer = `${basicInfo.name} has ${totalActivities} recorded activities across ${activityAnalytics.activityCategories.length} categories. `;
      
      if (activityAnalytics.upcomingActivities && activityAnalytics.upcomingActivities.length > 0) {
        answer += `There are ${activityAnalytics.upcomingActivities.length} upcoming activities in the schedule.`;
      } else {
        answer += `There are no upcoming activities currently scheduled.`;
      }
      
      data = {
        categories: activityAnalytics.activityCategories,
        upcoming: activityAnalytics.upcomingActivities
      };
      
      visualizationType = 'activity_summary';
    }
    
    return {
      answer,
      data,
      visualizationType
    };
  }
  
  /**
   * Process a recommendation query
   * @param {string} query - The query
   * @param {Object} childAnalytics - Child analytics data
   * @returns {Object} Query result
   */
  processRecommendationQuery(query, childAnalytics) {
    const { basicInfo } = childAnalytics;
    
    // Collect all recommendations from different categories
    const allRecommendations = [
      ...(childAnalytics.medicalAnalytics.recommendations || []),
      ...(childAnalytics.growthAnalytics.recommendations || []),
      ...(childAnalytics.emotionalAnalytics.recommendations || []),
      ...(childAnalytics.academicAnalytics.recommendations || []),
      ...(childAnalytics.activityAnalytics.recommendations || [])
    ];
    
    if (allRecommendations.length === 0) {
      return {
        answer: `I don't have any specific recommendations for ${basicInfo.name} at this time. Consider adding more tracking data for more tailored suggestions.`,
        data: null,
        visualizationType: null
      };
    }
    
    // Check query specifics
    const isAboutMedical = query.includes('medical') || query.includes('health') || query.includes('doctor');
    const isAboutGrowth = query.includes('growth') || query.includes('height') || query.includes('weight');
    const isAboutEmotional = query.includes('emotion') || query.includes('feeling') || query.includes('mood');
    const isAboutAcademic = query.includes('school') || query.includes('homework') || query.includes('academic');
    const isAboutActivity = query.includes('activity') || query.includes('extracurricular');
    
    let relevantRecommendations = [];
    let visualizationType = null;
    
    // Filter recommendations based on query
    if (isAboutMedical) {
      relevantRecommendations = allRecommendations.filter(rec => 
        rec.type === 'checkup' || rec.type === 'schedule' || rec.type === 'medical'
      );
      visualizationType = 'medical_recommendations';
    } else if (isAboutGrowth) {
      relevantRecommendations = allRecommendations.filter(rec => 
        rec.type === 'measurement' || rec.type.includes('growth')
      );
      visualizationType = 'growth_recommendations';
    } else if (isAboutEmotional) {
      relevantRecommendations = allRecommendations.filter(rec => 
        rec.type.includes('emotional') || rec.type === 'emotional_checkin' || rec.type === 'emotional_support'
      );
      visualizationType = 'emotional_recommendations';
    } else if (isAboutAcademic) {
      relevantRecommendations = allRecommendations.filter(rec => 
        rec.type.includes('academic') || rec.type === 'homework' || rec.type === 'upcoming_deadline'
      );
      visualizationType = 'academic_recommendations';
    } else if (isAboutActivity) {
      relevantRecommendations = allRecommendations.filter(rec => 
        rec.type.includes('activity')
      );
      visualizationType = 'activity_recommendations';
    } else {
      // Sort by priority for general recommendations
      relevantRecommendations = [...allRecommendations].sort((a, b) => {
        const priorityMap = { high: 3, medium: 2, low: 1 };
        return priorityMap[b.priority] - priorityMap[a.priority];
      });
      visualizationType = 'all_recommendations';
    }
    
    // If no matching recommendations, return all
    if (relevantRecommendations.length === 0) {
      relevantRecommendations = allRecommendations;
    }
    
    // Format the answer
    let answer = `Here are my recommendations for ${basicInfo.name}: `;
    
    relevantRecommendations.forEach((rec, index) => {
      if (index > 0) answer += ' ';
      answer += `${index + 1}. ${rec.message}`;
    });
    
    return {
      answer,
      data: relevantRecommendations,
      visualizationType
    };
  }
  
  /**
   * Process a general query about the child
   * @param {string} query - The query
   * @param {Object} childAnalytics - Child analytics data
   * @returns {Object} Query result
   */
  processGeneralQuery(query, childAnalytics) {
    const { basicInfo, medicalAnalytics, growthAnalytics, emotionalAnalytics, academicAnalytics, activityAnalytics, insights } = childAnalytics;
    
    // Check if query is about the child in general
    const isAboutTracking = query.includes('tracking') || query.includes('record') || query.includes('monitor');
    const isAboutInsights = query.includes('insight') || query.includes('analysis') || query.includes('overview');
    
    let answer = '';
    let data = null;
    let visualizationType = null;
    
    // Handle tracking queries
    if (isAboutTracking) {
      answer = `For ${basicInfo.name}, you're currently tracking: `;
      
      const trackingAreas = [];
      if (medicalAnalytics.pastAppointments?.length > 0 || medicalAnalytics.upcomingAppointments?.length > 0) {
        trackingAreas.push(`medical appointments (${(medicalAnalytics.pastAppointments?.length || 0) + (medicalAnalytics.upcomingAppointments?.length || 0)} records)`);
      }
      
      if (growthAnalytics.growthHistory?.length > 0) {
        trackingAreas.push(`growth measurements (${growthAnalytics.growthHistory?.length || 0} records)`);
      }
      
      if (emotionalAnalytics.moodHistory?.length > 0) {
        trackingAreas.push(`emotional wellbeing (${emotionalAnalytics.moodHistory?.length || 0} check-ins)`);
      }
      
      if (academicAnalytics.currentAssignments?.length > 0 || academicAnalytics.completedAssignments?.length > 0) {
        trackingAreas.push(`academic progress (${(academicAnalytics.currentAssignments?.length || 0) + (academicAnalytics.completedAssignments?.length || 0)} assignments)`);
      }
      
      if (activityAnalytics.upcomingActivities?.length > 0) {
        trackingAreas.push(`activities (${activityAnalytics.upcomingActivities?.length || 0} upcoming)`);
      }
      
      if (trackingAreas.length === 0) {
        answer = `You're not tracking any data for ${basicInfo.name} yet. You can add information in the Children tracking section.`;
      } else {
        answer += trackingAreas.join(', ') + '.';
      }
      
      data = {
        trackingAreas,
        basicInfo
      };
      
      visualizationType = 'tracking_summary';
    }
    // Handle insights queries
    else if (isAboutInsights) {
      if (insights && insights.length > 0) {
        answer = `Here are some insights about ${basicInfo.name}: `;
        
        insights.slice(0, 2).forEach((insight, index) => {
          answer += `\n${index + 1}. ${insight.description} ${insight.actionItem}`;
        });
      } else {
        answer = `I don't have enough data to generate meaningful insights for ${basicInfo.name} yet. Add more tracking information to get personalized insights.`;
      }
      
      data = insights;
      visualizationType = 'insights';
    }
    // Default to a summary about the child
    else {
      const age = this.calculateChildAge(basicInfo);
      
      answer = `${basicInfo.name} is a ${age}-year-old ${basicInfo.gender || 'child'}. `;
      
      // Add tracking summary
      const trackingCount = [
        medicalAnalytics.pastAppointments?.length > 0 || medicalAnalytics.upcomingAppointments?.length > 0,
        growthAnalytics.growthHistory?.length > 0,
        emotionalAnalytics.moodHistory?.length > 0,
        academicAnalytics.currentAssignments?.length > 0 || academicAnalytics.completedAssignments?.length > 0,
        activityAnalytics.upcomingActivities?.length > 0
      ].filter(Boolean).length;
      
      if (trackingCount === 0) {
        answer += `No tracking data has been added yet.`;
      } else if (trackingCount === 5) {
        answer += `You're tracking all aspects of ${basicInfo.name}'s development.`;
      } else {
        answer += `You're tracking ${trackingCount} out of 5 development areas.`;
      }
      
      data = {
        basicInfo,
        trackingCount,
        totalAreas: 5,
        insights: insights?.slice(0, 3) || []
      };
      
      visualizationType = 'child_summary';
    }
    
    return {
      answer,
      data,
      visualizationType
    };
  }
  
  /**
   * Generate chart explanation based on visualization
   * @param {Object} visualizationData - Data used for visualization
   * @param {string} visualizationType - Type of visualization
   * @param {Object} childInfo - Basic child information
   * @returns {string} Chart explanation
   */
  generateChartExplanation(visualizationData, visualizationType, childInfo) {
    if (!visualizationData || !visualizationType) {
      return null;
    }
    
    let explanation = '';
    
    switch (visualizationType) {
      case 'growth_trend':
        explanation = `This chart shows ${childInfo.name}'s growth over time. `;
        
        if (visualizationData.length >= 2) {
          const oldest = visualizationData[visualizationData.length - 1];
          const newest = visualizationData[0];
          
          const heightChange = newest.height - oldest.height;
          const weightChange = newest.weight - oldest.weight;
          
          explanation += `Since ${new Date(oldest.date).toLocaleDateString()}, `;
          
          if (heightChange > 0) {
            explanation += `height has increased by ${heightChange.toFixed(1)} cm `;
          } else if (heightChange < 0) {
            explanation += `height has decreased by ${Math.abs(heightChange).toFixed(1)} cm `;
          } else {
            explanation += `height has remained stable `;
          }
          
          explanation += `and `;
          
          if (weightChange > 0) {
            explanation += `weight has increased by ${weightChange.toFixed(1)} kg.`;
          } else if (weightChange < 0) {
            explanation += `weight has decreased by ${Math.abs(weightChange).toFixed(1)} kg.`;
          } else {
            explanation += `weight has remained stable.`;
          }
        }
        
        break;
      
      case 'percentile':
        explanation = `This chart shows ${childInfo.name}'s current measurements compared to CDC growth charts for ${childInfo.gender || 'children'} of the same age. `;
        
        if (visualizationData.heightPercentile) {
          explanation += `Height is at the ${visualizationData.heightPercentile}th percentile. `;
        }
        
        if (visualizationData.weightPercentile) {
          explanation += `Weight is at the ${visualizationData.weightPercentile}th percentile. `;
        }
        
        explanation += `Percentiles between 5th and 95th are considered in the normal range.`;
        
        break;
      
      case 'mood_trend':
        explanation = `This chart shows the distribution of ${childInfo.name}'s emotions across ${visualizationData.checkIns?.length || 0} recorded check-ins. `;
        
        if (visualizationData.predominantEmotions?.length > 0) {
          explanation += `The most common emotion is "${visualizationData.predominantEmotions[0].emotion}" at ${visualizationData.predominantEmotions[0].percentage}%. `;
          
          if (visualizationData.predominantEmotions.length > 1) {
            explanation += `This is followed by "${visualizationData.predominantEmotions[1].emotion}" at ${visualizationData.predominantEmotions[1].percentage}%.`;
          }
        }
        
        break;
      
      case 'subjects':
        explanation = `This chart shows ${childInfo.name}'s academic subjects and assignment completion rates. `;
        
        const completedSubjects = visualizationData.filter(s => s.completed > 0).length;
        const totalSubjects = visualizationData.length;
        
        if (completedSubjects > 0) {
          explanation += `${childInfo.name} has completed assignments in ${completedSubjects} out of ${totalSubjects} subjects.`;
        } else {
          explanation += `No completed assignments have been recorded yet.`;
        }
        
        break;
      
      case 'activity_categories':
        explanation = `This chart shows the distribution of ${childInfo.name}'s activities by type. `;
        
        if (visualizationData.length > 0) {
          const totalActivities = visualizationData.reduce((sum, cat) => sum + cat.count, 0);
          const mainCategory = visualizationData.sort((a, b) => b.count - a.count)[0];
          
          explanation += `Out of ${totalActivities} total activities, the most common category is "${mainCategory.name}" with ${mainCategory.count} activities (${Math.round(mainCategory.count / totalActivities * 100)}% of the total).`;
        }
        
        break;
      
      case 'child_summary':
        explanation = `This dashboard shows a summary of ${childInfo.name}'s tracking data across different development areas. `;
        explanation += `You're currently tracking ${visualizationData.trackingCount} out of ${visualizationData.totalAreas} areas of development.`;
        
        break;
      
      default:
        explanation = `This visualization shows data about ${childInfo.name}'s development and activities.`;
    }
    
    return explanation;
  }
}

export default new ChildAnalyticsService();
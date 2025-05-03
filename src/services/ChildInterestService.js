// src/services/ChildInterestService.js
import { db } from './firebase';
import { 
  doc, 
  collection, 
  getDoc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp, 
  arrayUnion, 
  arrayRemove 
} from 'firebase/firestore';

/**
 * Service for managing child interests and gift preferences
 * Uses an ELO-like algorithm to rank interests based on pairwise comparisons
 */
class ChildInterestService {
  
  // Base starting ELO rating for new interests
  BASE_ELO = 1200;
  
  // K-factor determines how quickly ratings change (higher = faster changes)
  // Kids preferences can change rapidly, so we use a relatively high K factor initially
  // and then decrease it over time to stabilize preferences
  getKFactor(comparisons) {
    if (comparisons < 15) return 64;     // Fast learning for first 15 comparisons
    if (comparisons < 30) return 32;     // Medium learning for next 15 comparisons
    return 16;                           // Slower learning after 30 comparisons
  }
  
  // Exploration rate for multi-armed bandit (probability of exploring uncertain items)
  EPSILON = 0.2;
  
  // Age-appropriate interest categories
  AGE_CATEGORIES = {
    toddler: { min: 0, max: 3 },
    preschool: { min: 3, max: 5 },
    earlyElementary: { min: 6, max: 8 },
    lateElementary: { min: 9, max: 11 },
    preteen: { min: 12, max: 13 },
    teen: { min: 14, max: 18 }
  };
  
  /**
   * Get all interests for a child
   * @param {string} familyId - The family ID
   * @param {string} childId - The child ID
   * @returns {Promise<Array>} - Array of interest objects with ratings
   */
  async getChildInterests(familyId, childId) {
    try {
      const docRef = doc(db, "families", familyId, "childInterests", childId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return data.interests || [];
      }
      
      // If no document exists yet, return empty array
      return [];
    } catch (error) {
      console.error("Error getting child interests:", error);
      throw error;
    }
  }
  
  /**
   * Get classified interests for a child (separated by rating tiers)
   * @param {string} familyId - The family ID
   * @param {string} childId - The child ID
   * @returns {Promise<Object>} - Object with categorized interests
   */
  async getClassifiedInterests(familyId, childId) {
    try {
      const interests = await this.getChildInterests(familyId, childId);
      
      // Sort interests by rating (highest first)
      const sortedInterests = [...interests].sort((a, b) => b.rating - a.rating);
      
      // Classify interests into three tiers
      const result = {
        loves: [], // Top tier (highest ratings)
        likes: [], // Middle tier
        passes: [], // Bottom tier (lowest ratings)
        uncategorized: [] // Not enough data yet
      };
      
      // If we have less than 3 interests or none have been compared yet, 
      // put everything in uncategorized
      if (interests.length < 3 || !interests.some(i => i.comparisons > 0)) {
        result.uncategorized = sortedInterests;
        return result;
      }
      
      // Otherwise divide into tiers - top 25%, middle 50%, bottom 25%
      const topCount = Math.max(1, Math.ceil(sortedInterests.length * 0.25));
      const bottomCount = Math.max(1, Math.ceil(sortedInterests.length * 0.25));
      const middleCount = sortedInterests.length - topCount - bottomCount;
      
      result.loves = sortedInterests.slice(0, topCount);
      result.likes = sortedInterests.slice(topCount, topCount + middleCount);
      result.passes = sortedInterests.slice(topCount + middleCount);
      
      return result;
    } catch (error) {
      console.error("Error classifying interests:", error);
      throw error;
    }
  }
  
  /**
   * Add a new interest for a child
   * @param {string} familyId - The family ID
   * @param {string} childId - The child ID
   * @param {Object} interest - The interest to add (name, category, details, etc.)
   * @returns {Promise<string>} - The ID of the newly added interest
   */
  async addInterest(familyId, childId, interest) {
    try {
      const docRef = doc(db, "families", familyId, "childInterests", childId);
      const docSnap = await getDoc(docRef);
      
      // Generate a unique ID for the interest
      const interestId = `interest_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Get age-appropriate initial rating (slight boost for age-appropriate interests)
      let initialRating = this.BASE_ELO;
      if (interest.ageAppropriate) {
        initialRating += 25; // Small boost for age-appropriate interests
      }
      
      // Format the interest object with initial ELO rating and high uncertainty
      // Use ISO string instead of serverTimestamp for array elements
      const newInterest = {
        id: interestId,
        name: interest.name,
        category: interest.category || 'general',
        subcategory: interest.subcategory || null,
        details: interest.details || '',
        dateAdded: new Date().toISOString(), // Use ISO string instead of serverTimestamp
        rating: initialRating,
        comparisons: 0,
        uncertainty: 350, // High initial uncertainty (Glicko-inspired)
        parentNotes: interest.parentNotes || '',
        source: interest.source || 'manual', // manual, survey, suggestion
        // Add specific details field for certain categories
        specifics: interest.specifics || {},
        // Store history of all comparison results
        history: []
      };
      
      if (docSnap.exists()) {
        // Document exists, update the interests array
        await updateDoc(docRef, {
          interests: arrayUnion(newInterest),
          lastUpdated: serverTimestamp()
        });
      } else {
        // Document doesn't exist, create it
        await setDoc(docRef, {
          childId,
          interests: [newInterest],
          lastUpdated: serverTimestamp(),
          lastSurveyDate: null
        });
      }
      
      return interestId;
    } catch (error) {
      console.error("Error adding child interest:", error);
      throw error;
    }
  }
  
  /**
   * Record a comparison between two interests (winner and loser)
   * and update their ELO ratings with dynamic K-factor and confidence tracking
   * @param {string} familyId - The family ID
   * @param {string} childId - The child ID
   * @param {string} winningInterestId - The ID of the winning interest
   * @param {string} losingInterestId - The ID of the losing interest
   * @returns {Promise<Object>} - Updated ratings for both interests
   */
  async recordComparison(familyId, childId, winningInterestId, losingInterestId) {
    try {
      const docRef = doc(db, "families", familyId, "childInterests", childId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error(`No interests found for child ${childId}`);
      }
      
      const data = docSnap.data();
      const interests = data.interests || [];
      
      // Find the winner and loser in the interests array
      const winnerIndex = interests.findIndex(i => i.id === winningInterestId);
      const loserIndex = interests.findIndex(i => i.id === losingInterestId);
      
      if (winnerIndex === -1 || loserIndex === -1) {
        throw new Error("One or both interests not found");
      }
      
      const winner = interests[winnerIndex];
      const loser = interests[loserIndex];
      
      // Get dynamic K-factor based on number of comparisons
      const winnerComparisons = (winner.comparisons || 0);
      const loserComparisons = (loser.comparisons || 0);
      const winnerKFactor = this.getKFactor(winnerComparisons);
      const loserKFactor = this.getKFactor(loserComparisons);
      
      // Calculate expected scores based on current ratings
      const expectedWinner = 1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400));
      const expectedLoser = 1 / (1 + Math.pow(10, (winner.rating - loser.rating) / 400));
      
      // Calculate new ratings
      const newWinnerRating = Math.round(winner.rating + winnerKFactor * (1 - expectedWinner));
      const newLoserRating = Math.round(loser.rating + loserKFactor * (0 - expectedLoser));
      
      // Update confidence metrics (uncertainty decreases with more comparisons)
      // Using a Bayesian-inspired approach - standard deviation decreases with sqrt of comparisons
      const winnerUncertainty = Math.round(350 / Math.sqrt(winnerComparisons + 1));
      const loserUncertainty = Math.round(350 / Math.sqrt(loserComparisons + 1));
      
      // Create record of this comparison
      const comparisonRecord = {
        date: new Date().toISOString(),
        winnerId: winningInterestId,
        loserId: losingInterestId,
        winnerOldRating: winner.rating,
        loserOldRating: loser.rating,
        winnerNewRating: newWinnerRating,
        loserNewRating: newLoserRating,
        kFactorUsed: { winner: winnerKFactor, loser: loserKFactor }
      };
      
      // Update interests with new ratings, uncertainties, and add comparison record
      interests[winnerIndex] = {
        ...winner,
        rating: newWinnerRating,
        comparisons: winnerComparisons + 1,
        history: [...(winner.history || []), comparisonRecord],
        uncertainty: winnerUncertainty,
        lastCompared: new Date().toISOString()
      };
      
      interests[loserIndex] = {
        ...loser,
        rating: newLoserRating,
        comparisons: loserComparisons + 1,
        history: [...(loser.history || []), comparisonRecord],
        uncertainty: loserUncertainty,
        lastCompared: new Date().toISOString()
      };
      
      // Update the document
      await updateDoc(docRef, {
        interests,
        lastUpdated: serverTimestamp()
      });
      
      // Return the updated ratings
      return {
        winner: {
          id: winningInterestId,
          oldRating: winner.rating,
          newRating: newWinnerRating,
          uncertainty: winnerUncertainty
        },
        loser: {
          id: losingInterestId,
          oldRating: loser.rating,
          newRating: newLoserRating,
          uncertainty: loserUncertainty
        }
      };
    } catch (error) {
      console.error("Error recording comparison:", error);
      throw error;
    }
  }
  
  /**
   * Update an existing interest with new information
   * @param {string} familyId - The family ID
   * @param {string} childId - The child ID
   * @param {string} interestId - The ID of the interest to update
   * @param {Object} updates - The fields to update
   * @returns {Promise<void>}
   */
  async updateInterest(familyId, childId, interestId, updates) {
    try {
      const docRef = doc(db, "families", familyId, "childInterests", childId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error(`No interests found for child ${childId}`);
      }
      
      const data = docSnap.data();
      const interests = data.interests || [];
      
      // Find the interest to update
      const index = interests.findIndex(i => i.id === interestId);
      
      if (index === -1) {
        throw new Error(`Interest with ID ${interestId} not found`);
      }
      
      // Create updated interest object (don't modify rating or history)
      const updatedInterest = {
        ...interests[index],
        ...updates,
        // Preserve these fields
        id: interestId,
        rating: interests[index].rating,
        comparisons: interests[index].comparisons,
        history: interests[index].history
      };
      
      // Replace the interest in the array
      interests[index] = updatedInterest;
      
      // Update the document
      await updateDoc(docRef, {
        interests,
        lastUpdated: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating interest:", error);
      throw error;
    }
  }
  
  /**
   * Remove an interest from a child's list
   * @param {string} familyId - The family ID
   * @param {string} childId - The child ID
   * @param {string} interestId - The ID of the interest to remove
   * @returns {Promise<void>}
   */
  async removeInterest(familyId, childId, interestId) {
    try {
      const docRef = doc(db, "families", familyId, "childInterests", childId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error(`No interests found for child ${childId}`);
      }
      
      const data = docSnap.data();
      const interests = data.interests || [];
      
      // Find the interest to remove
      const interestToRemove = interests.find(i => i.id === interestId);
      
      if (!interestToRemove) {
        throw new Error(`Interest with ID ${interestId} not found`);
      }
      
      // Remove the interest from the array
      const updatedInterests = interests.filter(i => i.id !== interestId);
      
      // Update the document
      await updateDoc(docRef, {
        interests: updatedInterests,
        lastUpdated: serverTimestamp()
      });
    } catch (error) {
      console.error("Error removing interest:", error);
      throw error;
    }
  }
  
  /**
   * Record that a gift based on an interest was received
   * @param {string} familyId - The family ID
   * @param {string} childId - The child ID
   * @param {string} interestId - The interest ID
   * @param {Object} giftDetails - Details about the gift
   * @returns {Promise<void>}
   */
  async recordGiftReceived(familyId, childId, interestId, giftDetails) {
    try {
      const docRef = doc(db, "families", familyId, "childInterests", childId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error(`No interests found for child ${childId}`);
      }
      
      const data = docSnap.data();
      const interests = data.interests || [];
      
      // Find the interest
      const index = interests.findIndex(i => i.id === interestId);
      
      if (index === -1) {
        throw new Error(`Interest with ID ${interestId} not found`);
      }
      
      // Create gift record
      const gift = {
        id: `gift_${Date.now()}`,
        interestId,
        name: giftDetails.name,
        date: giftDetails.date || new Date().toISOString(),
        giver: giftDetails.giver || null,
        occasion: giftDetails.occasion || null,
        rating: giftDetails.rating || null, // How much the child liked it
        notes: giftDetails.notes || null
      };
      
      // Add gift record to the interest
      const interest = interests[index];
      
      // Initialize gifts array if it doesn't exist
      const gifts = interest.gifts || [];
      gifts.push(gift);
      
      // Update the interest
      interests[index] = {
        ...interest,
        gifts
      };
      
      // Update the document
      await updateDoc(docRef, {
        interests,
        lastUpdated: serverTimestamp()
      });
      
      return gift.id;
    } catch (error) {
      console.error("Error recording gift:", error);
      throw error;
    }
  }
  
  /**
   * Get age-appropriate interests suggestions based on child's age
   * @param {number} age - The child's age
   * @param {string[]} existingInterests - Names of interests the child already has
   * @param {Object} params - Additional parameters for filtering suggestions
   * @returns {Promise<Array>} - Array of suggested interests
   */
  async getSuggestedInterests(age, existingInterests = [], params = {}) {
    try {
      // Determine which age category the child falls into
      let ageCategory = null;
      for (const [category, range] of Object.entries(this.AGE_CATEGORIES)) {
        if (age >= range.min && age <= range.max) {
          ageCategory = category;
          break;
        }
      }
      
      if (!ageCategory) {
        ageCategory = age <= this.AGE_CATEGORIES.toddler.max ? 'toddler' : 'teen';
      }
      
      // Query the interest suggestions collection
      const suggestionsRef = collection(db, "interestSuggestions");
      
      // Build the query based on parameters
      let q = query(suggestionsRef, where("ageCategories", "array-contains", ageCategory));
      
      if (params.category) {
        q = query(q, where("category", "==", params.category));
      }
      
      const querySnapshot = await getDocs(q);
      
      // Process the suggestions
      const suggestions = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Skip suggestions that match existing interests
        if (existingInterests.some(ei => 
          ei.toLowerCase() === data.name.toLowerCase() ||
          ei.toLowerCase().includes(data.name.toLowerCase()) ||
          data.name.toLowerCase().includes(ei.toLowerCase())
        )) {
          return;
        }
        
        suggestions.push({
          id: doc.id,
          name: data.name,
          category: data.category,
          subcategory: data.subcategory || null,
          ageCategories: data.ageCategories || [],
          popularity: data.popularity || 0,
          description: data.description || null,
          specifics: data.specifics || {}
        });
      });
      
      // Sort by popularity (if available) or alphabetically
      suggestions.sort((a, b) => {
        if (a.popularity !== b.popularity) {
          return b.popularity - a.popularity;
        }
        return a.name.localeCompare(b.name);
      });
      
      return suggestions;
    } catch (error) {
      console.error("Error getting suggested interests:", error);
      throw error;
    }
  }
  
  /**
   * Generate interest pairs for an ELO-based survey using multi-armed bandit approach
   * @param {string} familyId - The family ID
   * @param {string} childId - The child ID
   * @param {number} pairCount - Number of pairs to generate
   * @returns {Promise<Array>} - Array of interest pairs for comparison
   */
  async generateSurveyPairs(familyId, childId, pairCount = 10) {
    try {
      const interests = await this.getChildInterests(familyId, childId);
      
      // If we don't have enough interests for comparison, return empty array
      if (interests.length < 2) {
        return [];
      }
      
      // Generate all possible pairs (avoid redundancy)
      const allPairs = [];
      for (let i = 0; i < interests.length; i++) {
        for (let j = i + 1; j < interests.length; j++) {
          // Diversity safeguard: avoid pairs from same micro-category if possible
          // Only add if we have no other choice or they're from different categories
          if (interests.length < 5 || 
              interests[i].category !== interests[j].category || 
              interests[i].subcategory !== interests[j].subcategory) {
            allPairs.push([interests[i], interests[j]]);
          }
        }
      }
      
      // If we don't have enough diverse pairs, fallback to any pairs
      if (allPairs.length < pairCount) {
        allPairs.length = 0;
        for (let i = 0; i < interests.length; i++) {
          for (let j = i + 1; j < interests.length; j++) {
            allPairs.push([interests[i], interests[j]]);
          }
        }
      }
      
      // If we have fewer pairs than requested, return all pairs
      if (allPairs.length <= pairCount) {
        return this.shuffleArray(allPairs);
      }
      
      // Calculate metrics for each pair
      const scoredPairs = allPairs.map(pair => {
        const [a, b] = pair;
        
        // Get comparison counts and uncertainties
        const aComparisons = a.comparisons || 0;
        const bComparisons = b.comparisons || 0;
        const aUncertainty = a.uncertainty || 350 / Math.sqrt(aComparisons + 1);
        const bUncertainty = b.uncertainty || 350 / Math.sqrt(bComparisons + 1);
        
        // Combined uncertainty (prioritize pairs with high uncertainty)
        const uncertaintyScore = aUncertainty + bUncertainty;
        
        // Rating similarity (prioritize pairs with similar ratings)
        const ratingDifference = Math.abs(a.rating - b.rating);
        const similarityScore = 1000 - ratingDifference;
        
        // Last comparison recency (prioritize pairs not recently compared)
        const aLastCompared = a.lastCompared ? new Date(a.lastCompared).getTime() : 0;
        const bLastCompared = b.lastCompared ? new Date(b.lastCompared).getTime() : 0;
        const mostRecentComparison = Math.max(aLastCompared, bLastCompared);
        const recencyScore = mostRecentComparison === 0 ? 1000 : 1000 - Math.min(1000, (Date.now() - mostRecentComparison) / 86400000); // Days since last comparison
        
        // Category diversity (prioritize different category pairs)
        const categoryDiversityScore = a.category !== b.category ? 300 : 0;
        
        // Calculate exploration and exploitation scores
        const explorationScore = uncertaintyScore;
        const exploitationScore = similarityScore + recencyScore + categoryDiversityScore;
        
        return {
          pair,
          explorationScore,
          exploitationScore
        };
      });
      
      // Select pairs using multi-armed bandit approach (epsilon-greedy)
      const selectedPairs = [];
      const usedCategories = new Set();
      let lastCategory = null;
      
      while (selectedPairs.length < pairCount && scoredPairs.length > 0) {
        let selectedIndex;
        
        // With probability EPSILON, explore (choose uncertain pair)
        if (Math.random() < this.EPSILON) {
          // Sort by exploration score and pick top
          scoredPairs.sort((a, b) => b.explorationScore - a.explorationScore);
          selectedIndex = 0;
        } else {
          // Otherwise exploit (choose optimal pair)
          scoredPairs.sort((a, b) => b.exploitationScore - a.exploitationScore);
          selectedIndex = 0;
        }
        
        // Get selected pair
        const selected = scoredPairs[selectedIndex];
        const [interestA, interestB] = selected.pair;
        
        // Diversity safeguard (avoid consecutive questions from same category)
        const categoryA = interestA.category;
        const categoryB = interestB.category;
        
        // If we've used the last category and both interests are in that category,
        // look for an alternative if available
        if (lastCategory && categoryA === lastCategory && categoryB === lastCategory && 
            scoredPairs.length > 1 && selectedPairs.length > 0) {
          // Find first pair with a different category
          const diverseIndex = scoredPairs.findIndex((p, idx) => 
            idx !== selectedIndex && 
            (p.pair[0].category !== lastCategory || p.pair[1].category !== lastCategory)
          );
          
          if (diverseIndex !== -1) {
            selectedIndex = diverseIndex;
            const diversePair = scoredPairs[diverseIndex];
            selected.pair = diversePair.pair;
            [interestA, interestB] = diversePair.pair;
          }
        }
        
        // Add to selected pairs and remove from candidates
        selectedPairs.push(selected.pair);
        scoredPairs.splice(selectedIndex, 1);
        
        // Update last category
        lastCategory = categoryA === categoryB ? categoryA : null;
        
        // Track used categories
        usedCategories.add(categoryA);
        usedCategories.add(categoryB);
      }
      
      return selectedPairs;
    } catch (error) {
      console.error("Error generating survey pairs:", error);
      throw error;
    }
  }
  
  /**
   * Shuffles an array using Fisher-Yates algorithm
   * @param {Array} array - The array to shuffle
   * @returns {Array} - The shuffled array
   * @private
   */
  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }
  
  /**
   * Record the date of the last interest survey for a child
   * @param {string} familyId - The family ID
   * @param {string} childId - The child ID
   * @returns {Promise<void>}
   */
  async recordSurveyCompleted(familyId, childId) {
    try {
      const docRef = doc(db, "families", familyId, "childInterests", childId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        await updateDoc(docRef, {
          lastSurveyDate: serverTimestamp(),
          lastUpdated: serverTimestamp()
        });
      } else {
        await setDoc(docRef, {
          childId,
          interests: [],
          lastSurveyDate: serverTimestamp(),
          lastUpdated: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error recording survey completion:", error);
      throw error;
    }
  }
  
  /**
   * Get popular interest categories by age
   * @param {number} age - The child's age
   * @returns {Promise<Array>} - Array of interest categories appropriate for the age
   */
  async getInterestCategories(age) {
    // Define age-appropriate categories for different age ranges
    const categoryMap = {
      // Ages 0-3
      toddler: [
        { id: 'toys', name: 'Educational Toys', icon: 'Toy', description: 'Toys that help with development' },
        { id: 'characters', name: 'Characters', icon: 'Characters', description: 'Favorite cartoon characters' },
        { id: 'animals', name: 'Animals', icon: 'Animals', description: 'Favorite animals and creatures' },
        { id: 'sensory', name: 'Sensory Play', icon: 'Sensory', description: 'Tactile and sensory experiences' },
        { id: 'books', name: 'Picture Books', icon: 'Books', description: 'Books with colorful pictures' }
      ],
      // Ages 3-5
      preschool: [
        { id: 'characters', name: 'Characters', icon: 'Characters', description: 'Favorite cartoon characters' },
        { id: 'dressup', name: 'Dress Up', icon: 'DressUp', description: 'Costume and role play' },
        { id: 'arts', name: 'Arts & Crafts', icon: 'Arts', description: 'Creative arts and crafts' },
        { id: 'music', name: 'Music', icon: 'Music', description: 'Musical instruments and songs' },
        { id: 'animals', name: 'Animals', icon: 'Animals', description: 'Favorite animals and creatures' },
        { id: 'vehicles', name: 'Vehicles', icon: 'Vehicles', description: 'Cars, trucks, and transportation' },
        { id: 'outdoor', name: 'Outdoor Play', icon: 'Outdoor', description: 'Outdoor activities and toys' },
        { id: 'books', name: 'Books', icon: 'Books', description: 'Storybooks and picture books' }
      ],
      // Ages 6-8
      earlyElementary: [
        { id: 'lego', name: 'Building Blocks', icon: 'Lego', description: 'LEGO and building toys' },
        { id: 'characters', name: 'Characters', icon: 'Characters', description: 'Favorite media characters' },
        { id: 'games', name: 'Games', icon: 'Games', description: 'Board games and card games' },
        { id: 'sports', name: 'Sports', icon: 'Sports', description: 'Sports and athletic activities' },
        { id: 'science', name: 'Science', icon: 'Science', description: 'Science kits and activities' },
        { id: 'arts', name: 'Arts & Crafts', icon: 'Arts', description: 'Creative arts and crafts' },
        { id: 'electronics', name: 'Electronics', icon: 'Electronics', description: 'Beginner electronics' },
        { id: 'books', name: 'Books', icon: 'Books', description: 'Chapter books and stories' },
        { id: 'collecting', name: 'Collecting', icon: 'Collecting', description: 'Cards and collectibles' }
      ],
      // Ages 9-11
      lateElementary: [
        { id: 'tech', name: 'Technology', icon: 'Tech', description: 'Gadgets and technology' },
        { id: 'videogames', name: 'Video Games', icon: 'VideoGames', description: 'Games and gaming systems' },
        { id: 'lego', name: 'Building Sets', icon: 'Lego', description: 'Advanced building sets' },
        { id: 'sports', name: 'Sports', icon: 'Sports', description: 'Sports equipment and activities' },
        { id: 'music', name: 'Music', icon: 'Music', description: 'Music and instruments' },
        { id: 'science', name: 'Science', icon: 'Science', description: 'Science and experiments' },
        { id: 'art', name: 'Art', icon: 'Art', description: 'Art supplies and crafts' },
        { id: 'coding', name: 'Coding', icon: 'Coding', description: 'Programming and coding' },
        { id: 'books', name: 'Books', icon: 'Books', description: 'Books and book series' },
        { id: 'fashion', name: 'Fashion', icon: 'Fashion', description: 'Clothing and accessories' },
        { id: 'collecting', name: 'Collecting', icon: 'Collecting', description: 'Cards and collectibles' }
      ],
      // Ages 12-13
      preteen: [
        { id: 'tech', name: 'Technology', icon: 'Tech', description: 'Gadgets and technology' },
        { id: 'videogames', name: 'Video Games', icon: 'VideoGames', description: 'Games and gaming systems' },
        { id: 'sports', name: 'Sports', icon: 'Sports', description: 'Sports and athletic gear' },
        { id: 'music', name: 'Music', icon: 'Music', description: 'Music and audio' },
        { id: 'fashion', name: 'Fashion', icon: 'Fashion', description: 'Clothing and accessories' },
        { id: 'outdoors', name: 'Outdoors', icon: 'Outdoors', description: 'Outdoor and adventure gear' },
        { id: 'crafting', name: 'Crafting', icon: 'Crafting', description: 'Crafts and DIY projects' },
        { id: 'books', name: 'Books', icon: 'Books', description: 'Books and reading materials' },
        { id: 'beauty', name: 'Beauty', icon: 'Beauty', description: 'Personal care and beauty items' },
        { id: 'cooking', name: 'Cooking', icon: 'Cooking', description: 'Cooking and baking' },
        { id: 'collecting', name: 'Collecting', icon: 'Collecting', description: 'Collectibles and trading cards' },
        { id: 'diy', name: 'DIY Projects', icon: 'DIY', description: 'Do it yourself projects' }
      ],
      // Ages 14-18
      teen: [
        { id: 'tech', name: 'Technology', icon: 'Tech', description: 'Electronics and technology' },
        { id: 'videogames', name: 'Video Games', icon: 'VideoGames', description: 'Games and gaming' },
        { id: 'music', name: 'Music', icon: 'Music', description: 'Music and audio equipment' },
        { id: 'sports', name: 'Sports', icon: 'Sports', description: 'Sports and athletic gear' },
        { id: 'fashion', name: 'Fashion', icon: 'Fashion', description: 'Clothing and fashion items' },
        { id: 'beauty', name: 'Beauty', icon: 'Beauty', description: 'Beauty and cosmetics' },
        { id: 'diy', name: 'DIY', icon: 'DIY', description: 'Do-it-yourself projects' },
        { id: 'books', name: 'Books', icon: 'Books', description: 'Books and literature' },
        { id: 'cooking', name: 'Cooking', icon: 'Cooking', description: 'Cooking and food' },
        { id: 'art', name: 'Art', icon: 'Art', description: 'Art supplies and crafts' },
        { id: 'outdoors', name: 'Outdoors', icon: 'Outdoors', description: 'Outdoor and adventure gear' },
        { id: 'decor', name: 'Room Décor', icon: 'Decor', description: 'Room decoration items' },
        { id: 'accessories', name: 'Accessories', icon: 'Accessories', description: 'Accessories and gadgets' }
      ]
    };
    
    // Determine which age category the child falls into
    let ageCategory = null;
    for (const [category, range] of Object.entries(this.AGE_CATEGORIES)) {
      if (age >= range.min && age <= range.max) {
        ageCategory = category;
        break;
      }
    }
    
    if (!ageCategory) {
      ageCategory = age <= this.AGE_CATEGORIES.toddler.max ? 'toddler' : 'teen';
    }
    
    return categoryMap[ageCategory] || [];
  }
  
  /**
   * Add sample interests for a child (for testing/demo purposes)
   * @param {string} familyId - The family ID
   * @param {string} childId - The child ID
   * @param {number} age - The child's age (for age-appropriate interests)
   * @returns {Promise<void>}
   */
  async addSampleInterests(familyId, childId, age) {
    try {
      // Get age-appropriate sample interests
      const sampleInterests = this.getSampleInterestsForAge(age);
      
      const docRef = doc(db, "families", familyId, "childInterests", childId);
      const docSnap = await getDoc(docRef);
      
      // Format interests with proper structure
      const interests = sampleInterests.map((interest, index) => ({
        id: `sample_${index}_${Date.now()}`,
        name: interest.name,
        category: interest.category,
        subcategory: interest.subcategory || null,
        details: interest.details || '',
        dateAdded: new Date().toISOString(), // Use ISO string instead of serverTimestamp
        rating: this.BASE_ELO + (Math.random() * 100 - 50), // Slight variation
        comparisons: Math.floor(Math.random() * 5), // Some random comparison count
        source: 'sample',
        specifics: interest.specifics || {},
        history: []
      }));
      
      if (docSnap.exists()) {
        // Document exists, update the interests array
        await updateDoc(docRef, {
          interests: arrayUnion(...interests),
          lastUpdated: serverTimestamp()
        });
      } else {
        // Document doesn't exist, create it
        await setDoc(docRef, {
          childId,
          interests,
          lastUpdated: serverTimestamp(),
          lastSurveyDate: null
        });
      }
    } catch (error) {
      console.error("Error adding sample interests:", error);
      throw error;
    }
  }
  
  /**
   * Get personalized recommendations based on a child's interests and family context
   * @param {string} familyId - The family ID
   * @param {string} childId - The child ID
   * @returns {Promise<Object>} - Personalized recommendations
   */
  async getPersonalizedRecommendations(familyId, childId) {
    try {
      // Get child's interests
      const interests = await this.getChildInterests(familyId, childId);
      
      if (interests.length === 0) {
        return {
          activities: [],
          content: [],
          gifts: [],
          nextQuestions: []
        };
      }
      
      // Get family data to access child age and siblings
      const familyDoc = await getDoc(doc(db, "families", familyId));
      if (!familyDoc.exists()) {
        throw new Error(`Family with ID ${familyId} not found`);
      }
      
      const familyData = familyDoc.data();
      const childData = familyData.members?.find(m => m.id === childId);
      const childAge = childData?.age || 10;
      
      // Sort interests by rating (descending) to get top interests
      const sortedInterests = [...interests].sort((a, b) => b.rating - a.rating);
      
      // Get top interests as embedding seeds (focus on highest rated)
      const topInterests = sortedInterests.slice(0, 5);
      
      // Get categorized interests for grouping
      const categorizedInterests = await this.getClassifiedInterests(familyId, childId);
      
      // Generate category embeddings (average of interests in each category)
      const categoryScores = this.generateCategoryScores(interests);
      
      // Get activities that match the child's top interests and age
      const activities = await this.getMatchingActivities(topInterests, childAge, categoryScores);
      
      // Get content recommendations based on interests and age
      const content = await this.getMatchingContent(topInterests, childAge, categoryScores);
      
      // Get gift recommendations
      const gifts = await this.getGiftRecommendations(topInterests, childAge, categorizedInterests.loves);
      
      // Generate optimal next survey questions
      const nextPairs = await this.generateSurveyPairs(familyId, childId, 5);
      
      // Format next questions
      const nextQuestions = nextPairs.map(pair => ({
        interestA: { id: pair[0].id, name: pair[0].name, category: pair[0].category },
        interestB: { id: pair[1].id, name: pair[1].name, category: pair[1].category },
        prompt: this.generateQuestionPrompt(pair[0], pair[1], childAge)
      }));
      
      // Return comprehensive personalization data
      return {
        activities,
        content,
        gifts,
        nextQuestions,
        topInterests: topInterests.map(i => ({ 
          id: i.id, 
          name: i.name, 
          category: i.category,
          rating: i.rating,
          confidence: 100 - (i.uncertainty || 100) / 3.5 // Convert uncertainty to confidence percentage
        })),
        categoryScores,
        insights: this.generateInsights(interests, childAge, familyData)
      };
    } catch (error) {
      console.error("Error generating personalized recommendations:", error);
      throw error;
    }
  }
  
  /**
   * Generate category scores from interests
   * @param {Array} interests - Array of interests
   * @returns {Object} - Category scores
   * @private
   */
  generateCategoryScores(interests) {
    const categories = {};
    const counts = {};
    
    // Collect ratings by category
    interests.forEach(interest => {
      const category = interest.category || 'general';
      if (!categories[category]) {
        categories[category] = 0;
        counts[category] = 0;
      }
      
      // Weight by rating and recency
      const recencyBoost = interest.lastCompared ? 
        Math.max(0, 1 - (Date.now() - new Date(interest.lastCompared).getTime()) / (30 * 86400000)) : 0;
      
      const weight = 1 + (recencyBoost * 0.5);
      
      // Normalize rating to 0-100 scale and apply weight
      const normalizedRating = ((interest.rating - 800) / 800) * 100;
      categories[category] += normalizedRating * weight;
      counts[category] += 1;
    });
    
    // Calculate average scores and normalize to 0-100
    const scores = {};
    let totalScore = 0;
    
    Object.keys(categories).forEach(category => {
      scores[category] = Math.round(categories[category] / counts[category]);
      totalScore += scores[category];
    });
    
    // Normalize to percentage (all categories total 100%)
    if (totalScore > 0) {
      Object.keys(scores).forEach(category => {
        scores[category] = Math.round((scores[category] / totalScore) * 100);
      });
    }
    
    return scores;
  }
  
  /**
   * Generate matching activities based on interests and age
   * @param {Array} topInterests - Top interests
   * @param {number} age - Child's age
   * @param {Object} categoryScores - Category scores
   * @returns {Promise<Array>} - Matching activities
   * @private
   */
  async getMatchingActivities(topInterests, age, categoryScores) {
    // In a full implementation, this would query an activities database
    // For now, we'll generate some sample activities based on interests and age
    
    const activityTypes = [
      "at-home project", "class", "game", "group activity", 
      "outdoor adventure", "play idea", "skill building"
    ];
    
    // Generate activities for each top interest
    return topInterests.slice(0, 3).map(interest => {
      const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      
      // Create brand-specific titles and descriptions if brand exists
      let title = `${interest.name} ${activityType}`;
      let description = `A fun ${activityType} focused on ${interest.name} for children age ${Math.max(1, age-1)}-${age+1}`;
      
      if (interest.brand) {
        title = `${interest.brand} ${interest.name} ${activityType}`;
        
        // Special descriptions for video games
        if (interest.category === 'videogames' && interest.specifics?.platform) {
          description = `Fun ${activityType} with ${interest.brand} ${interest.name} on ${interest.specifics.platform} for ages ${Math.max(1, age-1)}-${age+1}`;
        } 
        // Special descriptions for toys
        else if (interest.category === 'toys' || interest.category === 'lego') {
          description = `Creative ${activityType} using ${interest.brand} ${interest.name} designed for children ages ${Math.max(1, age-1)}-${age+1}`;
        }
        // Standard brand description
        else {
          description = `${interest.brand}-inspired ${activityType} featuring ${interest.name} for ages ${Math.max(1, age-1)}-${age+1}`;
        }
      }
      
      return {
        id: `activity_${interest.id}`,
        title: title,
        description: description,
        interestMatch: interest.name,
        brand: interest.brand || null,
        categoryMatch: interest.category,
        platform: interest.specifics?.platform || null,
        ageRange: `${Math.max(1, age-1)}-${age+1}`,
        difficulty: ["easy", "medium", "challenging"][Math.floor(Math.random() * 3)],
        timeEstimate: ["15 min", "30 min", "1 hour", "2+ hours"][Math.floor(Math.random() * 4)],
        materials: ["readily available", "some preparation needed", "specialized items"][Math.floor(Math.random() * 3)]
      };
    });
  }
  
  /**
   * Generate matching content based on interests and age
   * @param {Array} topInterests - Top interests
   * @param {number} age - Child's age
   * @param {Object} categoryScores - Category scores
   * @returns {Promise<Array>} - Matching content
   * @private
   */
  async getMatchingContent(topInterests, age, categoryScores) {
    // In a full implementation, this would query a content database with embeddings
    // For now, generate sample content based on interests
    
    const contentTypes = [
      "video", "article", "book", "game", "app", "activity"
    ];
    
    // Generate content for each top interest
    return topInterests.slice(0, 4).map(interest => {
      const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
      
      return {
        id: `content_${interest.id}_${Date.now()}`,
        title: `${interest.name} ${contentType} for kids`,
        type: contentType,
        description: `Engaging ${contentType} about ${interest.name} designed for children age ${Math.max(1, age-1)}-${age+1}`,
        interestMatch: interest.name,
        categoryMatch: interest.category,
        ageAppropriate: true,
        recommendationReason: `Based on ${interest.name} interest`
      };
    });
  }
  
  /**
   * Generate gift recommendations based on interests and age
   * @param {Array} topInterests - Top interests
   * @param {number} age - Child's age
   * @param {Array} lovedInterests - Top "loved" interests
   * @returns {Promise<Array>} - Gift recommendations
   * @private
   */
  async getGiftRecommendations(topInterests, age, lovedInterests = []) {
    // Combine top interests and loved interests without duplicates
    const combined = [...topInterests];
    lovedInterests.forEach(interest => {
      if (!combined.some(i => i.id === interest.id)) {
        combined.push(interest);
      }
    });
    
    // Take top 5 unique interests
    const uniqueInterests = combined.slice(0, 5);
    
    // Generate gift ideas for each interest
    return uniqueInterests.map(interest => {
      const priceRanges = ["$10-25", "$25-50", "$50-100", "$100+"];
      const priceRange = priceRanges[Math.floor(Math.random() * priceRanges.length)];
      
      // Format gift name based on available data
      let giftTitle = interest.name;
      
      // Add brand if available
      if (interest.brand) {
        giftTitle = `${interest.brand} ${interest.name}`;
      }
      
      // Add specific info for video games
      if (interest.category === 'videogames' && interest.specifics?.platform) {
        giftTitle = `${giftTitle} for ${interest.specifics.platform}`;
      }
      
      // Add age-appropriate descriptor
      const ageDescriptor = age <= 5 ? 'kid-friendly' : 
                           age <= 12 ? 'for children' : 'for teens';
      
      // Generate description with brand and age info
      let description = `A gift related to ${interest.name} that's perfect for a ${age} year old`;
      
      if (interest.brand) {
        description = `${interest.brand}'s ${interest.name} - a popular ${ageDescriptor} ${interest.category} gift`;
      }
      
      return {
        id: `gift_${interest.id}_${Date.now()}`,
        title: giftTitle,
        description: description,
        interestMatch: interest.name,
        brand: interest.brand || null,
        categoryMatch: interest.category,
        ageAppropriate: true,
        priceRange,
        giftType: interest.category,
        specifics: interest.specifics || {},
        purchaseUrl: "#", // Would be filled with actual URL in production
        imageUrl: "#" // Would be filled with actual image in production
      };
    });
  }
  
  /**
   * Generate question prompt based on two interests
   * @param {Object} interestA - First interest
   * @param {Object} interestB - Second interest
   * @param {number} age - Child's age
   * @returns {string} - Question prompt
   * @private
   */
  generateQuestionPrompt(interestA, interestB, age) {
    // Create age-appropriate question prompts
    const prompts = [
      `Which one does your child enjoy more?`,
      `Which activity would your child choose first?`,
      `Which one makes your child smile more?`,
      `Which one keeps your child engaged longer?`,
      `Which one does your child ask for more often?`
    ];
    
    // For younger children
    if (age < 7) {
      prompts.push(
        `Which one makes your child happier?`,
        `Which one does your child get more excited about?`
      );
    } 
    // For older children
    else {
      prompts.push(
        `Which one would your child spend more time on?`,
        `Which interest seems more important to your child?`
      );
    }
    
    // Return random prompt
    return prompts[Math.floor(Math.random() * prompts.length)];
  }
  
  /**
   * Generate insights based on interests and family data
   * @param {Array} interests - Child's interests
   * @param {number} age - Child's age
   * @param {Object} familyData - Family data
   * @returns {Array} - Insights
   * @private
   */
  generateInsights(interests, age, familyData) {
    if (interests.length < 3) {
      return [{
        type: "needMoreData",
        title: "Need more information",
        description: "Complete a few more interest comparisons to get personalized insights."
      }];
    }
    
    const insights = [];
    
    // Generate category insights
    const categoryScores = this.generateCategoryScores(interests);
    const topCategories = Object.entries(categoryScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([category, score]) => ({ category, score }));
    
    if (topCategories.length >= 2) {
      insights.push({
        type: "categoryPreference",
        title: "Category Preference",
        description: `Your child leans ${topCategories[0].score}% toward ${topCategories[0].category} vs ${topCategories[1].score}% ${topCategories[1].category} activities.`
      });
    }
    
    // Check for trends
    if (interests.some(i => i.history && i.history.length > 2)) {
      // Find interests with increasing ratings
      const increasingInterests = interests.filter(interest => {
        if (!interest.history || interest.history.length < 3) return false;
        
        const recentRatings = interest.history
          .slice(-3)
          .map(h => h.winnerNewRating || h.loserNewRating);
        
        return recentRatings[2] > recentRatings[0];
      });
      
      if (increasingInterests.length > 0) {
        const topIncreasing = increasingInterests.sort((a, b) => b.rating - a.rating)[0];
        insights.push({
          type: "growingInterest",
          title: "Growing Interest",
          description: `Your child's interest in ${topIncreasing.name} appears to be growing based on recent choices.`
        });
      }
    }
    
    // Add age-appropriate insight
    if (age <= 5) {
      insights.push({
        type: "developmentalTip",
        title: "Early Development",
        description: "At this age, hands-on exploration and sensory play are important for development."
      });
    } else if (age <= 8) {
      insights.push({
        type: "developmentalTip",
        title: "Skill Building",
        description: "Children this age enjoy mastering new skills and showing what they can do."
      });
    } else if (age <= 12) {
      insights.push({
        type: "developmentalTip",
        title: "Social Connections",
        description: "Peer relationships and group activities become increasingly important at this age."
      });
    } else {
      insights.push({
        type: "developmentalTip",
        title: "Independence",
        description: "Teens value independence while still needing guidance for exploring interests."
      });
    }
    
    return insights;
  }
  
  /**
   * Get sample interests for a specific age
   * @param {number} age - The child's age
   * @returns {Array} - Array of sample interests
   * @private
   */
  getSampleInterestsForAge(age) {
    // Basic age-appropriate sample interests
    if (age <= 3) {
      return [
        { name: 'Stuffed Animals', category: 'toys', subcategory: 'plush', brand: 'Melissa & Doug' },
        { name: 'Dinosaurs', category: 'animals', subcategory: 'prehistoric', brand: 'Schleich' },
        { name: 'DUPLO Blocks', category: 'toys', subcategory: 'building', brand: 'LEGO' },
        { name: 'Fisher-Price Toys', category: 'toys', subcategory: 'educational', brand: 'Fisher-Price' },
        { name: 'Disney Books', category: 'books', subcategory: 'picture', brand: 'Disney' },
        { name: 'Musical Toys', category: 'toys', subcategory: 'music', brand: 'VTech' },
        { name: 'Hot Wheels', category: 'toys', subcategory: 'vehicles', brand: 'Hot Wheels' },
        { name: 'Crayola Coloring', category: 'arts', subcategory: 'drawing', brand: 'Crayola' },
        { name: 'Sensory Toys', category: 'toys', subcategory: 'sensory', brand: 'Fat Brain Toys' }
      ];
    } else if (age <= 5) {
      return [
        { name: 'Dinosaurs', category: 'animals', subcategory: 'prehistoric', brand: 'Jurassic World' },
        { name: 'Disney Princess', category: 'characters', subcategory: 'fantasy', brand: 'Disney' },
        { name: 'Marvel Superheroes', category: 'characters', subcategory: 'action', brand: 'Marvel' },
        { name: 'Play-Doh', category: 'arts', subcategory: 'sculpting', brand: 'Play-Doh' },
        { name: 'Disney Dress Up', category: 'dressup', subcategory: 'roleplay', brand: 'Disney' },
        { name: 'LEGO DUPLO', category: 'toys', subcategory: 'building', brand: 'LEGO' },
        { name: 'Thomas & Friends', category: 'toys', subcategory: 'vehicles', brand: 'Thomas & Friends' },
        { name: 'Paw Patrol', category: 'characters', subcategory: 'TV', brand: 'Paw Patrol' },
        { name: 'Crayola Drawing', category: 'arts', subcategory: 'drawing', brand: 'Crayola' },
        { name: 'Dr. Seuss Books', category: 'books', subcategory: 'picture', brand: 'Dr. Seuss' }
      ];
    } else if (age <= 8) {
      return [
        { name: 'LEGO City', category: 'lego', subcategory: 'building', brand: 'LEGO' },
        { name: 'LEGO Star Wars', category: 'lego', subcategory: 'building', brand: 'LEGO' },
        { name: 'Jurassic World', category: 'science', subcategory: 'prehistoric', brand: 'Jurassic World' },
        { name: 'Barbie', category: 'toys', subcategory: 'figures', brand: 'Barbie' },
        { name: 'Marvel Action Figures', category: 'toys', subcategory: 'figures', brand: 'Marvel' },
        { name: 'Monopoly Junior', category: 'games', subcategory: 'board', brand: 'Hasbro' },
        { name: 'National Geographic Kits', category: 'science', subcategory: 'experiments', brand: 'National Geographic' },
        { name: 'Crayola Art Set', category: 'arts', subcategory: 'general', brand: 'Crayola' },
        { name: 'Harry Potter Books', category: 'books', subcategory: 'chapter', brand: 'Scholastic' },
        { name: 'Razor Scooters', category: 'outdoor', subcategory: 'riding', brand: 'Razor' },
        { name: 'Nike Soccer', category: 'sports', subcategory: 'team', brand: 'Nike' },
        { name: 'Pokémon Cards', category: 'collecting', subcategory: 'cards', brand: 'Pokémon' },
        { name: 'Sphero Robots', category: 'tech', subcategory: 'robotics', brand: 'Sphero' }
      ];
    } else if (age <= 11) {
      return [
        { name: 'LEGO Technic', category: 'lego', subcategory: 'building', brand: 'LEGO' },
        { name: 'Nintendo Switch', category: 'videogames', subcategory: 'nintendo', brand: 'Nintendo', specifics: { platform: 'Nintendo Switch' } },
        { name: 'PlayStation 5', category: 'videogames', subcategory: 'playstation', brand: 'Sony', specifics: { platform: 'PlayStation 5' } },
        { name: 'Xbox Series X', category: 'videogames', subcategory: 'xbox', brand: 'Microsoft', specifics: { platform: 'Xbox Series X' } },
        { name: 'Minecraft', category: 'videogames', subcategory: 'minecraft', brand: 'Microsoft', specifics: { title: 'Minecraft' } },
        { name: 'Roblox', category: 'videogames', subcategory: 'roblox', brand: 'Roblox Corporation', specifics: { title: 'Roblox' } },
        { name: 'NERF Blasters', category: 'toys', subcategory: 'action', brand: 'NERF' },
        { name: 'Wilson Basketball', category: 'sports', subcategory: 'team', brand: 'Wilson' },
        { name: 'Science Kits', category: 'science', subcategory: 'experiments', brand: 'Thames & Kosmos' },
        { name: 'Scratch Coding', category: 'coding', subcategory: 'programming', brand: 'MIT' },
        { name: 'Dog Man Books', category: 'books', subcategory: 'series', brand: 'Scholastic' },
        { name: 'Pokémon Cards', category: 'collecting', subcategory: 'cards', brand: 'Pokémon' },
        { name: 'Traxxas RC Cars', category: 'tech', subcategory: 'rc', brand: 'Traxxas' },
        { name: 'Crayola Art Sets', category: 'arts', subcategory: 'drawing', brand: 'Crayola' },
        { name: 'Elmer\'s Slime Making', category: 'crafting', subcategory: 'slime', brand: 'Elmer\'s' }
      ];
    } else if (age <= 13) {
      return [
        { name: 'PlayStation 5', category: 'videogames', subcategory: 'playstation', brand: 'Sony', specifics: { platform: 'PlayStation 5' } },
        { name: 'Nintendo Switch', category: 'videogames', subcategory: 'nintendo', brand: 'Nintendo', specifics: { platform: 'Nintendo Switch' } },
        { name: 'Xbox Series X', category: 'videogames', subcategory: 'xbox', brand: 'Microsoft', specifics: { platform: 'Xbox Series X' } },
        { name: 'Fortnite', category: 'videogames', subcategory: 'fortnite', brand: 'Epic Games', specifics: { title: 'Fortnite' } },
        { name: 'Minecraft', category: 'videogames', subcategory: 'minecraft', brand: 'Microsoft', specifics: { title: 'Minecraft' } },
        { name: 'LEGO Star Wars', category: 'lego', subcategory: 'advanced', brand: 'LEGO' },
        { name: 'Nike Basketball', category: 'sports', subcategory: 'team', brand: 'Nike' },
        { name: 'Percy Jackson Books', category: 'books', subcategory: 'series', brand: 'Disney-Hyperion' },
        { name: 'Prismacolor Art Supplies', category: 'art', subcategory: 'supplies', brand: 'Prismacolor' },
        { name: 'Tony Hawk Skateboarding', category: 'sports', subcategory: 'skateboarding', brand: 'Tony Hawk' },
        { name: 'Funko Pop Collectibles', category: 'collecting', subcategory: 'general', brand: 'Funko' },
        { name: 'DJI Drones', category: 'tech', subcategory: 'drones', brand: 'DJI' },
        { name: 'Nike Fashion', category: 'fashion', subcategory: 'clothing', brand: 'Nike' },
        { name: 'Beats Headphones', category: 'tech', subcategory: 'audio', brand: 'Beats' },
        { name: 'Spotify Music', category: 'music', subcategory: 'listening', brand: 'Spotify' },
        { name: 'Demon Slayer Anime', category: 'media', subcategory: 'anime', brand: 'Crunchyroll' }
      ];
    } else {
      // Ages 14+
      return [
        { name: 'PlayStation 5', category: 'videogames', subcategory: 'playstation', brand: 'Sony', specifics: { platform: 'PlayStation 5' } },
        { name: 'Nintendo Switch', category: 'videogames', subcategory: 'nintendo', brand: 'Nintendo', specifics: { platform: 'Nintendo Switch' } },
        { name: 'Xbox Series X', category: 'videogames', subcategory: 'xbox', brand: 'Microsoft', specifics: { platform: 'Xbox Series X' } },
        { name: 'PC Gaming', category: 'videogames', subcategory: 'pc', brand: 'Steam', specifics: { platform: 'PC' } },
        { name: 'Apple iPhone', category: 'tech', subcategory: 'mobile', brand: 'Apple' },
        { name: 'Spotify Premium', category: 'music', subcategory: 'listening', brand: 'Spotify' },
        { name: 'Nike Jordan', category: 'fashion', subcategory: 'shoes', brand: 'Nike' },
        { name: 'Adidas', category: 'fashion', subcategory: 'shoes', brand: 'Adidas' },
        { name: 'Sephora Makeup', category: 'beauty', subcategory: 'cosmetics', brand: 'Sephora' },
        { name: 'Young Adult Books', category: 'books', subcategory: 'teen', brand: 'Penguin' },
        { name: 'NBA Merchandise', category: 'sports', subcategory: 'team', brand: 'NBA' },
        { name: 'H&M Clothing', category: 'fashion', subcategory: 'clothing', brand: 'H&M' },
        { name: 'Urban Outfitters', category: 'fashion', subcategory: 'clothing', brand: 'Urban Outfitters' },
        { name: 'Target Room Décor', category: 'decor', subcategory: 'bedroom', brand: 'Target' },
        { name: 'Apple AirPods', category: 'tech', subcategory: 'audio', brand: 'Apple' },
        { name: 'Canon Photography', category: 'media', subcategory: 'photography', brand: 'Canon' },
        { name: 'Crunchyroll Premium', category: 'media', subcategory: 'anime', brand: 'Crunchyroll' },
        { name: 'Moleskine Journals', category: 'crafting', subcategory: 'journaling', brand: 'Moleskine' },
        { name: 'Vans Skateboarding', category: 'sports', subcategory: 'skateboarding', brand: 'Vans' }
      ];
    }
  }
}

// Create and export a singleton instance
const childInterestService = new ChildInterestService();
export default childInterestService;
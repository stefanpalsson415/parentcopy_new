// src/components/dashboard/tabs/KidsInterestsTab.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Gift, AlertCircle, Search, X, PlusCircle, Info, Star,
  Trophy, ThumbsUp, ThumbsDown, Tag, ShoppingBag, Zap, 
  FileText, Calendar, Sparkles
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
// import { useAuth } from '../../../contexts/AuthContext';
import UserAvatar from '../../common/UserAvatar';
import childInterestService from '../../../services/ChildInterestService';
import InterestSurveyModal from '../../survey/InterestSurveyModal';

const categoryIcons = {
  toys: <Gift size={16} />,
  characters: <Star size={16} />,
  animals: <span className="text-sm">🦁</span>,
  sensory: <span className="text-sm">👐</span>,
  books: <FileText size={16} />,
  lego: <span className="text-sm">🧱</span>,
  games: <span className="text-sm">🎮</span>,
  sports: <span className="text-sm">🏀</span>,
  science: <span className="text-sm">🔬</span>,
  arts: <span className="text-sm">🎨</span>,
  tech: <span className="text-sm">📱</span>,
  coding: <span className="text-sm">💻</span>,
  fashion: <span className="text-sm">👕</span>,
  music: <span className="text-sm">🎵</span>,
  collecting: <span className="text-sm">🏆</span>,
  default: <Tag size={16} />
};

const KidsInterestsTab = () => {
  // Context hooks
  const { 
    selectedUser, 
    familyMembers,
    familyId
  } = useFamily();
  
  // Local state
  const [activeChild, setActiveChild] = useState(null);
  const [childInterests, setChildInterests] = useState({
    loves: [],
    likes: [],
    passes: [],
    uncategorized: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [interestCategories, setInterestCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [surveyPairs, setSurveyPairs] = useState([]);
  const [surveyPrompts, setSurveyPrompts] = useState([]);
  const [newInterestModalOpen, setNewInterestModalOpen] = useState(false);
  const [interests, setInterests] = useState([]);
  
  // Refs
  const searchInputRef = useRef(null);
  
  // Helper function to get child name
  const getChildName = (childId) => {
    const child = familyMembers.find(member => member.id === childId);
    return child ? child.name : 'Unknown Child';
  };
  
  // Effect to restore selected child from localStorage
  useEffect(() => {
    if (familyMembers.length > 0 && !activeChild) {
      const children = familyMembers.filter(member => member.role === 'child');
      if (children.length > 0) {
        const storedChildId = localStorage.getItem('selectedChildId');
        if (storedChildId) {
          const childFromStorage = children.find(child => child.id === storedChildId);
          if (childFromStorage) {
            console.log("Restoring selected child from localStorage:", childFromStorage.name);
            setActiveChild(childFromStorage.id);
          } else {
            // If stored child not found, select the first child
            setActiveChild(children[0].id);
          }
        } else {
          // If no stored selection, select the first child
          setActiveChild(children[0].id);
        }
      }
    }
  }, [familyMembers, activeChild]);
  
  // Save active child to localStorage when changed
  useEffect(() => {
    if (activeChild) {
      localStorage.setItem('selectedChildId', activeChild);
    }
  }, [activeChild]);
  
  // Load child interest categories
  useEffect(() => {
    const loadCategories = async () => {
      if (activeChild) {
        try {
          const child = familyMembers.find(m => m.id === activeChild);
          if (child) {
            const age = parseInt(child.age) || 10; // Default to 10 if age not specified
            const categories = await childInterestService.getInterestCategories(age);
            setInterestCategories(categories);
          }
        } catch (error) {
          console.error("Error loading interest categories:", error);
        }
      }
    };
    
    loadCategories();
  }, [activeChild, familyMembers]);
  
  // State for personalized recommendations
  const [recommendations, setRecommendations] = useState({
    activities: [],
    content: [],
    gifts: [],
    insights: [],
    topInterests: [],
    categoryScores: {},
    nextQuestions: []
  });
  
  // Load child interests and personalized recommendations
  useEffect(() => {
    const loadChildData = async () => {
      if (familyId && activeChild) {
        try {
          setLoading(true);
          setError(null);
          
          // Get raw interests
          const rawInterests = await childInterestService.getChildInterests(familyId, activeChild);
          setInterests(rawInterests);
          
          // Get classified interests
          const classified = await childInterestService.getClassifiedInterests(familyId, activeChild);
          setChildInterests(classified);
          
          // If no interests, populate with sample data (ONLY FOR TESTING)
          if (rawInterests.length === 0) {
            const child = familyMembers.find(m => m.id === activeChild);
            if (child) {
              const age = parseInt(child.age) || 10;
              await childInterestService.addSampleInterests(familyId, activeChild, age);
              
              // Reload interests after adding samples
              const updatedRaw = await childInterestService.getChildInterests(familyId, activeChild);
              setInterests(updatedRaw);
              
              const updatedClassified = await childInterestService.getClassifiedInterests(familyId, activeChild);
              setChildInterests(updatedClassified);
            }
          }
          
          // Get personalized recommendations
          if (rawInterests.length > 0) {
            const personalizedRecommendations = await childInterestService.getPersonalizedRecommendations(
              familyId, 
              activeChild
            );
            setRecommendations(personalizedRecommendations);
          }
          
          setLoading(false);
        } catch (error) {
          console.error("Error loading child interests:", error);
          setError("There was an error loading interests. Please try again.");
          setLoading(false);
        }
      }
    };
    
    loadChildData();
  }, [familyId, activeChild, familyMembers]);
  
  // Start a new survey
  const startNewSurvey = async () => {
    console.log("Starting new survey...");
    console.log("Family ID:", familyId);
    console.log("Active Child:", activeChild);
    
    if (!familyId || !activeChild) {
      console.error("Missing familyId or activeChild:", { familyId, activeChild });
      setError("Please select a child first.");
      return;
    }
    
    try {
      // Clear any previous errors
      setError(null);
      setLoading(true);
      console.log("Loading started, interests count:", interests.length);
      
      // Get child age for age-appropriate prompts
      const child = familyMembers.find(m => m.id === activeChild);
      const childAge = child ? parseInt(child.age) || 10 : 10;
      
      // If we don't have enough interests, add sample ones for testing
      if (interests.length < 2) {
        console.log("Not enough interests, adding samples for testing...");
        if (child) {
          await childInterestService.addSampleInterests(familyId, activeChild, childAge);
          
          // Reload interests after adding samples
          const updatedInterests = await childInterestService.getChildInterests(familyId, activeChild);
          setInterests(updatedInterests);
          console.log("Added sample interests, new count:", updatedInterests.length);
        }
      }
      
      // Generate pairs for the survey using the enhanced algorithm
      console.log("Generating survey pairs...");
      const pairs = await childInterestService.generateSurveyPairs(familyId, activeChild, 10);
      console.log("Generated pairs:", pairs.length);
      
      if (pairs.length === 0) {
        setError("Not enough interests to create comparisons. Add at least 2 interests first.");
        setLoading(false);
        return;
      }
      
      // Generate age-appropriate question prompts for each pair
      const prompts = pairs.map(pair => {
        // Create base question prompts
        const basePrompts = [
          `Which one does ${child?.name || 'your child'} enjoy more?`,
          `Which activity would ${child?.name || 'your child'} choose first?`,
          `Which one makes ${child?.name || 'your child'} smile more?`,
          `Which one keeps ${child?.name || 'your child'} engaged longer?`,
          `Which one does ${child?.name || 'your child'} ask for more often?`
        ];
        
        // For younger children
        if (childAge < 7) {
          basePrompts.push(
            `Which one makes ${child?.name || 'your child'} happier?`,
            `Which one does ${child?.name || 'your child'} get more excited about?`
          );
        } 
        // For older children
        else {
          basePrompts.push(
            `Which one would ${child?.name || 'your child'} spend more time on?`,
            `Which interest seems more important to ${child?.name || 'your child'}?`
          );
        }
        
        // Brand-specific prompts if both items have brands
        if (pair[0].brand && pair[1].brand) {
          basePrompts.push(
            `Would ${child?.name || 'your child'} rather have ${pair[0].brand} ${pair[0].name} or ${pair[1].brand} ${pair[1].name}?`,
            `For a gift, which would ${child?.name || 'your child'} prefer: ${pair[0].brand} or ${pair[1].brand}?`
          );
        }
        
        // Gaming console comparisons
        if (pair[0].subcategory && pair[1].subcategory && 
            ['playstation', 'nintendo', 'xbox', 'pc'].includes(pair[0].subcategory) && 
            ['playstation', 'nintendo', 'xbox', 'pc'].includes(pair[1].subcategory)) {
          basePrompts.push(
            `Does ${child?.name || 'your child'} prefer ${pair[0].brand} or ${pair[1].brand} games?`,
            `Which gaming platform would ${child?.name || 'your child'} choose: ${pair[0].brand} or ${pair[1].brand}?`
          );
        }
        
        // Toy brand comparisons
        if (pair[0].category === 'toys' && pair[1].category === 'toys' && 
            pair[0].brand && pair[1].brand) {
          basePrompts.push(
            `Between ${pair[0].brand} and ${pair[1].brand}, which toy brand does ${child?.name || 'your child'} like better?`
          );
        }
        
        // LEGO specific prompts
        if ((pair[0].brand === 'LEGO' || pair[1].brand === 'LEGO') && 
            !(pair[0].brand === 'LEGO' && pair[1].brand === 'LEGO')) {
          const legoItem = pair[0].brand === 'LEGO' ? pair[0] : pair[1];
          const otherItem = pair[0].brand === 'LEGO' ? pair[1] : pair[0];
          basePrompts.push(
            `Would ${child?.name || 'your child'} rather play with ${legoItem.name} or ${otherItem.name}?`
          );
        }
        
        // Video game specific prompts
        if (pair[0].category === 'videogames' && pair[1].category === 'videogames' &&
            pair[0].specifics?.title && pair[1].specifics?.title) {
          basePrompts.push(
            `Which game would ${child?.name || 'your child'} rather play: ${pair[0].specifics.title} or ${pair[1].specifics.title}?`
          );
        }
        
        // Customize prompt based on categories if pair has different categories
        if (pair[0].category !== pair[1].category) {
          basePrompts.push(
            `Does ${child?.name || 'your child'} prefer ${pair[0].category} or ${pair[1].category} activities?`
          );
        }
        
        // Return a random prompt from the options
        return basePrompts[Math.floor(Math.random() * basePrompts.length)];
      });
      
      // Set the generated prompts
      setSurveyPrompts(prompts);
      
      // Set pairs and show modal
      setSurveyPairs(pairs);
      console.log("Setting survey modal to visible");
      setShowSurveyModal(true);
      
      setLoading(false);
    } catch (error) {
      console.error("Error generating survey pairs:", error);
      setError("There was an error creating the survey. Please try again.");
      setLoading(false);
    }
  };
  
  // Handle survey completion
  const handleSurveyComplete = async (results) => {
    setShowSurveyModal(false);
    
    if (!results || results.length === 0) {
      return; // Survey was cancelled or no results
    }
    
    try {
      setLoading(true);
      
      // Process each comparison result
      for (const result of results) {
        await childInterestService.recordComparison(
          familyId,
          activeChild, 
          result.winnerId, 
          result.loserId
        );
      }
      
      // Record that a survey was completed
      await childInterestService.recordSurveyCompleted(familyId, activeChild);
      
      // Reload interests after survey
      const rawInterests = await childInterestService.getChildInterests(familyId, activeChild);
      setInterests(rawInterests);
      
      const classified = await childInterestService.getClassifiedInterests(familyId, activeChild);
      setChildInterests(classified);
      
      // Get updated personalized recommendations
      const personalizedRecommendations = await childInterestService.getPersonalizedRecommendations(
        familyId, 
        activeChild
      );
      setRecommendations(personalizedRecommendations);
      
      setLoading(false);
    } catch (error) {
      console.error("Error processing survey results:", error);
      setError("There was an error saving the survey results. Please try again.");
      setLoading(false);
    }
  };
  
  // Add a new interest
  const handleAddNewInterest = async (interestData) => {
    if (!familyId || !activeChild) return;
    
    try {
      setLoading(true);
      
      // Get child age for potential age-appropriate boost
      const child = familyMembers.find(m => m.id === activeChild);
      const childAge = child ? parseInt(child.age) || 10 : 10;
      
      // Check if this interest is age-appropriate based on category
      const categories = await childInterestService.getInterestCategories(childAge);
      const isAgeAppropriate = categories.some(c => c.id === interestData.category);
      
      // Add age-appropriate flag to interest data
      const enrichedInterestData = {
        ...interestData,
        ageAppropriate: isAgeAppropriate
      };
      
      await childInterestService.addInterest(familyId, activeChild, enrichedInterestData);
      
      // Reload interests after adding
      const rawInterests = await childInterestService.getChildInterests(familyId, activeChild);
      setInterests(rawInterests);
      
      const classified = await childInterestService.getClassifiedInterests(familyId, activeChild);
      setChildInterests(classified);
      
      // Update personalized recommendations
      const personalizedRecommendations = await childInterestService.getPersonalizedRecommendations(
        familyId, 
        activeChild
      );
      setRecommendations(personalizedRecommendations);
      
      setLoading(false);
      setNewInterestModalOpen(false);
    } catch (error) {
      console.error("Error adding new interest:", error);
      setError("There was an error adding the interest. Please try again.");
      setLoading(false);
    }
  };
  
  // Get category icon
  const getCategoryIcon = (category) => {
    return categoryIcons[category] || categoryIcons.default;
  };
  
  // Filter interests based on search query and active category
  const getFilteredInterests = () => {
    const searchLower = searchQuery.toLowerCase();
    
    // Combine all interests for searching
    const allInterests = [
      ...childInterests.loves,
      ...childInterests.likes,
      ...childInterests.passes,
      ...childInterests.uncategorized
    ];
    
    return allInterests.filter(interest => {
      // Search by name
      const nameMatch = interest.name.toLowerCase().includes(searchLower);
      
      // Filter by category if not 'all'
      const categoryMatch = activeCategory === 'all' || interest.category === activeCategory;
      
      return nameMatch && categoryMatch;
    });
  };
  
  // Handle child selection
  const handleSelectChild = (childId) => {
    setActiveChild(childId);
    // Reset other states
    setSearchQuery('');
    setActiveCategory('all');
  };
  
  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return "Not available";
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  // Handle recording a gift for an interest
  const handleRecordGift = async (interestId, interestName) => {
    if (!familyId || !activeChild) return;
    
    try {
      // Show a simple dialog for capturing gift details
      const giftName = prompt(`Record gift for ${interestName}:`, `${interestName} gift`);
      
      if (!giftName) return; // User cancelled
      
      setLoading(true);
      
      // Record the gift with the interest service
      await childInterestService.recordGiftReceived(familyId, activeChild, interestId, {
        name: giftName,
        date: new Date().toISOString(),
        giver: selectedUser?.name || 'Family member',
        occasion: 'Gift',
        notes: `Gift based on ${interestName} interest`,
        rating: null // Child hasn't rated it yet
      });
      
      // Show success message
      alert(`Gift "${giftName}" recorded successfully!`);
      
      // Refresh interests list
      const updatedRaw = await childInterestService.getChildInterests(familyId, activeChild);
      setInterests(updatedRaw);
      
      const classified = await childInterestService.getClassifiedInterests(familyId, activeChild);
      setChildInterests(classified);
      
      setLoading(false);
    } catch (error) {
      console.error("Error recording gift:", error);
      setError("Error recording gift. Please try again.");
      setLoading(false);
    }
  };
  
  // Get a color for an interest category
  const getCategoryColor = (category) => {
    const colorMap = {
      toys: 'bg-purple-100 text-purple-800',
      characters: 'bg-pink-100 text-pink-800',
      animals: 'bg-green-100 text-green-800',
      books: 'bg-blue-100 text-blue-800',
      lego: 'bg-yellow-100 text-yellow-800',
      games: 'bg-red-100 text-red-800',
      sports: 'bg-orange-100 text-orange-800',
      science: 'bg-teal-100 text-teal-800',
      arts: 'bg-indigo-100 text-indigo-800',
      tech: 'bg-gray-100 text-gray-800',
      music: 'bg-blue-100 text-blue-800',
      fashion: 'bg-pink-100 text-pink-800',
      default: 'bg-gray-100 text-gray-800'
    };
    
    return colorMap[category] || colorMap.default;
  };
  
  // Child profile
  const activeChildData = familyMembers.find(m => m.id === activeChild);
  
  return (
    <div className="relative">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
          <div className="p-4 rounded-lg bg-white shadow-lg">
            <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-700 font-roboto text-center">Loading data...</p>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg p-4 mb-6 flex items-start">
          <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium mb-1 font-roboto">Error</p>
            <p className="text-sm font-roboto">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      
      {/* Dashboard Header */}
      <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-xl font-bold font-roboto mb-1">Kids Gift Ideas Tracker</h2>
            <p className="text-gray-600 font-roboto text-sm">
              Keep track of your children's interests for gift ideas
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search interests..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-roboto"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              {searchQuery && (
                <button
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setSearchQuery('')}
                >
                  <X size={16} className="text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            
            {/* Add Interest button */}
            <button
              className="py-2 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center font-roboto"
              onClick={() => setNewInterestModalOpen(true)}
            >
              <PlusCircle size={16} className="mr-2" />
              Add Interest
            </button>
            
            {/* Kid Survey Button */}
            <button
              className="py-2 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:from-purple-700 hover:to-indigo-700 flex items-center font-roboto font-medium shadow transition-all"
              onClick={startNewSurvey}
              disabled={loading}
            >
              <Zap size={16} className="mr-2" />
              Start Kid Survey
            </button>
          </div>
        </div>
      </div>
      
      {/* Child Selection */}
      <div className="mb-4 flex flex-wrap gap-2">
        {familyMembers
          .filter(member => member.role === 'child')
          .map(child => (
            <button
              key={child.id}
              onClick={() => handleSelectChild(child.id)}
              className={`flex items-center px-4 py-2 rounded-md text-sm ${
                activeChild === child.id 
                  ? 'bg-blue-500 text-white font-medium shadow-sm' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <UserAvatar user={child} size={32} className="mr-2" />
              {child.name} {child.age ? `(${child.age})` : ''}
            </button>
          ))}
      </div>
      
      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Interest Categories */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <h3 className="font-medium text-lg mb-3">Categories</h3>
            
            {/* All Interests category */}
            <button
              onClick={() => setActiveCategory('all')}
              className={`w-full flex items-center px-3 py-2 rounded-md mb-2 ${
                activeCategory === 'all' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'hover:bg-gray-100'
              }`}
            >
              <Star size={16} className="mr-2" />
              <span>All Interests</span>
            </button>
            
            {/* Interest categories */}
            {interestCategories.map(category => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md mb-2 ${
                  activeCategory === category.id 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center">
                  <span className="mr-2">{getCategoryIcon(category.id)}</span>
                  <span>{category.name}</span>
                </div>
                
                {/* Count of interests in this category */}
                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 text-xs rounded-full">
                  {interests.filter(i => i.category === category.id).length}
                </span>
              </button>
            ))}
          </div>
          
          {/* Survey Info Card */}
          <div className="bg-purple-50 rounded-lg shadow-sm p-4 border border-purple-100">
            <h3 className="font-medium text-purple-800 flex items-center mb-2">
              <Zap size={18} className="mr-2 text-purple-600" />
              Interest Surveys
            </h3>
            
            <p className="text-sm text-purple-700 mb-3">
              Run quick surveys to keep track of your child's changing interests and gift preferences.
            </p>
            
            {activeChildData?.lastSurveyDate ? (
              <div className="text-xs text-purple-700 mb-2">
                Last survey: {formatDate(activeChildData.lastSurveyDate)}
              </div>
            ) : (
              <div className="text-xs text-purple-700 mb-2">
                No survey completed yet
              </div>
            )}
            
            <button
              onClick={startNewSurvey}
              className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md text-sm hover:from-purple-700 hover:to-indigo-700 flex items-center justify-center font-medium shadow transition-all"
              disabled={loading}
            >
              <Zap size={14} className="mr-2" />
              Start Kid Survey
            </button>
          </div>
        </div>
        
        {/* Main Interests Display */}
        <div className="flex-grow">
          {/* Child profile header */}
          {activeChildData && (
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex flex-col md:flex-row md:items-center">
                <div className="flex items-center mb-4 md:mb-0">
                  <UserAvatar user={activeChildData} size={56} className="mr-4" />
                  
                  <div>
                    <h2 className="text-xl font-bold">{activeChildData.name}'s Interests</h2>
                    <p className="text-gray-600 text-sm">
                      {interests.length} interests tracked
                      {activeChildData.age ? ` • Age: ${activeChildData.age}` : ''}
                    </p>
                    
                    {/* Show category scores if available */}
                    {recommendations.categoryScores && Object.keys(recommendations.categoryScores).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(recommendations.categoryScores)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                          .map(([category, score]) => (
                            <span 
                              key={category}
                              className={`text-xs ${getCategoryColor(category)} px-2 py-0.5 rounded-full capitalize`}
                            >
                              {category}: {score}%
                            </span>
                          ))
                        }
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="md:ml-auto flex flex-col md:flex-row gap-2">
                  <button
                    onClick={() => setNewInterestModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 flex items-center justify-center font-medium"
                  >
                    <PlusCircle size={14} className="mr-2" />
                    Add Interest
                  </button>
                  
                  <button
                    onClick={startNewSurvey}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md text-sm hover:from-purple-700 hover:to-indigo-700 flex items-center justify-center font-medium shadow transition-all"
                    disabled={loading}
                  >
                    <Zap size={14} className="mr-2" />
                    Start Kid Survey
                  </button>
                </div>
              </div>
              
              {/* Top interests chips */}
              {recommendations.topInterests && recommendations.topInterests.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center mb-2">
                    <Trophy size={16} className="text-yellow-500 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Top Interests</span>
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      Based on survey results
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {recommendations.topInterests.map(interest => (
                      <div 
                        key={interest.id}
                        className="flex items-center bg-gray-100 px-3 py-1 rounded-full text-sm"
                      >
                        <span className="mr-2">{getCategoryIcon(interest.category)}</span>
                        <span className="font-medium">{interest.name}</span>
                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                          {Math.round(interest.confidence)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Search results */}
          {searchQuery && (
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-lg">Search Results</h3>
                <span className="text-gray-500 text-sm">
                  {getFilteredInterests().length} results
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {getFilteredInterests().map(interest => (
                  <div 
                    key={interest.id}
                    className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start mb-2">
                      <div className={`rounded-full p-2 mr-2 ${getCategoryColor(interest.category)}`}>
                        {getCategoryIcon(interest.category)}
                      </div>
                      
                      <div className="flex-grow">
                        <h4 className="font-medium">{interest.name}</h4>
                        <div className="flex items-center text-xs text-gray-500">
                          <span className="capitalize">{interest.category}</span>
                          {interest.subcategory && (
                            <>
                              <span className="mx-1">•</span>
                              <span className="capitalize">{interest.subcategory}</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Rating indicator */}
                      <div className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700">
                        {interest.rating}
                      </div>
                    </div>
                    
                    {interest.details && (
                      <p className="text-sm text-gray-600 mb-2">{interest.details}</p>
                    )}
                    
                    {/* Tags for specific details */}
                    {interest.specifics && Object.keys(interest.specifics).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(interest.specifics).map(([key, value]) => (
                          <span 
                            key={key} 
                            className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
                          >
                            {value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                {getFilteredInterests().length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No interests matching your search
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Interest Tiers Display */}
          {!searchQuery && (
            <>
              {/* Loves (Top Tier) */}
              <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="flex items-center font-medium text-lg text-red-600">
                    <Trophy size={18} className="mr-2 text-red-500" />
                    Current Favorites
                  </h3>
                  <span className="text-gray-500 text-sm">
                    {childInterests.loves.length} top interests
                  </span>
                </div>
                
                {childInterests.loves.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {childInterests.loves
                      .filter(interest => activeCategory === 'all' || interest.category === activeCategory)
                      .map(interest => (
                        <div 
                          key={interest.id}
                          className="border border-red-200 rounded-lg p-3 hover:border-red-400 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start mb-2">
                            <div className={`rounded-full p-2 mr-2 ${getCategoryColor(interest.category)}`}>
                              {getCategoryIcon(interest.category)}
                            </div>
                            
                            <div className="flex-grow">
                              <h4 className="font-medium flex items-center">
                                {interest.name}
                                <span className="ml-1 text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                                  ♥
                                </span>
                              </h4>
                              <div className="flex items-center text-xs text-gray-500">
                                <span className="capitalize">{interest.category}</span>
                                {interest.subcategory && (
                                  <>
                                    <span className="mx-1">•</span>
                                    <span className="capitalize">{interest.subcategory}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {/* Gift button */}
                            <button 
                              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                              title="Record gift"
                              onClick={() => handleRecordGift(interest.id, interest.name)}
                            >
                              <ShoppingBag size={16} />
                            </button>
                          </div>
                          
                          {interest.details && (
                            <p className="text-sm text-gray-600 mb-2">{interest.details}</p>
                          )}
                          
                          {/* Tags for specific details */}
                          {interest.specifics && Object.keys(interest.specifics).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {Object.entries(interest.specifics).map(([key, value]) => (
                                <span 
                                  key={key} 
                                  className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full"
                                >
                                  {value}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                    <Trophy size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-500 mb-2">No favorite interests identified yet</p>
                    <button
                      onClick={startNewSurvey}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md text-sm hover:from-purple-700 hover:to-indigo-700 font-medium shadow flex items-center mx-auto"
                    >
                      <Zap size={14} className="mr-2" />
                      Start Kid Survey
                    </button>
                  </div>
                )}
              </div>
              
              {/* Likes (Middle Tier) */}
              <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="flex items-center font-medium text-lg text-blue-600">
                    <ThumbsUp size={18} className="mr-2 text-blue-500" />
                    Interests & Likes
                  </h3>
                  <span className="text-gray-500 text-sm">
                    {childInterests.likes.length} interests
                  </span>
                </div>
                
                {childInterests.likes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {childInterests.likes
                      .filter(interest => activeCategory === 'all' || interest.category === activeCategory)
                      .map(interest => (
                        <div 
                          key={interest.id}
                          className="border border-blue-200 rounded-lg p-3 hover:border-blue-400 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start mb-2">
                            <div className={`rounded-full p-2 mr-2 ${getCategoryColor(interest.category)}`}>
                              {getCategoryIcon(interest.category)}
                            </div>
                            
                            <div className="flex-grow">
                              <h4 className="font-medium">{interest.name}</h4>
                              <div className="flex items-center text-xs text-gray-500">
                                <span className="capitalize">{interest.category}</span>
                                {interest.subcategory && (
                                  <>
                                    <span className="mx-1">•</span>
                                    <span className="capitalize">{interest.subcategory}</span>
                                  </>
                                )}
                                {interest.brand && (
                                  <>
                                    <span className="mx-1">•</span>
                                    <span className="font-medium text-blue-600">{interest.brand}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {/* Gift button */}
                            <button 
                              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                              title="Record gift"
                              onClick={() => handleRecordGift(interest.id, interest.name)}
                            >
                              <ShoppingBag size={16} />
                            </button>
                          </div>
                          
                          {interest.details && (
                            <p className="text-sm text-gray-600 mb-2">{interest.details}</p>
                          )}
                          
                          {/* Tags for specific details */}
                          {interest.specifics && Object.keys(interest.specifics).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {Object.entries(interest.specifics).map(([key, value]) => (
                                <span 
                                  key={key} 
                                  className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
                                >
                                  {value}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                    <ThumbsUp size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-500 mb-2">No regular interests identified yet</p>
                    <button
                      onClick={() => setNewInterestModalOpen(true)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
                    >
                      Add interests manually
                    </button>
                  </div>
                )}
              </div>
              
              {/* Passes (Bottom Tier) */}
              {childInterests.passes.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="flex items-center font-medium text-lg text-gray-600">
                      <ThumbsDown size={18} className="mr-2 text-gray-500" />
                      Less Interested
                    </h3>
                    <span className="text-gray-500 text-sm">
                      {childInterests.passes.length} lower-ranked interests
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {childInterests.passes
                      .filter(interest => activeCategory === 'all' || interest.category === activeCategory)
                      .map(interest => (
                        <div 
                          key={interest.id}
                          className="border border-gray-200 rounded-lg p-3 hover:border-gray-400 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start mb-2">
                            <div className={`rounded-full p-2 mr-2 ${getCategoryColor(interest.category)}`}>
                              {getCategoryIcon(interest.category)}
                            </div>
                            
                            <div className="flex-grow">
                              <h4 className="font-medium">{interest.name}</h4>
                              <div className="flex items-center text-xs text-gray-500">
                                <span className="capitalize">{interest.category}</span>
                                {interest.subcategory && (
                                  <>
                                    <span className="mx-1">•</span>
                                    <span className="capitalize">{interest.subcategory}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {interest.details && (
                            <p className="text-sm text-gray-600 mb-2">{interest.details}</p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
              
              {/* Uncategorized Interests */}
              {childInterests.uncategorized.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="flex items-center font-medium text-lg text-gray-600">
                      <Info size={18} className="mr-2 text-gray-500" />
                      Uncategorized Interests
                    </h3>
                    <span className="text-gray-500 text-sm">
                      {childInterests.uncategorized.length} interests to be ranked
                    </span>
                  </div>
                  
                  <div className="bg-yellow-50 p-3 rounded-lg mb-4 flex items-center text-sm">
                    <Info size={16} className="text-yellow-600 mr-2 flex-shrink-0" />
                    <p className="text-yellow-800">
                      These interests haven't been ranked yet. Run a quick survey to organize them into preference tiers.
                    </p>
                    <button
                      onClick={startNewSurvey}
                      className="ml-auto px-3 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                    >
                      Start Survey
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {childInterests.uncategorized
                      .filter(interest => activeCategory === 'all' || interest.category === activeCategory)
                      .map(interest => (
                        <div 
                          key={interest.id}
                          className="border border-gray-200 rounded-lg p-3 hover:border-yellow-400 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start mb-2">
                            <div className={`rounded-full p-2 mr-2 ${getCategoryColor(interest.category)}`}>
                              {getCategoryIcon(interest.category)}
                            </div>
                            
                            <div className="flex-grow">
                              <h4 className="font-medium">{interest.name}</h4>
                              <div className="flex items-center text-xs text-gray-500">
                                <span className="capitalize">{interest.category}</span>
                                {interest.subcategory && (
                                  <>
                                    <span className="mx-1">•</span>
                                    <span className="capitalize">{interest.subcategory}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {interest.details && (
                            <p className="text-sm text-gray-600 mb-2">{interest.details}</p>
                          )}
                          
                          {/* Tags for specific details */}
                          {interest.specifics && Object.keys(interest.specifics).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {Object.entries(interest.specifics).map(([key, value]) => (
                                <span 
                                  key={key} 
                                  className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
                                >
                                  {value}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Personalized Insights */}
          {recommendations.insights && recommendations.insights.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="flex items-center font-medium text-lg text-indigo-700">
                  <Sparkles size={18} className="mr-2 text-indigo-500" />
                  Personalized Insights
                </h3>
                <span className="text-gray-500 text-sm">
                  Based on {interests.length} interests
                </span>
              </div>
              
              <div className="space-y-4">
                {recommendations.insights.map((insight, index) => (
                  <div 
                    key={`insight_${index}`} 
                    className="bg-indigo-50 p-4 rounded-lg border border-indigo-100"
                  >
                    <h4 className="font-medium text-indigo-800 mb-1">{insight.title}</h4>
                    <p className="text-sm text-indigo-700">{insight.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Gift Recommendations */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="flex items-center font-medium text-lg">
                <ShoppingBag size={18} className="mr-2 text-green-600" />
                Gift Recommendations
              </h3>
              <button className="text-blue-600 text-sm hover:text-blue-800 flex items-center">
                <PlusCircle size={14} className="mr-1" />
                Add Gift Idea
              </button>
            </div>
            
            {recommendations.gifts && recommendations.gifts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recommendations.gifts.map(gift => (
                  <div 
                    key={gift.id}
                    className="border border-green-200 rounded-lg p-3 hover:border-green-400 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start">
                      <div className={`rounded-full p-2 mr-2 bg-green-100 text-green-700`}>
                        <ShoppingBag size={14} />
                      </div>
                      
                      <div className="flex-grow">
                        <h4 className="font-medium">{gift.title}</h4>
                        <p className="text-sm text-gray-600 mb-1">{gift.description}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            {gift.priceRange}
                          </span>
                          {gift.brand && (
                            <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                              {gift.brand}
                            </span>
                          )}
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full capitalize">
                            {gift.categoryMatch}
                          </span>
                          {gift.specifics?.platform && (
                            <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">
                              {gift.specifics.platform}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                <ShoppingBag size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-gray-500 mb-2">No gift recommendations yet</p>
                <p className="text-gray-400 text-sm">
                  Complete a survey to get personalized gift ideas
                </p>
                <button
                  onClick={startNewSurvey}
                  className="mt-3 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md text-sm hover:from-purple-700 hover:to-indigo-700 font-medium shadow flex items-center mx-auto"
                >
                  <Zap size={14} className="mr-2" />
                  Start Kid Survey
                </button>
              </div>
            )}
          </div>
          
          {/* Activities Recommendations */}
          {recommendations.activities && recommendations.activities.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="flex items-center font-medium text-lg">
                  <Zap size={18} className="mr-2 text-orange-500" />
                  Activity Ideas
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {recommendations.activities.map(activity => (
                  <div 
                    key={activity.id}
                    className="border border-orange-200 rounded-lg p-3 hover:border-orange-400 hover:shadow-sm transition-all"
                  >
                    <h4 className="font-medium">{activity.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                        {activity.difficulty}
                      </span>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {activity.timeEstimate}
                      </span>
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                        Ages {activity.ageRange}
                      </span>
                      {activity.brand && (
                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                          {activity.brand}
                        </span>
                      )}
                      {activity.platform && (
                        <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">
                          {activity.platform}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Gift Occasions */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="flex items-center font-medium text-lg">
                <Calendar size={18} className="mr-2 text-gray-600" />
                Upcoming Gift Occasions
              </h3>
              <button className="text-blue-600 text-sm hover:text-blue-800 flex items-center">
                <PlusCircle size={14} className="mr-1" />
                Add Occasion
              </button>
            </div>
            
            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
              <Calendar size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-gray-500 mb-2">No upcoming gift occasions</p>
              <p className="text-gray-400 text-sm">
                Add birthdays, holidays, and special events to get gift reminders
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Survey Modal */}
      {showSurveyModal && surveyPairs.length > 0 && (
        <InterestSurveyModal
          interestPairs={surveyPairs}
          onComplete={handleSurveyComplete}
          onCancel={() => setShowSurveyModal(false)}
          childName={getChildName(activeChild)}
          childId={activeChild}
          questionPrompts={surveyPrompts}
        />
      )}
      
      {/* Quick survey button - fixed position */}
      <div className="fixed bottom-24 right-4 z-10">
        <button
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-full shadow-lg flex items-center space-x-2 transition-all transform hover:scale-105"
          onClick={startNewSurvey}
          disabled={loading}
        >
          <Zap size={18} className="mr-2" />
          <span>Start Kid Survey</span>
        </button>
      </div>
      
      {/* New Interest Modal */}
      {newInterestModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Add New Interest</h3>
              <button 
                onClick={() => setNewInterestModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const interestData = {
                name: formData.get('name'),
                category: formData.get('category'),
                subcategory: formData.get('subcategory') || null,
                details: formData.get('details') || '',
                specifics: {}
              };
              
              // Handle specifics based on category
              if (formData.get('category') === 'videogames' && formData.get('specificGame')) {
                interestData.specifics.title = formData.get('specificGame');
              }
              
              if (formData.get('category') === 'videogames' && formData.get('platform')) {
                interestData.specifics.platform = formData.get('platform');
              }
              
              handleAddNewInterest(interestData);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Interest Name*</label>
                  <input 
                    type="text" 
                    name="name"
                    required
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="e.g., LEGO, Dinosaurs, Video Games"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Category*</label>
                  <select 
                    name="category" 
                    required
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">-- Select Category --</option>
                    {interestCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Subcategory</label>
                  <input 
                    type="text" 
                    name="subcategory"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Building Sets, Board Games"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Details</label>
                  <textarea 
                    name="details"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    rows="3"
                    placeholder="Any specific details about this interest..."
                  ></textarea>
                </div>
                
                {/* Dynamic fields based on category */}
                <div className="category-specific-fields">
                  {/* Video Games specific fields */}
                  <div className="hidden video-games-fields">
                    <div className="mb-3">
                      <label className="block text-sm font-medium mb-1">Specific Game</label>
                      <input 
                        type="text" 
                        name="specificGame"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="e.g., Minecraft, Mario Kart"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Platform</label>
                      <select 
                        name="platform"
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">-- Select Platform --</option>
                        <option value="Nintendo Switch">Nintendo Switch</option>
                        <option value="PlayStation">PlayStation</option>
                        <option value="Xbox">Xbox</option>
                        <option value="PC">PC</option>
                        <option value="Mobile">Mobile</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setNewInterestModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Interest
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KidsInterestsTab;
import React, { useState, useEffect } from 'react';
import { 
  Calendar, ChevronDown, ChevronUp, Clock, 
  Heart, AlertCircle, BookOpen, Activity, 
  Users, Cake, Star, Clipboard, Utensils, Gift,
  PlusCircle, Edit, Trash2, CheckCircle, Camera,
  MessageCircle, BarChart2, Filter, Info, Brain
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../services/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import DatabaseService from '../../../services/DatabaseService';

const ChildrenTrackingTab = () => {
  const { 
    selectedUser, 
    familyMembers,
    familyId,
    currentWeek
  } = useFamily();

  // State for expandable sections
  const [expandedSections, setExpandedSections] = useState({
    medical: true,
    growth: true,
    routines: false,
    homework: false,
    activities: false,
    emotional: false,
    meals: false,
    events: false,
    milestones: false
  });

  // State for children's data
  const [childrenData, setChildrenData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeMedicalAppointment, setActiveMedicalAppointment] = useState(null);
  const [activeChild, setActiveChild] = useState(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    title: '',
    date: '',
    time: '',
    doctor: '',
    notes: '',
    childId: '',
    completed: false
  });
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    date: '',
    description: '',
    childId: '',
    type: 'achievement' // achievement, growth, other
  });
  const [growthForm, setGrowthForm] = useState({
    height: '',
    weight: '',
    shoeSize: '',
    clothingSize: '',
    date: '',
    childId: ''
  });
  const [showGrowthModal, setShowGrowthModal] = useState(false);
  const [aiInsights, setAiInsights] = useState([]);
  
  // Fetch children's data on component mount
  useEffect(() => {
    const loadChildrenData = async () => {
      try {
        if (!familyId) return;
        
        setLoading(true);
        console.log("Loading children data...");
        
        const docRef = doc(db, "families", familyId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const familyData = docSnap.data();
          
          // Check if we have children data structure, if not create it
          if (!familyData.childrenData) {
            // Initialize empty children data structure
            const initialChildrenData = {};
            
            // Create entry for each child in the family
            familyMembers
              .filter(member => member.role === 'child')
              .forEach(child => {
                initialChildrenData[child.id] = {
                  medicalAppointments: [],
                  growthData: [],
                  routines: [],
                  homework: [],
                  activities: [],
                  emotional: [],
                  meals: {
                    allergies: [],
                    preferences: [],
                    mealPlans: []
                  },
                  events: [],
                  milestones: []
                };
              });
            
            // Save initial structure to Firebase
            await updateDoc(docRef, {
              childrenData: initialChildrenData
            });
            
            setChildrenData(initialChildrenData);
          } else {
            setChildrenData(familyData.childrenData);
          }
          
          // Generate AI insights based on the children data
          if (familyData.childrenData) {
            generateAiInsights(familyData.childrenData);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading children data:", error);
        setLoading(false);
      }
    };
    
    loadChildrenData();
  }, [familyId, familyMembers]);
  
  // Generate AI insights for children data
  const generateAiInsights = (data) => {
    // In a real implementation, this would call AllieAIEngineService
    // For now, generate some sample insights
    const insights = [
      {
        type: "medical",
        title: "Upcoming Medical Appointments",
        content: "Sarah has a dental checkup in 2 weeks. Make sure to schedule Emma's annual physical - it's been almost a year.",
        priority: "medium"
      },
      {
        type: "growth",
        title: "Growth Milestone Alert",
        content: "Based on Emma's growth data, she may need new shoes soon. Her last recorded size was from 3 months ago.",
        priority: "low"
      },
      {
        type: "emotional",
        title: "Emotional Well-being Patterns",
        content: "Sarah has reported feeling tired more frequently in the past two weeks. Consider checking in about her sleep schedule.",
        priority: "high"
      }
    ];
    
    setAiInsights(insights);
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Handle opening the appointment modal for a specific child
  const handleAddAppointment = (childId) => {
    setAppointmentForm({
      title: '',
      date: '',
      time: '',
      doctor: '',
      notes: '',
      childId: childId,
      completed: false
    });
    setActiveMedicalAppointment(null);
    setShowAppointmentModal(true);
  };
  
  // Handle form submission for new medical appointment
  const handleAppointmentSubmit = async () => {
    try {
      // Validate form
      if (!appointmentForm.title || !appointmentForm.date) {
        alert("Please fill in title and date");
        return;
      }
      
      // Format appointment data
      const appointmentData = {
        ...appointmentForm,
        id: activeMedicalAppointment ? activeMedicalAppointment.id : Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      
      // Update local state
      const updatedData = {...childrenData};
      
      if (activeMedicalAppointment) {
        // Update existing appointment
        const appointmentIndex = updatedData[appointmentForm.childId].medicalAppointments.findIndex(
          app => app.id === activeMedicalAppointment.id
        );
        
        if (appointmentIndex !== -1) {
          updatedData[appointmentForm.childId].medicalAppointments[appointmentIndex] = appointmentData;
        }
      } else {
        // Add new appointment
        if (!updatedData[appointmentForm.childId].medicalAppointments) {
          updatedData[appointmentForm.childId].medicalAppointments = [];
        }
        
        updatedData[appointmentForm.childId].medicalAppointments.push(appointmentData);
      }
      
      // Update state and save to Firebase
      setChildrenData(updatedData);
      
      // Save to Firebase
      const docRef = doc(db, "families", familyId);
      await updateDoc(docRef, {
        [`childrenData.${appointmentForm.childId}.medicalAppointments`]: updatedData[appointmentForm.childId].medicalAppointments
      });
      
      // Close modal
      setShowAppointmentModal(false);
      
    } catch (error) {
      console.error("Error saving appointment:", error);
      alert("Failed to save appointment. Please try again.");
    }
  };
  
  // Handle opening the milestone modal for a specific child
  const handleAddMilestone = (childId) => {
    setMilestoneForm({
      title: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      childId: childId,
      type: 'achievement'
    });
    setShowMilestoneModal(true);
  };
  
  // Handle milestone form submission
  const handleMilestoneSubmit = async () => {
    try {
      // Validate form
      if (!milestoneForm.title || !milestoneForm.date) {
        alert("Please fill in title and date");
        return;
      }
      
      // Format milestone data
      const milestoneData = {
        ...milestoneForm,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      
      // Update local state
      const updatedData = {...childrenData};
      
      if (!updatedData[milestoneForm.childId].milestones) {
        updatedData[milestoneForm.childId].milestones = [];
      }
      
      updatedData[milestoneForm.childId].milestones.push(milestoneData);
      
      // Update state and save to Firebase
      setChildrenData(updatedData);
      
      // Save to Firebase
      const docRef = doc(db, "families", familyId);
      await updateDoc(docRef, {
        [`childrenData.${milestoneForm.childId}.milestones`]: updatedData[milestoneForm.childId].milestones
      });
      
      // Close modal
      setShowMilestoneModal(false);
      
    } catch (error) {
      console.error("Error saving milestone:", error);
      alert("Failed to save milestone. Please try again.");
    }
  };
  
  // Handle opening the growth data modal for a specific child
  const handleAddGrowthData = (childId) => {
    setGrowthForm({
      height: '',
      weight: '',
      shoeSize: '',
      clothingSize: '',
      date: new Date().toISOString().split('T')[0],
      childId: childId
    });
    setShowGrowthModal(true);
  };
  
  // Handle growth form submission
  const handleGrowthSubmit = async () => {
    try {
      // Validate form - at least one field should be filled
      if (!growthForm.height && !growthForm.weight && !growthForm.shoeSize && !growthForm.clothingSize) {
        alert("Please fill in at least one measurement");
        return;
      }
      
      // Format growth data
      const growthData = {
        ...growthForm,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      
      // Update local state
      const updatedData = {...childrenData};
      
      if (!updatedData[growthForm.childId].growthData) {
        updatedData[growthForm.childId].growthData = [];
      }
      
      updatedData[growthForm.childId].growthData.push(growthData);
      
      // Update state and save to Firebase
      setChildrenData(updatedData);
      
      // Save to Firebase
      const docRef = doc(db, "families", familyId);
      await updateDoc(docRef, {
        [`childrenData.${growthForm.childId}.growthData`]: updatedData[growthForm.childId].growthData
      });
      
      // Close modal
      setShowGrowthModal(false);
      
    } catch (error) {
      console.error("Error saving growth data:", error);
      alert("Failed to save growth data. Please try again.");
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Not scheduled";
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get child's name by ID
  const getChildName = (childId) => {
    const child = familyMembers.find(member => member.id === childId);
    return child ? child.name : "Unknown Child";
  };
  
  // Get child's profile picture
  const getChildProfilePicture = (childId) => {
    const child = familyMembers.find(member => member.id === childId);
    return child && child.profilePicture ? child.profilePicture : '/api/placeholder/48/48';
  };

  // Render section header with expand/collapse functionality
  const renderSectionHeader = (title, sectionKey, icon, notificationCount = 0) => (
    <div className="border-l-4 border-black p-4 flex justify-between items-center cursor-pointer bg-white rounded-lg shadow-sm mb-2" 
         onClick={() => toggleSection(sectionKey)}>
      <div className="flex items-center">
        {icon}
        <h4 className="font-medium text-lg font-roboto ml-2">{title}</h4>
        {notificationCount > 0 && (
          <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full font-roboto">
            {notificationCount}
          </span>
        )}
      </div>
      <button className="p-2 rounded-full hover:bg-gray-100">
        {expandedSections[sectionKey] ? 
          <ChevronUp size={20} className="text-gray-400" /> : 
          <ChevronDown size={20} className="text-gray-400" />
        }
      </button>
    </div>
  );
  
  // Render children selection tabs
  const renderChildrenTabs = () => {
    const children = familyMembers.filter(member => member.role === 'child');
    
    if (children.length === 0) {
      return (
        <div className="text-center p-4 bg-gray-50 rounded-lg mb-4">
          <p className="text-gray-500 font-roboto">No children added to your family yet</p>
        </div>
      );
    }
    
    return (
      <div className="mb-6">
        <div className="flex space-x-2 overflow-x-auto pb-1">
          {children.map(child => (
            <button
              key={child.id}
              className={`px-4 py-2 rounded-full flex items-center whitespace-nowrap ${
                activeChild === child.id ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => setActiveChild(child.id)}
            >
              <div className="w-6 h-6 rounded-full overflow-hidden mr-2">
                <img 
                  src={child.profilePicture || '/api/placeholder/24/24'} 
                  alt={child.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-roboto">{child.name}</span>
            </button>
          ))}
          
          <button
            className="px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center whitespace-nowrap"
            onClick={() => setActiveChild(null)}
          >
            <Users size={16} className="mr-2" />
            <span className="font-roboto">All Children</span>
          </button>
        </div>
      </div>
    );
  };
  
  // Render AI insights section
  const renderAiInsights = () => {
    if (aiInsights.length === 0) return null;
    
    return (
      <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center mb-3">
          <Brain size={20} className="text-black mr-2" />
          <h3 className="font-medium font-roboto">Allie AI Insights</h3>
        </div>
        
        <div className="space-y-3">
          {aiInsights.map((insight, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-lg border ${
                insight.priority === 'high' ? 'border-red-200 bg-red-50' :
                insight.priority === 'medium' ? 'border-amber-200 bg-amber-50' :
                'border-blue-200 bg-blue-50'
              }`}
            >
              <h4 className="font-medium text-sm font-roboto">{insight.title}</h4>
              <p className="text-sm font-roboto mt-1">{insight.content}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Child component for displaying a medical appointment card
  const AppointmentCard = ({ appointment, childId }) => {
    return (
      <div className={`border rounded-lg p-3 mb-3 ${
        appointment.completed ? 'bg-green-50' : new Date(appointment.date) < new Date() ? 'bg-amber-50' : 'bg-white'
      }`}>
        <div className="flex justify-between">
          <div>
            <h5 className="font-medium font-roboto">{appointment.title}</h5>
            <p className="text-sm text-gray-600 font-roboto">
              Date: {formatDate(appointment.date)} {appointment.time && `at ${appointment.time}`}
            </p>
            {appointment.doctor && (
              <p className="text-sm text-gray-600 font-roboto">Doctor: {appointment.doctor}</p>
            )}
          </div>
          <div className="flex space-x-2">
            <button 
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              onClick={() => {
                setAppointmentForm({...appointment, childId});
                setActiveMedicalAppointment(appointment);
                setShowAppointmentModal(true);
              }}
            >
              <Edit size={16} />
            </button>
            {!appointment.completed && (
              <button 
                className="p-1 text-green-600 hover:bg-green-50 rounded"
                onClick={async () => {
                  try {
                    // Update appointment as completed
                    const updatedData = {...childrenData};
                    const appointmentIndex = updatedData[childId].medicalAppointments.findIndex(
                      app => app.id === appointment.id
                    );
                    
                    if (appointmentIndex !== -1) {
                      updatedData[childId].medicalAppointments[appointmentIndex].completed = true;
                      
                      // Update state
                      setChildrenData(updatedData);
                      
                      // Save to Firebase
                      const docRef = doc(db, "families", familyId);
                      await updateDoc(docRef, {
                        [`childrenData.${childId}.medicalAppointments`]: updatedData[childId].medicalAppointments
                      });
                    }
                  } catch (error) {
                    console.error("Error marking appointment as completed:", error);
                  }
                }}
              >
                <CheckCircle size={16} />
              </button>
            )}
          </div>
        </div>
        {appointment.notes && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-roboto">
            <p>{appointment.notes}</p>
          </div>
        )}
        {appointment.completed && (
          <div className="mt-2 flex items-center text-sm text-green-600 font-roboto">
            <CheckCircle size={14} className="mr-1" />
            Completed
          </div>
        )}
      </div>
    );
  };
  
  // Child component for displaying a milestone card
  const MilestoneCard = ({ milestone, childId }) => {
    return (
      <div className="border rounded-lg p-3 mb-3 bg-white">
        <div className="flex justify-between">
          <div>
            <div className="flex items-center">
              {milestone.type === 'achievement' && <Star size={16} className="text-amber-500 mr-1" />}
              {milestone.type === 'growth' && <Activity size={16} className="text-green-500 mr-1" />}
              {milestone.type === 'other' && <Cake size={16} className="text-purple-500 mr-1" />}
              <h5 className="font-medium font-roboto">{milestone.title}</h5>
            </div>
            <p className="text-sm text-gray-600 font-roboto">
              Date: {formatDate(milestone.date)}
            </p>
          </div>
          <div className="flex space-x-2">
            <button 
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              onClick={() => {
                // Edit milestone - not implemented yet
              }}
            >
              <Edit size={16} />
            </button>
          </div>
        </div>
        {milestone.description && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-roboto">
            <p>{milestone.description}</p>
          </div>
        )}
      </div>
    );
  };
  
  // Child component for displaying a growth measurement card
  const GrowthCard = ({ growth, childId }) => {
    return (
      <div className="border rounded-lg p-3 mb-3 bg-white">
        <div className="flex justify-between">
          <div>
            <h5 className="font-medium font-roboto">Growth Measurement</h5>
            <p className="text-sm text-gray-600 font-roboto">
              Date: {formatDate(growth.date)}
            </p>
          </div>
          <div className="flex space-x-2">
            <button 
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              onClick={() => {
                // Edit growth data - not implemented yet
              }}
            >
              <Edit size={16} />
            </button>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {growth.height && (
            <div className="p-2 bg-gray-50 rounded text-sm">
              <span className="font-medium font-roboto">Height:</span> <span className="font-roboto">{growth.height}</span>
            </div>
          )}
          {growth.weight && (
            <div className="p-2 bg-gray-50 rounded text-sm">
              <span className="font-medium font-roboto">Weight:</span> <span className="font-roboto">{growth.weight}</span>
            </div>
          )}
          {growth.shoeSize && (
            <div className="p-2 bg-gray-50 rounded text-sm">
              <span className="font-medium font-roboto">Shoe Size:</span> <span className="font-roboto">{growth.shoeSize}</span>
            </div>
          )}
          {growth.clothingSize && (
            <div className="p-2 bg-gray-50 rounded text-sm">
              <span className="font-medium font-roboto">Clothing Size:</span> <span className="font-roboto">{growth.clothingSize}</span>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Render the medical appointments section
  const renderMedicalSection = () => {
    const children = familyMembers.filter(member => member.role === 'child');
    
    if (children.length === 0) {
      return (
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-500 font-roboto">No children added to your family yet</p>
        </div>
      );
    }
    
    const filteredChildren = activeChild ? children.filter(child => child.id === activeChild) : children;
    
    return (
      <div className="space-y-4">
        {filteredChildren.map(child => (
          <div key={child.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                  <img 
                    src={child.profilePicture || '/api/placeholder/32/32'} 
                    alt={child.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h5 className="font-medium font-roboto">{child.name}'s Medical Appointments</h5>
              </div>
              <button 
                className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 font-roboto flex items-center"
                onClick={() => handleAddAppointment(child.id)}
              >
                <PlusCircle size={14} className="mr-1" />
                Add Appointment
              </button>
            </div>
            
            <div className="space-y-2">
              {childrenData[child.id]?.medicalAppointments?.length > 0 ? (
                childrenData[child.id].medicalAppointments
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map(appointment => (
                    <AppointmentCard 
                      key={appointment.id} 
                      appointment={appointment} 
                      childId={child.id} 
                    />
                  ))
              ) : (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 font-roboto">No medical appointments added yet</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render the growth & development section
  const renderGrowthSection = () => {
    const children = familyMembers.filter(member => member.role === 'child');
    
    if (children.length === 0) {
      return (
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-500 font-roboto">No children added to your family yet</p>
        </div>
      );
    }
    
    const filteredChildren = activeChild ? children.filter(child => child.id === activeChild) : children;
    
    return (
      <div className="space-y-6">
        {filteredChildren.map(child => (
          <div key={child.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                  <img 
                    src={child.profilePicture || '/api/placeholder/32/32'} 
                    alt={child.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h5 className="font-medium font-roboto">{child.name}'s Growth & Development</h5>
              </div>
              <div className="flex space-x-2">
                <button 
                  className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 font-roboto flex items-center"
                  onClick={() => handleAddGrowthData(child.id)}
                >
                  <PlusCircle size={14} className="mr-1" />
                  Add Measurement
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Latest measurements */}
              <div>
                <h6 className="text-sm font-medium font-roboto mb-2">Latest Measurements</h6>
                {childrenData[child.id]?.growthData?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {childrenData[child.id].growthData
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .slice(0, 1)
                      .map(growth => (
                        <GrowthCard key={growth.id} growth={growth} childId={child.id} />
                      ))}
                    
                    {/* Growth chart placeholder */}
                    <div className="border rounded-lg p-3 h-40 flex items-center justify-center bg-gray-50">
                      <div className="text-center">
                        <BarChart2 size={24} className="mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500 font-roboto">Growth chart will appear here</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 font-roboto">No growth measurements added yet</p>
                  </div>
                )}
              </div>
              
              {/* Historical measurements */}
              {childrenData[child.id]?.growthData?.length > 1 && (
                <div>
                  <h6 className="text-sm font-medium font-roboto mb-2">History</h6>
                  <div className="space-y-2">
                    {childrenData[child.id].growthData
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .slice(1)
                      .map(growth => (
                        <GrowthCard key={growth.id} growth={growth} childId={child.id} />
                      ))}
                  </div>
                </div>
              )}
              
              {/* Clothing & shoe sizes */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h6 className="text-sm font-medium font-roboto mb-2">Current Sizes</h6>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-white rounded border">
                    <span className="text-sm font-medium font-roboto">Clothing Size:</span>
                    <span className="text-sm ml-1 font-roboto">
                      {childrenData[child.id]?.growthData?.length > 0 
                        ? childrenData[child.id].growthData
                            .filter(g => g.clothingSize)
                            .sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.clothingSize || 'Not recorded'
                        : 'Not recorded'}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <span className="text-sm font-medium font-roboto">Shoe Size:</span>
                    <span className="text-sm ml-1 font-roboto">
                      {childrenData[child.id]?.growthData?.length > 0 
                        ? childrenData[child.id].growthData
                            .filter(g => g.shoeSize)
                            .sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.shoeSize || 'Not recorded'
                        : 'Not recorded'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render the milestones section
  const renderMilestonesSection = () => {
    const children = familyMembers.filter(member => member.role === 'child');
    
    if (children.length === 0) {
      return (
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-500 font-roboto">No children added to your family yet</p>
        </div>
      );
    }
    
    const filteredChildren = activeChild ? children.filter(child => child.id === activeChild) : children;
    
    return (
      <div className="space-y-6">
        {filteredChildren.map(child => (
          <div key={child.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                  <img 
                    src={child.profilePicture || '/api/placeholder/32/32'} 
                    alt={child.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h5 className="font-medium font-roboto">{child.name}'s Milestones & Memories</h5>
              </div>
              <button 
                className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 font-roboto flex items-center"
                onClick={() => handleAddMilestone(child.id)}
              >
                <PlusCircle size={14} className="mr-1" />
                Add Milestone
              </button>
            </div>
            
            {childrenData[child.id]?.milestones?.length > 0 ? (
              <div className="space-y-2">
                {childrenData[child.id].milestones
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map(milestone => (
                    <MilestoneCard 
                      key={milestone.id} 
                      milestone={milestone} 
                      childId={child.id} 
                    />
                  ))}
              </div>
            ) : (
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-500 font-roboto">No milestones added yet</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };
  
  // Render a placeholder for sections not yet implemented
  const renderPlaceholderSection = (title) => {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="mb-4">
          <Info size={36} className="mx-auto text-gray-400" />
        </div>
        <h3 className="text-lg font-medium mb-2 font-roboto">{title} Coming Soon</h3>
        <p className="text-gray-500 font-roboto">
          This feature is currently in development and will be available soon.
        </p>
      </div>
    );
  };

  // If loading, show a loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start mb-6">
          <div className="mr-4 flex-shrink-0">
            <Users size={32} className="text-black" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2 font-roboto">Children Tracking Center</h3>
            <p className="text-gray-600 font-roboto">
              Keep track of everything related to your children in one place - from medical appointments 
              to growth milestones, school activities and more. This helps you coordinate caring responsibilities 
              and ensures nothing important is overlooked.
            </p>
          </div>
        </div>
        
        {/* Children selection tabs */}
        {renderChildrenTabs()}
        
        {/* AI Insights section */}
        {renderAiInsights()}
      </div>

      {/* Medical Appointments Section */}
      {renderSectionHeader("Medical & Health Appointments", "medical", <Activity size={20} className="text-black" />)}
      {expandedSections.medical && renderMedicalSection()}
      
      {/* Growth & Development Section */}
      {renderSectionHeader("Growth & Development Tracking", "growth", <Activity size={20} className="text-black" />)}
      {expandedSections.growth && renderGrowthSection()}
      
      {/* Daily Routines Section */}
      {renderSectionHeader("Daily Routines & Schedules", "routines", <Clock size={20} className="text-black" />)}
      {expandedSections.routines && renderPlaceholderSection("Daily Routines Tracking")}
      
      {/* Homework & Academic Section */}
      {renderSectionHeader("Homework & Academic Tracking", "homework", <BookOpen size={20} className="text-black" />)}
      {expandedSections.homework && renderPlaceholderSection("Homework Tracking")}
      
      {/* Activities Section */}
      {renderSectionHeader("Social & Extracurricular Activities", "activities", <Users size={20} className="text-black" />)}
      {expandedSections.activities && renderPlaceholderSection("Activities Tracking")}
      
      {/* Emotional Section */}
      {renderSectionHeader("Emotional & Behavioral Check-Ins", "emotional", <Heart size={20} className="text-black" />)}
      {expandedSections.emotional && renderPlaceholderSection("Emotional Check-Ins")}
      
      {/* Meal Planning Section */}
      {renderSectionHeader("Meal Planning & Dietary Needs", "meals", <Utensils size={20} className="text-black" />)}
      {expandedSections.meals && renderPlaceholderSection("Meal Planning")}
      
      {/* Special Events Section */}
      {renderSectionHeader("Family Calendar & Special Events", "events", <Calendar size={20} className="text-black" />)}
      {expandedSections.events && renderPlaceholderSection("Special Events")}
      
      {/* Milestones Section */}
      {renderSectionHeader("Milestone Memories & Celebrations", "milestones", <Cake size={20} className="text-black" />)}
      {expandedSections.milestones && renderMilestonesSection()}
      
      {/* Medical Appointment Modal */}
      {showAppointmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4 font-roboto">
              {activeMedicalAppointment ? 'Edit Appointment' : 'Add Medical Appointment'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">Title/Type</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="e.g., Annual Check-up, Dental Visit"
                  value={appointmentForm.title}
                  onChange={(e) => setAppointmentForm({...appointmentForm, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">Date</label>
                <input 
                  type="date" 
                  className="w-full p-2 border rounded font-roboto"
                  value={appointmentForm.date}
                  onChange={(e) => setAppointmentForm({...appointmentForm, date: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">Time (optional)</label>
                <input 
                  type="time" 
                  className="w-full p-2 border rounded font-roboto"
                  value={appointmentForm.time}
                  onChange={(e) => setAppointmentForm({...appointmentForm, time: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">Doctor/Provider (optional)</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="e.g., Dr. Smith"
                  value={appointmentForm.doctor}
                  onChange={(e) => setAppointmentForm({...appointmentForm, doctor: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">Notes (optional)</label>
                <textarea 
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="Any special instructions or things to remember..."
                  rows="3"
                  value={appointmentForm.notes}
                  onChange={(e) => setAppointmentForm({...appointmentForm, notes: e.target.value})}
                ></textarea>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="completed" 
                  className="mr-2"
                  checked={appointmentForm.completed}
                  onChange={(e) => setAppointmentForm({...appointmentForm, completed: e.target.checked})}
                />
                <label htmlFor="completed" className="text-sm text-gray-700 font-roboto">Mark as completed</label>
              </div>
            </div>
            
            <div className="flex justify-end mt-6 space-x-3">
              <button
                className="px-4 py-2 border rounded font-roboto"
                onClick={() => setShowAppointmentModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded font-roboto"
                onClick={handleAppointmentSubmit}
              >
                {activeMedicalAppointment ? 'Update' : 'Add'} Appointment
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Growth Data Modal */}
      {showGrowthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4 font-roboto">Add Growth Measurement</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">Date</label>
                <input 
                  type="date" 
                  className="w-full p-2 border rounded font-roboto"
                  value={growthForm.date}
                  onChange={(e) => setGrowthForm({...growthForm, date: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">Height</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="e.g., 3'5\" or 105 cm"
                  value={growthForm.height}
                  onChange={(e) => setGrowthForm({...growthForm, height: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">Weight</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="e.g., 42 lbs or 19 kg"
                  value={growthForm.weight}
                  onChange={(e) => setGrowthForm({...growthForm, weight: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">Shoe Size</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="e.g., 13C or EU 31"
                  value={growthForm.shoeSize}
                  onChange={(e) => setGrowthForm({...growthForm, shoeSize: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">Clothing Size</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="e.g., 5T or 6-7y"
                  value={growthForm.clothingSize}
                  onChange={(e) => setGrowthForm({...growthForm, clothingSize: e.target.value})}
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-6 space-x-3">
              <button
                className="px-4 py-2 border rounded font-roboto"
                onClick={() => setShowGrowthModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded font-roboto"
                onClick={handleGrowthSubmit}
              >
                Save Measurement
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Milestone Modal */}
      {showMilestoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4 font-roboto">Add Milestone or Memory</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">Title</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="e.g., First Steps, Lost Tooth"
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm({...milestoneForm, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">Date</label>
                <input 
                  type="date" 
                  className="w-full p-2 border rounded font-roboto"
                  value={milestoneForm.date}
                  onChange={(e) => setMilestoneForm({...milestoneForm, date: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">Type</label>
                <select 
                  className="w-full p-2 border rounded font-roboto"
                  value={milestoneForm.type}
                  onChange={(e) => setMilestoneForm({...milestoneForm, type: e.target.value})}
                >
                  <option value="achievement">Achievement</option>
                  <option value="growth">Growth Milestone</option>
                  <option value="other">Special Memory</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">Description (optional)</label>
                <textarea 
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="Describe this milestone or memory..."
                  rows="3"
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({...milestoneForm, description: e.target.value})}
                ></textarea>
              </div>
            </div>
            
            <div className="flex justify-end mt-6 space-x-3">
              <button
                className="px-4 py-2 border rounded font-roboto"
                onClick={() => setShowMilestoneModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded font-roboto"
                onClick={handleMilestoneSubmit}
              >
                Save Milestone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChildrenTrackingTab;
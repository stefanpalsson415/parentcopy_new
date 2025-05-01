import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Phone, Mail, MapPin, Search, Filter, Edit, 
  Trash2, Plus, X, List, Grid, RefreshCw, Save, Tag, 
  Heart, Music, Briefcase, Users, BookOpen, Star
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import UserAvatar from '../common/UserAvatar';


/**
 * Provider Directory Component
 * 
 * A searchable directory for family service providers like doctors, teachers, etc.
 * 
 * @param {Object} props
 * @param {string} props.familyId - The family ID
 * @param {Array} props.providers - Array of provider objects
 * @param {boolean} props.loadingProviders - Loading state
 * @param {Function} props.onAddProvider - Callback for adding a provider
 * @param {Function} props.onUpdateProvider - Callback for updating a provider
 * @param {Function} props.onDeleteProvider - Callback for deleting a provider
 */
const ProviderDirectory = ({
  familyId,
  providers = [],
  loadingProviders = false,
  onAddProvider,
  onUpdateProvider,
  onDeleteProvider,
  onClose
}) => {
  const { currentUser } = useAuth();
  const [viewMode, setViewMode] = useState('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'medical',
    specialty: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });
  
  const searchInputRef = useRef(null);
  
  // Provider categories/types
  const providerTypes = [
    { id: 'medical', name: 'Medical', icon: <Heart size={16} className="text-red-500" /> },
    { id: 'education', name: 'Education', icon: <BookOpen size={16} className="text-blue-500" /> },
    { id: 'activity', name: 'Activities', icon: <Music size={16} className="text-green-500" /> },
    { id: 'childcare', name: 'Childcare', icon: <Users size={16} className="text-purple-500" /> },
    { id: 'services', name: 'Services', icon: <Briefcase size={16} className="text-amber-500" /> },
    { id: 'other', name: 'Other', icon: <Star size={16} className="text-gray-500" /> }
  ];
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  
  // Handle view mode toggle
  const toggleViewMode = () => {
    setViewMode(viewMode === 'card' ? 'list' : 'card');
  };
  
  // Filter providers based on search and category
  const filteredProviders = providers.filter(provider => {
    // Filter by category
    if (categoryFilter !== 'all' && provider.type !== categoryFilter) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        provider.name?.toLowerCase().includes(query) ||
        provider.specialty?.toLowerCase().includes(query) ||
        provider.notes?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });


  // Set up event listeners for provider refresh
useEffect(() => {
  const handleDirectoryRefresh = () => {
    console.log("Directory refresh event received, reloading providers");
    // Force refresh by toggling search query
    setSearchQuery(prev => prev + " ");
    setSearchQuery(prev => prev.trim());
    
    // Force a UI refresh by dispatching a custom event
    window.dispatchEvent(new CustomEvent('force-data-refresh'));
  };
  
  // Listen for the refresh event
  window.addEventListener('directory-refresh-needed', handleDirectoryRefresh);
  window.addEventListener('provider-added', handleDirectoryRefresh);
  
  // Clean up
  return () => {
    window.removeEventListener('directory-refresh-needed', handleDirectoryRefresh);
    window.removeEventListener('provider-added', handleDirectoryRefresh);
  };
}, []);
  
  useEffect(() => {
    const handleProviderAdded = () => {
      console.log("Provider added event received in ProviderDirectory");
      
      // Check if this provider added event originated from this component
      if (window._handlingProviderRefresh) {
        console.log("Ignoring provider-added event since we're already handling a refresh");
        return;
      }
      
      // Set a flag to prevent recursive refreshes
      window._handlingProviderRefresh = true;
      
      // Force refresh of providers directly
      if (onAddProvider || familyId) {
        // If we have props for loading providers or an explicit reload function, use it
        if (typeof onAddProvider === 'function') {
          console.log("Refreshing providers via onAddProvider");
          // The parent component should reload providers
          window.dispatchEvent(new CustomEvent('load-providers', { detail: { familyId } }));
        }
        
        // Try to trigger reloads on parent components - but only do this once
        window.dispatchEvent(new CustomEvent('family-data-updated'));
        window.dispatchEvent(new CustomEvent('force-data-refresh'));
        
        // Force a component re-render by triggering state updates
        setTimeout(() => {
          console.log("Forcing directory refresh");
          // Force re-render by dispatching a specific event
          window.dispatchEvent(new CustomEvent('directory-refresh-needed'));
          
          // Clear the flag after completing refresh
          window._handlingProviderRefresh = false;
        }, 1000);
      } else {
        window._handlingProviderRefresh = false;
      }
    };
  
    // Listen for the custom event
    window.addEventListener('provider-added', handleProviderAdded);
    window.addEventListener('directory-refresh-needed', () => {
      // Force component redraw by updating a small piece of state
      setSearchQuery(prev => prev);
    });
    
    // Clean up
    return () => {
      window.removeEventListener('provider-added', handleProviderAdded);
      window.removeEventListener('directory-refresh-needed', () => {});
    };
  }, [familyId, onAddProvider]); // Add dependencies to avoid stale closures
  
  // Open add/edit modal
  const openProviderModal = (provider = null) => {
    if (provider) {
      setFormData({
        id: provider.id,
        name: provider.name || '',
        type: provider.type || 'medical',
        specialty: provider.specialty || '',
        phone: provider.phone || '',
        email: provider.email || '',
        address: provider.address || '',
        notes: provider.notes || ''
      });
      setEditingProvider(provider.id);
    } else {
      setFormData({
        name: '',
        type: 'medical',
        specialty: '',
        phone: '',
        email: '',
        address: '',
        notes: ''
      });
      setEditingProvider(null);
    }
    setShowAddModal(true);
  };
  
  // Close modal
  const closeModal = () => {
    setShowAddModal(false);
    setEditingProvider(null);
  };
  
  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      alert('Please enter a provider name');
      return;
    }
    
    if (editingProvider) {
      // Update existing provider
      if (onUpdateProvider) {
        await onUpdateProvider(formData);
      }
    } else {
      // Add new provider
      if (onAddProvider) {
        await onAddProvider(formData);
      }
    }
    
    // Close modal
    closeModal();
  };
  
  // Handle delete confirmation
  const confirmDelete = (provider) => {
    setProviderToDelete(provider);
    setShowDeleteConfirm(true);
  };
  
  // Handle actual deletion
  const handleDelete = async () => {
    if (providerToDelete && onDeleteProvider) {
      await onDeleteProvider(providerToDelete.id);
    }
    setShowDeleteConfirm(false);
    setProviderToDelete(null);
  };
  
  // Get provider type display info
  const getProviderTypeInfo = (typeId) => {
    return providerTypes.find(type => type.id === typeId) || providerTypes.find(type => type.id === 'other');
  };
  
  return (
    <div className="bg-white rounded-lg font-roboto">
      {/* Header with controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
  <div>
    <h3 className="text-lg font-medium font-roboto flex items-center">
      <User size={20} className="mr-2 text-purple-500" />
      Family Provider Directory
    </h3>
    <p className="text-sm text-gray-500 font-roboto">
      Manage your family's doctors, teachers, childcare, and service providers
    </p>
  </div>
  
  <div className="flex space-x-2 shrink-0">
    <button
      className="p-2 rounded-md hover:bg-gray-100"
      onClick={toggleViewMode}
      title={viewMode === 'card' ? 'Switch to list view' : 'Switch to card view'}
    >
      {viewMode === 'card' ? <List size={20} /> : <Grid size={20} />}
    </button>
    <button 
      className="p-2 rounded-md bg-black text-white hover:bg-gray-800"
      onClick={() => openProviderModal()}
    >
      <Plus size={20} />
    </button>
    {onClose && (
      <button 
        className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        onClick={onClose}
        title="Close"
      >
        <X size={20} />
      </button>
    )}
  </div>
</div>
      
      {/* Search and filters */}
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              ref={searchInputRef}
              value={searchQuery}
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Search providers..."
            />
            {searchQuery && (
              <button
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setSearchQuery('')}
              >
                <X size={16} className="text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-3 py-1 text-sm rounded-md ${
                categoryFilter === 'all' 
                  ? 'bg-black text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setCategoryFilter('all')}
            >
              All
            </button>
            
            {providerTypes.map(type => (
              <button
                key={type.id}
                className={`px-3 py-1 text-sm rounded-md flex items-center ${
                  categoryFilter === type.id 
                    ? 'bg-black text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setCategoryFilter(type.id)}
              >
                <span className="mr-1">{type.icon}</span>
                {type.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Provider list */}
      {loadingProviders ? (
        <div className="flex justify-center items-center py-20">
          <RefreshCw size={24} className="animate-spin text-gray-400" />
        </div>
      ) : filteredProviders.length > 0 ? (
        // Updated code for the provider card section in src/components/document/ProviderDirectory.jsx
// Replace the existing rendering of filteredProviders (around line 368) with this:

<div className={viewMode === 'card' 
  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" // Increased gap from 4 to 6
  : "space-y-3" // Increased from 2 to 3
}>
  {filteredProviders.map(provider => (
    <div 
      key={provider.id} 
      className={`border rounded-lg p-5 hover:bg-gray-50 ${
        viewMode === 'list' ? "flex items-center justify-between" : ""
      }`}
    >
      {viewMode === 'card' ? (
        <div>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center">
              {/* Add avatar for provider */}
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center mr-3 flex-shrink-0">
                {provider.profilePicture ? (
                  <img 
                    src={provider.profilePicture} 
                    alt={provider.name} 
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-purple-600 font-medium text-lg">
                    {provider.name?.charAt(0)?.toUpperCase() || getProviderTypeInfo(provider.type)?.icon || <User size={16} className="text-purple-500" />}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-medium text-md">{provider.name}</h3>
                <p className="text-sm text-gray-600">{provider.specialty}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => openProviderModal(provider)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                title="Edit"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => confirmDelete(provider)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          
          {/* Contact details with improved spacing */}
          <div className="space-y-2.5 text-sm text-gray-600 mt-4">
            {provider.phone && (
              <div className="flex items-center">
                <Phone size={14} className="mr-3 text-gray-400" />
                <a href={`tel:${provider.phone}`} className="hover:text-blue-600">
                  {provider.phone}
                </a>
              </div>
            )}
            {provider.email && (
              <div className="flex items-center">
                <Mail size={14} className="mr-3 text-gray-400" />
                <a href={`mailto:${provider.email}`} className="hover:text-blue-600 truncate">
                  {provider.email}
                </a>
              </div>
            )}
            {provider.address && (
              <div className="flex items-start">
                <MapPin size={14} className="mr-3 text-gray-400 mt-1 shrink-0" />
                <span>{provider.address}</span>
              </div>
            )}
          </div>
          
          {/* Notes */}
          {provider.notes && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-sm text-gray-600">{provider.notes}</p>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center">
            {/* Add avatar for provider in list view */}
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center mr-3 flex-shrink-0">
              {provider.profilePicture ? (
                <img 
                  src={provider.profilePicture} 
                  alt={provider.name} 
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span className="text-purple-600 font-medium text-lg">
                  {provider.name?.charAt(0)?.toUpperCase() || getProviderTypeInfo(provider.type)?.icon || <User size={16} className="text-purple-500" />}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-medium">{provider.name}</h3>
              <p className="text-sm text-gray-600">{provider.specialty}</p>
              {provider.phone && (
                <p className="text-sm text-gray-600">{provider.phone}</p>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => openProviderModal(provider)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
              title="Edit"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => confirmDelete(provider)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  ))}
</div>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <User size={40} className="text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 font-roboto mb-1">No providers found</p>
          <p className="text-sm text-gray-400 mb-4 font-roboto">
            {searchQuery || categoryFilter !== 'all' 
              ? 'Try changing your search or filters' 
              : 'Add your first provider to get started'}
          </p>
          {(!searchQuery && categoryFilter === 'all') && (
            <button
              onClick={() => openProviderModal()}
              className="px-4 py-2 bg-black text-white rounded-md font-roboto hover:bg-gray-800"
            >
              <Plus size={16} className="inline mr-1" />
              Add First Provider
            </button>
          )}
        </div>
      )}
      
      {/* Add/Edit Provider Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium font-roboto">
                {editingProvider ? 'Edit Provider' : 'Add New Provider'}
              </h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4">
              <div className="space-y-4">
                {/* Provider Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    Provider Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {providerTypes.map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, type: type.id }))}
                        className={`py-2 px-3 text-sm rounded-md flex items-center justify-center ${
                          formData.type === type.id 
                            ? 'bg-black text-white' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        <span className="mr-1">{type.icon}</span>
                        {type.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Provider Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    Provider Name*
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="e.g., Dr. Smith, ABC Music School"
                  />
                </div>
                
                {/* Specialty */}
                <div>
                  <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    Specialty/Role
                  </label>
                  <input
                    type="text"
                    id="specialty"
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="e.g., Pediatrician, Piano Teacher"
                  />
                </div>
                
                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="e.g., (555) 123-4567"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="e.g., doctor@example.com"
                    />
                  </div>
                </div>
                
                {/* Address */}
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    Address
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Full address"
                  />
                </div>
                
                {/* Notes */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Additional information, preferences, etc."
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800"
                >
                  <Save size={16} className="inline mr-1" />
                  {editingProvider ? 'Update Provider' : 'Add Provider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add this debug button to the header section of ProviderDirectory.jsx */}
<button
  className="p-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 text-xs"
onClick={() => {
  // Import and expose Firebase instances
  import('../../services/firebase').then(module => {
    // Expose the database for console testing
    window.db = module.db;
    window.auth = module.auth;
    window.familyId = familyId;

    // Log the exposed variables
    console.log("✅ DB REFERENCE:", window.db);
    console.log("✅ AUTH:", window.auth);
    console.log("✅ FAMILY ID:", window.familyId);
    
    // Create a message for the user
    alert("Firebase references exposed to window objects. Check console and run test.");
    
    // Run test directly if desired
    import('../../services/ProviderService').then(module => {
      const ProviderService = module.default;
      console.log("✅ ProviderService loaded:", ProviderService);
      
      // Run the test with the current family ID, and DON'T delete the provider after
      ProviderService.testDirectProviderCreation(window.familyId, false)
        .then(result => {
          console.log("✅ Test result:", result);
          if (result) {
            alert("Provider creation test successful! Check Firestore 'providers' collection!");
          } else {
            alert("Provider creation test failed. Check console for details.");
          }
        })
        .catch(err => {
          console.error("❌ Test execution error:", err);
          alert("Error running test. Check console for details.");
        });
    });
  }).catch(error => {
    console.error("Error loading Firebase modules:", error);
    alert("Failed to load Firebase modules. See console for details.");
  });
}}
>
  Debug: Test Provider Creation
</button>

<button
  className="p-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 text-xs"
  onClick={() => {
    // Import and expose Firebase instances
    import('../../services/firebase').then(module => {
      // Expose the database for console testing
      window.db = module.db;
      window.auth = module.auth;
      window.familyId = familyId;

      // Log the exposed variables
      console.log("✅ DB REFERENCE:", window.db);
      console.log("✅ AUTH:", window.auth);
      console.log("✅ FAMILY ID:", window.familyId);
      
      // Create a message for the user
      alert("Firebase references exposed to window objects. Check console and run test.");
      
      // Run test directly if desired
      import('../../services/ProviderService').then(module => {
        const ProviderService = module.default;
        console.log("✅ ProviderService loaded:", ProviderService);
        
        // Run the test with the current family ID, and DON'T delete the provider after
        ProviderService.testDirectProviderCreation(window.familyId, false)
          .then(result => {
            console.log("✅ Test result:", result);
            if (result) {
              alert("Provider creation test successful! Check Firestore 'providers' collection!");
            } else {
              alert("Provider creation test failed. Check console for details.");
            }
          })
          .catch(err => {
            console.error("❌ Test execution error:", err);
            alert("Error running test. Check console for details.");
          });
      });
    }).catch(error => {
      console.error("Error loading Firebase modules:", error);
      alert("Failed to load Firebase modules. See console for details.");
    });
  }}
>
  Debug: Test Provider Creation
</button>
// Add this debug button to the header section of ProviderDirectory.jsx
<button
  className="p-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 text-xs"
  onClick={() => {
    // Import and expose Firebase instances
    import('../../services/firebase').then(module => {
      // Expose the database for console testing
      window.db = module.db;
      window.auth = module.auth;
      window.familyId = familyId;

      // Log the exposed variables
      console.log("✅ DB REFERENCE:", window.db);
      console.log("✅ AUTH:", window.auth);
      console.log("✅ FAMILY ID:", window.familyId);
      
      // Create a message for the user
      alert("Firebase references exposed to window objects. Check console and run test.");
      
      // Create and add a test provider
      const { collection, addDoc, serverTimestamp } = require('firebase/firestore');
      
      const testProvider = {
        name: "Test Provider " + new Date().toTimeString().slice(0, 8),
        type: "medical",
        specialty: "Testing",
        familyId: familyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      addDoc(collection(window.db, "providers"), testProvider)
        .then(docRef => {
          console.log("✅ TEST PROVIDER ADDED:", docRef.id);
          alert("Test provider added! ID: " + docRef.id);
          
          // Force UI refresh
          window.dispatchEvent(new CustomEvent('provider-added'));
          setTimeout(() => window.dispatchEvent(new CustomEvent('directory-refresh-needed')), 500);
        })
        .catch(err => {
          console.error("❌ TEST PROVIDER FAILED:", err);
          alert("Test failed: " + err.message);
        });
    });
  }}
>
  Debug: Test Provider Creation
</button>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-3 font-roboto">Confirm Deletion</h3>
            <p className="mb-4 text-gray-600 font-roboto">
              Are you sure you want to delete <strong>{providerToDelete?.name}</strong>? 
              This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
              >
                Delete Provider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderDirectory;
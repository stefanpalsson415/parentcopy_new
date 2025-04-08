import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Users, LogOut } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import FamilyMemberCard from '../common/FamilyMemberCard';

const FamilySurveyDashboard = () => {
  const navigate = useNavigate();
  const { 
    familyMembers, 
    familyName, 
    selectFamilyMember 
  } = useFamily();
  const { logout } = useAuth();
  
  const handleSelectUser = (member) => {
    console.log("Selecting member in dashboard:", member);
    
    // For children, use a special approach to ensure proper routing
    if (member.role === 'child') {
      // IMPORTANT: Set localStorage FIRST
      localStorage.setItem('selectedUserId', member.id);
      
      // Update context
      selectFamilyMember(member);
      
      // Use a stronger approach for kid survey navigation
      console.log(`Navigating to kid survey for child: ${member.name}`);
      setTimeout(() => {
        window.location.href = '/kid-survey'; // Use direct location change instead of navigate
      }, 50);
      return;
    }
    
    // For adults, use the normal approach
    localStorage.setItem('selectedUserId', member.id);
    selectFamilyMember(member);
    
    // Navigate after a short delay to allow context to update
    setTimeout(() => {
      console.log(`Navigating to adult survey for: ${member.name}`);
      navigate('/survey');
    }, 100);
  };
  
  // Check completion status
  const completedMembers = familyMembers.filter(m => m.completed);
  const pendingMembers = familyMembers.filter(m => !m.completed);
  const allCompleted = pendingMembers.length === 0;
  const progress = Math.round((completedMembers.length / familyMembers.length) * 100);
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };
  
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-black text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold font-roboto">Allie</h1>
          <button 
            onClick={handleLogout}
            className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded flex items-center font-roboto"
          >
            <LogOut size={14} className="mr-1" />
            Switch User
          </button>
        </div>
      </header>
      
      <div className="flex-1 container mx-auto max-w-3xl px-4 py-8">
        {/* Family name heading */}
        <h1 className="text-3xl font-light mb-2 font-roboto text-center">The {familyName} Family</h1>
        
        {/* Status section */}
        <div className={`mt-8 p-6 rounded-lg ${allCompleted ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
          <div className="flex items-center justify-center mb-4">
            {allCompleted ? (
              <CheckCircle size={40} className="text-green-500" />
            ) : (
              <AlertCircle size={40} className="text-amber-500" />
            )}
          </div>
          
          <h2 className="text-xl font-bold mb-2 font-roboto text-center">
            {allCompleted   
              ? "All Surveys Completed!"   
              : `Family Survey Progress: ${progress}%`}
          </h2>
          
          <p className="text-gray-600 font-roboto text-center">
            {allCompleted  
              ? "Everyone has completed their initial survey. Your family is ready to start balancing responsibilities!"
              : `${completedMembers.length} of ${familyMembers.length} family members have completed the initial survey.`}
          </p>
        </div>
        
        {/* Family members grid */}
        <div className="mt-8 mb-10">
          <h3 className="text-lg font-medium mb-4 flex items-center justify-center font-roboto">
            <Users size={20} className="mr-2" />
            Family Members
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {familyMembers.map((member) => (
              <FamilyMemberCard
                key={member.id}
                member={member}
                onClick={() => !member.completed && handleSelectUser(member)}
                interactive={!member.completed}
                selected={false}
                size="medium"
              />
            ))}
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {allCompleted ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-3 bg-black text-white rounded-md hover:bg-gray-900 font-roboto"
            >
              Go to Family Dashboard
            </button>
          ) : (
            <>
              {pendingMembers.length > 0 && (
                <button
                  onClick={() => handleSelectUser(pendingMembers[0])}
                  className="px-8 py-3 bg-black text-white rounded-md hover:bg-gray-900 font-roboto"
                >
                  Continue as {pendingMembers[0].name}
                </button>
              )}
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3 border border-black text-black rounded-md hover:bg-gray-50 font-roboto"
              >
                Switch User
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <footer className="py-4 border-t mt-auto">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-gray-500 font-roboto">
            Allie v1.0 - Balance family responsibilities together
          </p>
        </div>
      </footer>
    </div>
  );
};

export default FamilySurveyDashboard;
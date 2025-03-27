import React from 'react';
import { Camera, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const FamilyMemberCard = ({ 
  member, 
  onClick, 
  onPhotoClick,
  selected = false,
  showStatus = true,
  size = "medium", // small, medium, large
  interactive = true,
  actionText = null
}) => {
  // Get default profile image based on role
  const getDefaultProfileImage = () => {
    if (!member.profilePicture) {
      if (member.role === 'parent') {
        return member.roleType === 'Mama' 
          ? 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjgiIHI9IjEyOCIgZmlsbD0iI2U5YjFkYSIvPjxjaXJjbGUgY3g9IjEyOCIgY3k9IjkwIiByPSI0MCIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0yMTUsMTcyLjVjMCwzNS05NSwzNS05NSwzNXMtOTUsMC05NS0zNWMwLTIzLjMsOTUtMTAsOTUtMTBTMjE1LDE0OS4yLDIxNSwxNzIuNVoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=' 
          : 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjgiIHI9IjEyOCIgZmlsbD0iIzg0YzRlMiIvPjxjaXJjbGUgY3g9IjEyOCIgY3k9IjkwIiByPSI0MCIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0yMTUsMTcyLjVjMCwzNS05NSwzNS05NSwzNXMtOTUsMC05NS0zNWMwLTIzLjMsOTUtMTAsOTUtMTBTMjE1LDE0OS4yLDIxNSwxNzIuNVoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=';
      } else {
        // Child icon
        return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjgiIHI9IjEyOCIgZmlsbD0iI2ZkZTY4YSIvPjxjaXJjbGUgY3g9IjEyOCIgY3k9IjkwIiByPSI0MCIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0yMTUsMTcyLjVjMCwzNS05NSwzNS05NSwzNXMtOTUsMC05NS0zNWMwLTIzLjMsOTUtMTAsOTUtMTBTMjE1LDE0OS4yLDIxNSwxNzIuNVoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=';
      }
    }
    return member.profilePicture;
  };

  // Get member status
  const getMemberStatus = () => {
    if (member.completed) {
      return {
        text: "Completed",
        icon: <CheckCircle size={12} className="mr-1" />,
        className: "text-green-600"
      };
    }

    // Check if this specific member has a surveyInProgress flag
    try {
      const surveyProgress = localStorage.getItem('surveyInProgress');
      if (surveyProgress) {
        const progress = JSON.parse(surveyProgress);
        if (progress.userId === member.id) {
          return {
            text: "Survey in progress",
            icon: <Clock size={12} className="mr-1" />,
            className: "text-blue-600"
          };
        }
      }
    } catch (e) {
      console.error("Error checking survey progress:", e);
    }
    
    return {
      text: "Survey needed",
      icon: <AlertCircle size={12} className="mr-1" />,
      className: "text-amber-600"
    };
  };

  // Calculate size classes
  const sizeClasses = {
    small: {
      card: "p-3",
      image: "w-12 h-12",
      name: "text-sm",
      role: "text-xs"
    },
    medium: {
      card: "p-4",
      image: "w-16 h-16",
      name: "text-base",
      role: "text-xs"
    },
    large: {
      card: "p-5",
      image: "w-24 h-24",
      name: "text-lg",
      role: "text-sm"
    }
  };

  const classes = sizeClasses[size];
  const status = getMemberStatus();

  return (
    <div 
      className={`${classes.card} rounded-lg border transition-all ${
        interactive ? 'cursor-pointer hover:border-gray-400' : ''
      } ${
        selected 
          ? 'border-black bg-gray-50' 
          : member.completed 
            ? 'border-green-200 bg-green-50' 
            : 'border-gray-200'
      }`}
      onClick={interactive ? onClick : undefined}
    >
      <div className="flex flex-col items-center">
        {/* Profile picture */}
        <div className="relative">
          <div className={`${classes.image} rounded-full overflow-hidden border-2 ${
            selected ? 'border-black' : 'border-white'
          }`}>
            <img 
              src={getDefaultProfileImage()}
              alt={member.name}
              className="w-full h-full object-cover"
            />
          </div>
          
          {onPhotoClick && (
            <button
              className="absolute bottom-0 right-0 bg-black text-white p-1 rounded-full shadow-lg transform hover:scale-110 transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                onPhotoClick(member);
              }}
            >
              <Camera size={12} />
            </button>
          )}
        </div>
        
        {/* Name and role */}
        <p className={`${classes.name} font-medium text-center mt-2 font-roboto`}>{member.name}</p>
        <p className={`${classes.role} text-gray-500 capitalize font-roboto`}>
          {member.role}{member.age ? `, ${member.age}` : ''}
        </p>
        
        {/* Status badge or action text */}
        {showStatus && (
          <div className="mt-2">
            {actionText ? (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-roboto">
                {actionText}
              </span>
            ) : (
              <span className={`text-xs flex items-center ${status.className} font-roboto`}>
                {status.icon}
                {status.text}
              </span>
            )}
          </div>
        )}

        {/* Weekly completion indicator if available */}
        {member.weeklyCompleted && member.weeklyCompleted.length > 0 && (
          <div className="mt-2 flex space-x-1">
            {member.weeklyCompleted.map((week, idx) => (
              <div 
                key={idx} 
                className={`w-2 h-2 rounded-full ${
                  week.completed ? 'bg-green-500' : 'bg-gray-300'
                }`}
                title={week.completed ? `Week ${idx+1}: Completed` : `Week ${idx+1}: Not completed`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FamilyMemberCard;
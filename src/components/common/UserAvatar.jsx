// Add this component to src/components/common/UserAvatar.jsx
import React from 'react';

const UserAvatar = ({ user, size = 40, className = "" }) => {
  // Generate consistent color based on user ID or name
  const generateColor = (str) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 
      'bg-pink-500', 'bg-indigo-500', 'bg-red-500', 'bg-cyan-500'
    ];
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };
  
  // Get initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Check if user has a profile picture
  const hasProfilePic = user && user.profilePicture && !user.profilePicture.includes('/api/placeholder');
  
  if (hasProfilePic) {
    return (
      <div 
        className={`w-${size/4} h-${size/4} rounded-full overflow-hidden ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <img 
          src={user.profilePicture} 
          alt={user.name || 'User'} 
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentNode.classList.add(generateColor(user.id || user.name || 'user'));
            e.target.parentNode.setAttribute('data-initials', getInitials(user.name));
          }}
        />
      </div>
    );
  } else {
    // Fallback to colored circle with initials
    const colorClass = generateColor(user.id || user.name || 'user');
    return (
      <div 
        className={`w-${size/4} h-${size/4} rounded-full flex items-center justify-center text-white font-medium ${colorClass} ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {getInitials(user.name)}
      </div>
    );
  }
};

export default UserAvatar;
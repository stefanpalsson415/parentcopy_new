// src/components/chat/ResearchCitationBlock.jsx
import React from 'react';
import { BookOpen, AlertCircle, Info } from 'lucide-react';

/**
 * Component to display research citations in chat
 */
const ResearchCitationBlock = ({ sources, confidence }) => {
  // Don't render anything if no sources
  if (!sources || sources.length === 0) return null;
  
  // Filter to only significant sources
  const significantSources = sources.filter(s => s.confidence > 0.6);
  if (significantSources.length === 0) return null;
  
  // Format source types for display
  const formatSourceType = (type) => {
    switch (type) {
      case 'whitepaper':
        return 'Research Paper';
      case 'research':
        return 'Research Study';
      case 'faq':
        return 'Expert FAQ';
      case 'methodology':
        return 'Methodology';
      case 'parenting-strategy':
        return 'Parenting Strategy';
      case 'child-development':
        return 'Child Development Guide';
      case 'knowledge-graph':
        return 'Family Data';
      case 'knowledge-graph-insight':
        return 'Family Insight';
      default:
        return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
  };
  
  // Determine confidence level display
  const confidenceLevel = confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low';
  const confidenceMessage = 
    confidence >= 0.8 ? 'Research-backed with high confidence' : 
    confidence >= 0.5 ? 'Research-supported with moderate confidence' : 
    'Research-informed with limited confidence';
  
  return (
    <div className="mt-2 text-xs border rounded-md overflow-hidden">
      <div className={`flex items-center p-2 ${
        confidenceLevel === 'high' ? 'bg-green-50 text-green-800' :
        confidenceLevel === 'medium' ? 'bg-yellow-50 text-yellow-800' :
        'bg-blue-50 text-blue-800'
      }`}>
        <BookOpen className="w-4 h-4 mr-2" />
        <span className="font-medium">{confidenceMessage}</span>
      </div>
      
      {significantSources.length > 0 && (
        <div className="p-2 bg-white">
          <p className="text-gray-500 mb-1">Sources:</p>
          <ul className="space-y-1">
            {significantSources.slice(0, 3).map((source, index) => (
              <li key={index} className="flex items-start">
                <span className="text-gray-400 mr-1">[{index + 1}]</span>
                <span>
                  <span className="font-medium">{source.title}</span>
                  {source.type && (
                    <span className="text-gray-500"> ({formatSourceType(source.type)})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {confidenceLevel === 'low' && (
        <div className="p-2 bg-gray-50 flex items-center text-gray-600">
          <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
          <span>Limited sources available. Consider this preliminary information.</span>
        </div>
      )}
    </div>
  );
};

export default ResearchCitationBlock;
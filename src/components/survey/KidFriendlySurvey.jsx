// Create a new file: src/components/survey/EnhancedKidFriendlySurvey.jsx

import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, Volume2, ArrowRight, ArrowLeft, Star, Medal, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '../../contexts/FamilyContext';
import { useSurvey } from '../../contexts/SurveyContext';

// Enhanced Task Illustrations with improved SVGs for each category
const TaskIllustrations = {
  // Cleaning illustration
  "cleaning": () => (
    <svg width="240" height="180" viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="180" fill="#f9fafb" />
      
      {/* Room background */}
      <rect x="40" y="50" width="160" height="100" fill="#f8fafc" stroke="#4b5563" strokeWidth="2" />
      <rect x="40" y="130" width="160" height="20" fill="#d1d5db" /> {/* Floor */}
      
      {/* Window */}
      <rect x="150" y="60" width="40" height="40" fill="#bfdbfe" stroke="#4b5563" strokeWidth="1" />
      <line x1="150" y1="80" x2="190" y2="80" stroke="#4b5563" strokeWidth="1" />
      <line x1="170" y1="60" x2="170" y2="100" stroke="#4b5563" strokeWidth="1" />
      <ellipse cx="170" cy="170" rx="60" ry="10" fill="#d1d5db" opacity="0.3" /> {/* Shadow */}
      
      {/* Cleaning elements */}
      <rect x="80" y="80" width="10" height="70" fill="#a78bfa" rx="2" /> {/* Broom handle */}
      <path d="M80 80 L90 80 L100 60 L70 60 Z" fill="#c4b5fd" /> {/* Broom head */}
      <path d="M70 60 L100 60 L100 55 L70 55 Z" fill="#a78bfa" /> {/* Broom top */}
      
      {/* Person cleaning */}
      <circle cx="70" cy="100" r="15" fill="#fde68a" /> {/* Head */}
      <rect x="65" y="115" width="10" height="30" fill="#fde68a" rx="5" /> {/* Body */}
      <line x1="65" y1="125" x2="50" y2="115" stroke="#fde68a" strokeWidth="5" strokeLinecap="round" /> {/* Arm */}
      <line x1="75" y1="125" x2="80" y2="100" stroke="#fde68a" strokeWidth="5" strokeLinecap="round" /> {/* Arm holding broom */}
      <line x1="65" y1="145" x2="60" y2="165" stroke="#fde68a" strokeWidth="5" strokeLinecap="round" /> {/* Leg */}
      <line x1="75" y1="145" x2="80" y2="165" stroke="#fde68a" strokeWidth="5" strokeLinecap="round" /> {/* Leg */}
      
      {/* Face */}
      <circle cx="65" cy="95" r="2" fill="#4b5563" /> {/* Eye */}
      <circle cx="75" cy="95" r="2" fill="#4b5563" /> {/* Eye */}
      <path d="M65 105 Q70 110, 75 105" stroke="#4b5563" strokeWidth="1.5" fill="none" /> {/* Smile */}
      
      {/* Dust particles */}
      <circle cx="110" cy="70" r="3" fill="#d1d5db" opacity="0.6" />
      <circle cx="120" cy="85" r="2" fill="#d1d5db" opacity="0.6" />
      <circle cx="105" cy="95" r="2.5" fill="#d1d5db" opacity="0.6" />
      <circle cx="115" cy="65" r="2" fill="#d1d5db" opacity="0.6" />
    </svg>
  ),
  
  // Cooking illustration
  "cooking": () => (
    <svg width="240" height="180" viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="180" fill="#f9fafb" />
      
      {/* Kitchen counter */}
      <rect x="40" y="100" width="160" height="50" fill="#d1d5db" />
      <rect x="40" y="90" width="160" height="10" fill="#9ca3af" />
      
      {/* Stove */}
      <rect x="70" y="70" width="80" height="20" fill="#4b5563" rx="2" />
      <circle cx="90" cy="80" r="12" fill="#f87171" />
      <circle cx="90" cy="80" r="8" fill="#ef4444" />
      <circle cx="130" cy="80" r="12" fill="#f87171" />
      <circle cx="130" cy="80" r="8" fill="#ef4444" />
      
      {/* Pot on stove */}
      <rect x="75" y="55" width="30" height="25" fill="#6b7280" rx="2" />
      <rect x="73" y="50" width="34" height="5" fill="#4b5563" rx="2" />
      <path d="M80 55 Q90 45, 100 55" stroke="#4b5563" strokeWidth="2" fill="none" /> {/* Steam */}
      <path d="M85 52 Q95 42, 105 52" stroke="#4b5563" strokeWidth="2" fill="none" opacity="0.6" /> {/* Steam */}
      
      {/* Person cooking */}
      <circle cx="170" cy="70" r="15" fill="#fde68a" /> {/* Head */}
      <rect x="165" y="85" width="10" height="35" fill="#fde68a" rx="5" /> {/* Body */}
      <line x1="165" y1="95" x2="145" y2="85" stroke="#fde68a" strokeWidth="5" strokeLinecap="round" /> {/* Arm */}
      <line x1="175" y1="95" x2="195" y2="85" stroke="#fde68a" strokeWidth="5" strokeLinecap="round" /> {/* Arm */}
      <rect x="140" y="70" width="10" height="5" fill="#fde68a" rx="2" /> {/* Hand */}
      
      {/* Face */}
      <circle cx="165" cy="65" r="2" fill="#4b5563" /> {/* Eye */}
      <circle cx="175" cy="65" r="2" fill="#4b5563" /> {/* Eye */}
      <path d="M165 75 Q170 80, 175 75" stroke="#4b5563" strokeWidth="1.5" fill="none" /> {/* Smile */}
      
      {/* Cooking utensil */}
      <rect x="140" y="70" width="5" height="30" fill="#9ca3af" rx="1" />
      <rect x="125" y="65" width="20" height="5" fill="#9ca3af" rx="1" />
    </svg>
  ),
  
  // Planning illustration
  "planning": () => (
    <svg width="240" height="180" viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="180" fill="#f9fafb" />
      
      {/* Calendar/planner */}
      <rect x="60" y="40" width="120" height="100" fill="white" stroke="#4b5563" strokeWidth="2" />
      <rect x="60" y="40" width="120" height="20" fill="#93c5fd" />
      <text x="120" y="55" textAnchor="middle" fill="#1e3a8a" fontSize="12" fontFamily="sans-serif">WEEKLY PLAN</text>
      
      {/* Calendar grid */}
      <line x1="60" y1="60" x2="180" y2="60" stroke="#4b5563" strokeWidth="1" />
      <line x1="60" y1="80" x2="180" y2="80" stroke="#4b5563" strokeWidth="1" />
      <line x1="60" y1="100" x2="180" y2="100" stroke="#4b5563" strokeWidth="1" />
      <line x1="60" y1="120" x2="180" y2="120" stroke="#4b5563" strokeWidth="1" />
      
      <line x1="77" y1="60" x2="77" y2="140" stroke="#4b5563" strokeWidth="1" />
      <line x1="94" y1="60" x2="94" y2="140" stroke="#4b5563" strokeWidth="1" />
      <line x1="111" y1="60" x2="111" y2="140" stroke="#4b5563" strokeWidth="1" />
      <line x1="128" y1="60" x2="128" y2="140" stroke="#4b5563" strokeWidth="1" />
      <line x1="145" y1="60" x2="145" y2="140" stroke="#4b5563" strokeWidth="1" />
      <line x1="162" y1="60" x2="162" y2="140" stroke="#4b5563" strokeWidth="1" />
      
      {/* Calendar entries */}
      <rect x="95" y="81" width="32" height="18" fill="#dbeafe" rx="2" />
      <rect x="146" y="101" width="32" height="18" fill="#c7d2fe" rx="2" />
      <rect x="63" y="121" width="32" height="18" fill="#fecaca" rx="2" />
      
      {/* Person planning */}
      <circle cx="40" cy="70" r="15" fill="#fde68a" /> {/* Head */}
      <rect x="35" y="85" width="10" height="30" fill="#fde68a" rx="5" /> {/* Body */}
      <line x1="35" y1="95" x2="20" y2="105" stroke="#fde68a" strokeWidth="5" strokeLinecap="round" /> {/* Arm */}
      <line x1="45" y1="95" x2="60" y2="70" stroke="#fde68a" strokeWidth="5" strokeLinecap="round" /> {/* Arm pointing */}
      
      {/* Face */}
      <circle cx="35" cy="65" r="2" fill="#4b5563" /> {/* Eye */}
      <circle cx="45" cy="65" r="2" fill="#4b5563" /> {/* Eye */}
      <path d="M35 75 Q40 80, 45 75" stroke="#4b5563" strokeWidth="1.5" fill="none" /> {/* Smile */}
      
      {/* Pencil */}
      <rect x="195" y="40" width="5" height="30" fill="#fbbf24" transform="rotate(30, 195, 40)" />
      <polygon points="195,38 200,43 195,48" fill="#4b5563" transform="rotate(30, 195, 40)" />
    </svg>
  ),
  
  // Scheduling illustration
  "scheduling": () => (
    <svg width="240" height="180" viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="180" fill="#f9fafb" />
      
      {/* Clock */}
      <circle cx="150" cy="90" r="40" fill="white" stroke="#4b5563" strokeWidth="2" />
      <circle cx="150" cy="90" r="3" fill="#4b5563" />
      <line x1="150" y1="90" x2="150" y2="60" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" /> {/* Hour hand */}
      <line x1="150" y1="90" x2="170" y2="90" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" /> {/* Minute hand */}
      
      {/* Clock ticks */}
      <line x1="150" y1="50" x2="150" y2="55" stroke="#4b5563" strokeWidth="2" /> {/* 12 */}
      <line x1="190" y1="90" x2="185" y2="90" stroke="#4b5563" strokeWidth="2" /> {/* 3 */}
      <line x1="150" y1="130" x2="150" y2="125" stroke="#4b5563" strokeWidth="2" /> {/* 6 */}
      <line x1="110" y1="90" x2="115" y2="90" stroke="#4b5563" strokeWidth="2" /> {/* 9 */}
      
      {/* Phone/device */}
      <rect x="60" y="70" width="40" height="60" rx="5" fill="#d1d5db" />
      <rect x="65" y="75" width="30" height="40" rx="2" fill="#bfdbfe" />
      <circle cx="80" cy="125" r="3" fill="#9ca3af" />
      
      {/* Calendar lines on phone */}
      <line x1="70" y1="85" x2="90" y2="85" stroke="#4b5563" strokeWidth="1" />
      <line x1="70" y1="95" x2="90" y2="95" stroke="#4b5563" strokeWidth="1" />
      <line x1="70" y1="105" x2="90" y2="105" stroke="#4b5563" strokeWidth="1" />
      
      {/* Person scheduling */}
      <circle cx="40" cy="90" r="15" fill="#fde68a" /> {/* Head */}
      <rect x="35" y="105" width="10" height="30" fill="#fde68a" rx="5" /> {/* Body */}
      <line x1="35" y1="115" x2="20" y2="105" stroke="#fde68a" strokeWidth="5" strokeLinecap="round" /> {/* Arm */}
      <line x1="45" y1="115" x2="65" y2="105" stroke="#fde68a" strokeWidth="5" strokeLinecap="round" /> {/* Arm holding phone */}
      
      {/* Face */}
      <circle cx="35" cy="85" r="2" fill="#4b5563" /> {/* Eye */}
      <circle cx="45" cy="85" r="2" fill="#4b5563" /> {/* Eye */}
      <path d="M35 95 Q40 100, 45 95" stroke="#4b5563" strokeWidth="1.5" fill="none" /> {/* Smile */}
    </svg>
  ),
  
  // Homework illustration (already enhanced version)
  "homework": () => (
    <svg width="240" height="180" viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="180" fill="#f9fafb" />
      
      {/* Background with desk */}
      <rect x="40" y="100" width="160" height="60" fill="#8B4513" rx="5" /> {/* Desk */}
      <rect x="45" y="105" width="150" height="50" fill="#A0522D" rx="3" /> {/* Desk top */}
      
      {/* Open book */}
      <rect x="70" y="60" width="80" height="10" fill="#f8fafc" stroke="#4b5563" strokeWidth="1" transform="skewX(-10)" />
      <rect x="70" y="70" width="80" height="50" fill="white" stroke="#4b5563" strokeWidth="1" rx="2" transform="skewX(-10)" />
      <rect x="90" y="60" width="80" height="10" fill="#f8fafc" stroke="#4b5563" strokeWidth="1" transform="skewX(10)" />
      <rect x="90" y="70" width="80" height="50" fill="white" stroke="#4b5563" strokeWidth="1" rx="2" transform="skewX(10)" />
      
      {/* Book lines */}
      <line x1="80" y1="80" x2="140" y2="80" stroke="#9ca3af" strokeWidth="1" transform="skewX(-10)" />
      <line x1="80" y1="90" x2="140" y2="90" stroke="#9ca3af" strokeWidth="1" transform="skewX(-10)" />
      <line x1="80" y1="100" x2="140" y2="100" stroke="#9ca3af" strokeWidth="1" transform="skewX(-10)" />
      <line x1="100" y1="80" x2="160" y2="80" stroke="#9ca3af" strokeWidth="1" transform="skewX(10)" />
      <line x1="100" y1="90" x2="160" y2="90" stroke="#9ca3af" strokeWidth="1" transform="skewX(10)" />
      <line x1="100" y1="100" x2="160" y2="100" stroke="#9ca3af" strokeWidth="1" transform="skewX(10)" />
      
      {/* Pencil */}
      <rect x="160" y="70" width="30" height="5" fill="#FFD700" transform="rotate(45, 160, 70)" />
      <polygon points="185,55 190,60 185,65" fill="#4b5563" transform="rotate(45, 160, 70)" />
      
      {/* Happy kid character */}
      <circle cx="40" cy="60" r="20" fill="#fde68a" /> {/* Head */}
      <circle cx="33" cy="55" r="3" fill="#4b5563" /> {/* Eye */}
      <circle cx="47" cy="55" r="3" fill="#4b5563" /> {/* Eye */}
      <path d="M33 65 Q40 70, 47 65" fill="none" stroke="#4b5563" strokeWidth="2" /> {/* Smile */}
      <path d="M40 80 L40 110 M30 90 L40 100 M50 90 L40 100 M30 130 L40 110 M50 130 L40 110" 
            stroke="#4b5563" strokeWidth="2" fill="none" /> {/* Stick figure body */}
    </svg>
  ),
  
  // Driving illustration
  "driving": () => (
    <svg width="240" height="180" viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="180" fill="#f9fafb" />
      
      {/* Road */}
      <rect x="0" y="130" width="240" height="50" fill="#4b5563" />
      <line x1="20" y1="155" x2="60" y2="155" stroke="white" strokeWidth="4" strokeDasharray="10,10" />
      <line x1="80" y1="155" x2="120" y2="155" stroke="white" strokeWidth="4" strokeDasharray="10,10" />
      <line x1="140" y1="155" x2="180" y2="155" stroke="white" strokeWidth="4" strokeDasharray="10,10" />
      <line x1="200" y1="155" x2="240" y2="155" stroke="white" strokeWidth="4" strokeDasharray="10,10" />
      
      {/* Car */}
      <rect x="70" y="110" width="100" height="30" rx="10" fill="#3b82f6" />
      <rect x="80" y="90" width="70" height="25" rx="5" fill="#60a5fa" />
      <rect x="85" y="95" width="15" height="15" fill="#bfdbfe" /> {/* Window */}
      <rect x="105" y="95" width="15" height="15" fill="#bfdbfe" /> {/* Window */}
      <rect x="125" y="95" width="15" height="15" fill="#bfdbfe" /> {/* Window */}
      <circle cx="90" cy="140" r="12" fill="#1f2937" /> {/* Wheel */}
      <circle cx="90" cy="140" r="6" fill="#6b7280" /> {/* Wheel hub */}
      <circle cx="150" cy="140" r="12" fill="#1f2937" /> {/* Wheel */}
      <circle cx="150" cy="140" r="6" fill="#6b7280" /> {/* Wheel hub */}
      
      {/* Person driving */}
      <circle cx="110" cy="100" r="10" fill="#fde68a" /> {/* Head */}
      <rect x="107" y="110" width="6" height="15" fill="#fde68a" rx="3" /> {/* Body */}
      <line x1="113" y1="115" x2="120" y2="110" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" /> {/* Arm on wheel */}
      
      {/* Face */}
      <circle cx="107" cy="98" r="2" fill="#4b5563" /> {/* Eye */}
      <circle cx="113" cy="98" r="2" fill="#4b5563" /> {/* Eye */}
      <path d="M107 103 Q110 105, 113 103" stroke="#4b5563" strokeWidth="1" fill="none" /> {/* Smile */}
      
      {/* Steering wheel */}
      <circle cx="120" cy="110" r="5" fill="#6b7280" stroke="#4b5563" strokeWidth="1" />
    </svg>
  ),
  
  // Emotional support illustration
  "emotional": () => (
    <svg width="240" height="180" viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="180" fill="#f9fafb" />
      
      {/* Living room setting */}
      <rect x="30" y="90" width="180" height="70" fill="#d1d5db" rx="2" /> {/* Couch */}
      <rect x="35" y="95" width="170" height="40" fill="#9ca3af" rx="2" /> {/* Couch cushion */}
      <rect x="35" y="95" width="170" height="5" fill="#f3f4f6" rx="1" /> {/* Couch detail */}
      
      {/* Parent figure */}
      <circle cx="70" cy="70" r="15" fill="#fde68a" /> {/* Head */}
      <rect x="65" y="85" width="10" height="30" fill="#fde68a" rx="5" /> {/* Body */}
      <line x1="65" y1="95" x2="55" y2="115" stroke="#fde68a" strokeWidth="5" strokeLinecap="round" /> {/* Arm */}
      <line x1="75" y1="95" x2="110" y2="100" stroke="#fde68a" strokeWidth="5" strokeLinecap="round" /> {/* Arm around child */}
      
      {/* Parent face */}
      <circle cx="65" cy="65" r="2" fill="#4b5563" /> {/* Eye */}
      <circle cx="75" cy="65" r="2" fill="#4b5563" /> {/* Eye */}
      <path d="M65 75 Q70 80, 75 75" stroke="#4b5563" strokeWidth="1.5" fill="none" /> {/* Smile */}
      
      {/* Child figure */}
      <circle cx="110" cy="80" r="12" fill="#fde68a" /> {/* Head */}
      <rect x="106" y="92" width="8" height="20" fill="#fde68a" rx="4" /> {/* Body */}
      <line x1="106" y1="95" x2="95" y2="105" stroke="#fde68a" strokeWidth="4" strokeLinecap="round" /> {/* Arm */}
      <line x1="114" y1="95" x2="125" y2="105" stroke="#fde68a" strokeWidth="4" strokeLinecap="round" /> {/* Arm */}
      
      {/* Child face - sad */}
      <circle cx="106" cy="76" r="2" fill="#4b5563" /> {/* Eye */}
      <circle cx="114" cy="76" r="2" fill="#4b5563" /> {/* Eye */}
      <path d="M106 86 Q110 83, 114 86" stroke="#4b5563" strokeWidth="1.5" fill="none" /> {/* Sad mouth */}
      
      {/* Heart floating */}
      <path d="M90 40 A10,10 0 0,1 110,40 A10,10 0 0,1 130,40 Q130,60 90,80 Q90,60 90,40" fill="#fecaca" />
    </svg>
  ),
  
  // Planning kids illustration
  "planning_kids": () => (
    <svg width="240" height="180" viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="180" fill="#f9fafb" />
      
      {/* Calendar */}
      <rect x="110" y="40" width="100" height="80" fill="white" stroke="#4b5563" strokeWidth="2" rx="2" />
      <rect x="110" y="40" width="100" height="15" fill="#fca5a5" />
      <text x="160" y="52" fontSize="10" textAnchor="middle" fill="#7f1d1d">ACTIVITIES</text>
      
      {/* Calendar grid */}
      <line x1="110" y1="55" x2="210" y2="55" stroke="#4b5563" strokeWidth="1" />
      <line x1="110" y1="75" x2="210" y2="75" stroke="#4b5563" strokeWidth="1" />
      <line x1="110" y1="95" x2="210" y2="95" stroke="#4b5563" strokeWidth="1" />
      
      <line x1="135" y1="55" x2="135" y2="120" stroke="#4b5563" strokeWidth="1" />
      <line x1="160" y1="55" x2="160" y2="120" stroke="#4b5563" strokeWidth="1" />
      <line x1="185" y1="55" x2="185" y2="120" stroke="#4b5563" strokeWidth="1" />
      
      {/* Activity entries */}
      <rect x="115" y="60" width="15" height="10" fill="#fecdd3" rx="2" />
      <rect x="165" y="80" width="15" height="10" fill="#a7f3d0" rx="2" />
      <rect x="140" y="100" width="15" height="10" fill="#c7d2fe" rx="2" />
      
      {/* Parent character */}
      <circle cx="50" cy="70" r="15" fill="#fde68a" /> {/* Head */}
      <rect x="45" y="85" width="10" height="35" fill="#fde68a" rx="5" /> {/* Body */}
      <line x1="45" y1="95" x2="30" y2="85" stroke="#fde68a" strokeWidth="5" strokeLinecap="round" /> {/* Arm */}
      <line x1="55" y1="95" x2="70" y2="80" stroke="#fde68a" strokeWidth="5" strokeLinecap="round" /> {/* Arm pointing */}
      
      {/* Face */}
      <circle cx="45" cy="65" r="2" fill="#4b5563" /> {/* Eye */}
      <circle cx="55" cy="65" r="2" fill="#4b5563" /> {/* Eye */}
      <path d="M45 75 Q50 80, 55 75" stroke="#4b5563" strokeWidth="1.5" fill="none" /> {/* Smile */}
      
      {/* Children figures */}
      <circle cx="70" cy="120" r="10" fill="#fde68a" /> {/* Child 1 head */}
      <line x1="70" y1="130" x2="70" y2="150" stroke="#fde68a" strokeWidth="4" strokeLinecap="round" /> {/* Body */}
      <line x1="70" y1="135" x2="60" y2="145" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" /> {/* Arm */}
      <line x1="70" y1="135" x2="80" y2="145" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" /> {/* Arm */}
      
      <circle cx="100" cy="130" r="10" fill="#fde68a" /> {/* Child 2 head */}
      <line x1="100" y1="140" x2="100" y2="160" stroke="#fde68a" strokeWidth="4" strokeLinecap="round" /> {/* Body */}
      <line x1="100" y1="145" x2="90" y2="155" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" /> {/* Arm */}
      <line x1="100" y1="145" x2="110" y2="155" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" /> {/* Arm */}
    </svg>
  ),
  
  // Default illustration
  "default": () => (
    <svg width="240" height="180" viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="180" fill="#f9fafb" />
      
      {/* Simple house */}
      <rect x="70" y="80" width="100" height="70" fill="white" stroke="#4b5563" strokeWidth="2" />
      <polygon points="70,80 170,80 120,40" fill="#c7d2fe" stroke="#4b5563" strokeWidth="2" />
      <rect x="110" y="110" width="20" height="40" fill="#4b5563" />
      
      {/* Family figures */}
      <circle cx="60" cy="130" r="12" fill="#e9b1da" /> {/* Mama */}
      <line x1="60" y1="142" x2="60" y2="160" stroke="#e9b1da" strokeWidth="4" strokeLinecap="round" />
      <line x1="60" y1="148" x2="50" y2="158" stroke="#e9b1da" strokeWidth="3" strokeLinecap="round" />
      <line x1="60" y1="148" x2="70" y2="158" stroke="#e9b1da" strokeWidth="3" strokeLinecap="round" />
      
      <circle cx="90" cy="130" r="12" fill="#84c4e2" /> {/* Papa */}
      <line x1="90" y1="142" x2="90" y2="160" stroke="#84c4e2" strokeWidth="4" strokeLinecap="round" />
      <line x1="90" y1="148" x2="80" y2="158" stroke="#84c4e2" strokeWidth="3" strokeLinecap="round" />
      <line x1="90" y1="148" x2="100" y2="158" stroke="#84c4e2" strokeWidth="3" strokeLinecap="round" />
      
      <circle cx="190" cy="130" r="10" fill="#fde68a" /> {/* Child */}
      <line x1="190" y1="140" x2="190" y2="155" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" />
      <line x1="190" y1="145" x2="183" y2="152" stroke="#fde68a" strokeWidth="2" strokeLinecap="round" />
      <line x1="190" y1="145" x2="197" y2="152" stroke="#fde68a" strokeWidth="2" strokeLinecap="round" />
      
      {/* Simple sun */}
      <circle cx="40" cy="40" r="15" fill="#fcd34d" />
      <line x1="40" y1="15" x2="40" y2="20" stroke="#fcd34d" strokeWidth="2" />
      <line x1="40" y1="60" x2="40" y2="65" stroke="#fcd34d" strokeWidth="2" />
      <line x1="15" y1="40" x2="20" y2="40" stroke="#fcd34d" strokeWidth="2" />
      <line x1="60" y1="40" x2="65" y2="40" stroke="#fcd34d" strokeWidth="2" />
      <line x1="22" y1="22" x2="26" y2="26" stroke="#fcd34d" strokeWidth="2" />
      <line x1="54" y1="54" x2="58" y2="58" stroke="#fcd34d" strokeWidth="2" />
      <line x1="22" y1="58" x2="26" y2="54" stroke="#fcd34d" strokeWidth="2" />
      <line x1="54" y1="26" x2="58" y2="22" stroke="#fcd34d" strokeWidth="2" />
    </svg>
  )
};

const EnhancedKidFriendlySurvey = ({ surveyType = "initial" }) => {
  const navigate = useNavigate();
  const { 
    fullQuestionSet, 
    updateSurveyResponse, 
    resetSurvey, 
    getSurveyProgress,
    generateWeeklyQuestions,
    currentSurveyResponses
  } = useSurvey();
  
  const { 
    selectedUser, 
    familyMembers, 
    completeInitialSurvey,
    completeWeeklyCheckIn,
    saveSurveyProgress,
    currentWeek 
  } = useFamily();
  
  // State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [viewingQuestionList, setViewingQuestionList] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [userResponses, setUserResponses] = useState({});
  const [gameStatus, setGameStatus] = useState({
    mamaPosition: 0,
    papaPosition: 0,
    stars: 0
  });
  const [showReward, setShowReward] = useState(false);
  const [totalStars, setTotalStars] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [showAnimatedProgress, setShowAnimatedProgress] = useState(false);
  const [animation, setAnimation] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Refs
  const questionTimerRef = useRef(null);
  const keyBlockerRef = useRef(false);

  // Redirect if no user is selected
  useEffect(() => {
    if (!selectedUser) {
      navigate('/');
    }
  }, [selectedUser, navigate]);
  
  // Reset survey when component mounts
  useEffect(() => {
    resetSurvey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Cleanup function when component unmounts
  useEffect(() => {
    return () => {
      // Clear any pending timers
      if (questionTimerRef.current) {
        clearTimeout(questionTimerRef.current);
        questionTimerRef.current = null;
      }
      
      // For extra safety, clear all possible timeouts
      const highestTimeoutId = setTimeout(() => {}, 0);
      for (let i = 0; i < highestTimeoutId; i++) {
        clearTimeout(i);
      }
    };
  }, []);
  
  // Set up questions for kids based on survey type
  useEffect(() => {
    if (!fullQuestionSet || fullQuestionSet.length === 0) return;
    
    let questionSet;
    
    // Determine which questions to use based on the survey type
    if (surveyType === "weekly") {
      console.log(`Generating weekly questions for week ${currentWeek}`);
      questionSet = generateWeeklyQuestions(currentWeek, true); // Pass true to indicate child
      console.log(`Generated ${questionSet.length} weekly questions`);
    } else {
      console.log(`Using full question set with ${fullQuestionSet.length} questions`);
      questionSet = fullQuestionSet;
    }
    
    let filteredList = questionSet;
    
    // For weekly survey, use exactly 30 questions for any child
    if (surveyType === "weekly" && selectedUser && selectedUser.role === 'child') {
      const categories = [
        "Visible Household Tasks",
        "Invisible Household Tasks",
        "Visible Parental Tasks",
        "Invisible Parental Tasks"
      ];
      
      const weeklyKidQuestions = [];
      categories.forEach(category => {
        const categoryQuestions = questionSet.filter(q => q.category === category);
        // Pick 7-8 questions per category (~30 total)
        const questionsForCategory = category === "Visible Household Tasks" || 
                                   category === "Invisible Household Tasks" ? 8 : 7;
        
        for (let i = 0; i < questionsForCategory; i++) {
          const index = (i < categoryQuestions.length) ? i : i % categoryQuestions.length;
          weeklyKidQuestions.push(categoryQuestions[index]);
        }
      });
      
      filteredList = weeklyKidQuestions;
    } 
    // For initial survey, use exactly 50 questions for children of any age
    else if (selectedUser && selectedUser.role === 'child') {
      const categories = [
        "Visible Household Tasks",
        "Invisible Household Tasks",
        "Visible Parental Tasks",
        "Invisible Parental Tasks"
      ];
      
      // 50 questions total - get around 12-13 per category
      const childQuestions = [];
      categories.forEach(category => {
        const categoryQuestions = questionSet.filter(q => q.category === category);
        
        // Adjust questions per category based on age - simpler for younger kids
        const questionsPerCategory = 13;
        
        // Sort by complexity if child is young (below 8)
        if (selectedUser.age < 8) {
          // Sort by complexity - use baseWeight as a proxy for complexity
          categoryQuestions.sort((a, b) => parseFloat(a.baseWeight || 3) - parseFloat(b.baseWeight || 3));
        }
        
        // Select questions
        for (let i = 0; i < questionsPerCategory; i++) {
          if (i < categoryQuestions.length) {
            childQuestions.push(categoryQuestions[i]);
          }
        }
      });
      
      // Ensure we have exactly 50 questions
      filteredList = childQuestions.slice(0, 50);
      console.log(`Generated ${filteredList.length} initial survey questions for child`);
    }
    
    setQuestions(filteredList || []);    
  }, [fullQuestionSet, selectedUser, surveyType, currentWeek, generateWeeklyQuestions]);
  
  // FIXED: Enhanced useEffect to properly restore survey progress
  useEffect(() => {
    // Only run this if we have a user and loaded questions
    if (selectedUser && questions.length > 0 && currentSurveyResponses && Object.keys(currentSurveyResponses).length > 0) {
      console.log("Checking for previously saved progress...", currentSurveyResponses);
      
      // Find the last answered question index
      let lastAnsweredIndex = -1;
      const questionResponses = {};
      
      // First, extract all responses that match our question IDs
      questions.forEach((question, index) => {
        if (currentSurveyResponses[question.id]) {
          questionResponses[question.id] = currentSurveyResponses[question.id];
          lastAnsweredIndex = Math.max(lastAnsweredIndex, index);
        }
      });
      
      // If we found saved answers, jump to the next unanswered question
      if (lastAnsweredIndex >= 0) {
        console.log(`Found progress! Last answered question: ${lastAnsweredIndex}`);
        
        // Set current question to the next unanswered one (not beyond the end)
        const nextIndex = Math.min(lastAnsweredIndex + 1, questions.length - 1);
        setCurrentQuestionIndex(nextIndex);
        
        // Load all previous answers into local state
        setUserResponses(questionResponses);
        
        // Update game state to match saved progress
        const mamaCount = Object.values(questionResponses).filter(v => v === 'Mama').length;
        const papaCount = Object.values(questionResponses).filter(v => v === 'Papa').length;
        
        // Update game status - make sure positions reflect actual progress
        setGameStatus({
          mamaPosition: mamaCount,
          papaPosition: papaCount,
          stars: Math.floor(lastAnsweredIndex / 20)
        });
        
        // Also update total stars
        setTotalStars(Math.floor(lastAnsweredIndex / 20));
        
        console.log(`Restored to question ${nextIndex + 1} with ${Object.keys(questionResponses).length} saved answers`);
      }
    }
  }, [selectedUser, questions, currentSurveyResponses]);
  
  // Handle parent selection
  const handleSelectParent = (parent) => {
    // Prevent multiple calls while processing
    if (isProcessing) {
      console.log("Ignoring selection - already processing");
      return;
    }
    
    // Set processing state immediately
    setIsProcessing(true);
    console.log(`Selected ${parent} for question ${currentQuestionIndex + 1}`);
    
    // Cancel any existing timers
    if (questionTimerRef.current) {
      clearTimeout(questionTimerRef.current);
      questionTimerRef.current = null;
    }
    
    // Set the selected parent for UI feedback
    setSelectedParent(parent);
    
    // Get current question
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) {
      console.error("No current question found");
      setIsProcessing(false);
      return;
    }
    
    // Record response
    const updatedResponses = {
      ...userResponses,
      [currentQuestion.id]: parent
    };
    setUserResponses(updatedResponses);
    
    // Update parent context
    updateSurveyResponse(currentQuestion.id, parent);
    
    // Show selection animation
    setAnimation(`selected-${parent.toLowerCase()}`);
    
    // Store current index in a local variable to avoid closure issues
    const currentIdx = currentQuestionIndex;
    
    // Wait for a moment to show the selection
    questionTimerRef.current = setTimeout(() => {
      // Clear animation
      setAnimation(null);
      
      // Then decide whether to go to next question or complete survey
      questionTimerRef.current = setTimeout(() => {
        if (currentIdx < questions.length - 1) {
          // Move to next question - use exact index instead of functional update
          const nextIndex = currentIdx + 1;
          console.log(`Moving to question ${nextIndex + 1} (from ${currentIdx + 1})`);
          setCurrentQuestionIndex(nextIndex);
          
          // Update game state based on answer - use currentIdx instead of currentQuestionIndex
          setGameStatus(prev => ({
            ...prev,
            mamaPosition: parent === 'Mama' ? currentIdx + 1 : prev.mamaPosition,
            papaPosition: parent === 'Papa' ? currentIdx + 1 : prev.papaPosition,
            stars: (currentIdx + 1) % 20 === 0 ? prev.stars + 1 : prev.stars
          }));
          
          // Show reward if appropriate
          if ((currentIdx + 1) % 20 === 0) {
            setShowReward(true);
            setTotalStars(prev => prev + 1);
            
            // Hide reward after delay
            setTimeout(() => {
              setShowReward(false);
            }, 3000);
          }
          
          // Reset selection state
          setSelectedParent(null);
          setIsProcessing(false);
        } else {
          // Complete the survey
          handleCompleteSurvey();
        }
      }, 500);
    }, 500);
  };

  // Handle pause survey
  const handlePauseSurvey = async () => {
    if (isProcessing) return; // Prevent actions while processing
    
    setIsProcessing(true);
    
    try {
      // Create a copy of all current responses
      const allResponses = {...currentSurveyResponses, ...userResponses};
      
      console.log("Saving survey progress before pausing...");
      console.log("Responses to save:", Object.keys(allResponses).length);
      
      // Save the current progress
      if (surveyType === "weekly") {
        await saveSurveyProgress(selectedUser.id, allResponses);
      } else {
        await saveSurveyProgress(selectedUser.id, allResponses);
      }
      
      console.log("Progress saved successfully");
      
      // Store information about the paused survey in localStorage
      localStorage.setItem('surveyInProgress', JSON.stringify({
        userId: selectedUser.id,
        timestamp: new Date().getTime(),
        surveyType: surveyType,
        lastQuestionIndex: currentQuestionIndex
      }));
      
      // Navigate back to login screen
      navigate('/login');
    } catch (error) {
      console.error('Error saving survey progress:', error);
      alert('There was an error saving your progress, but you can continue later.');
      navigate('/login');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Move to previous question
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
      setSelectedParent(userResponses[questions[currentQuestionIndex - 1].id] || null);
      setShowExplanation(false);
    }
  };
  
  // Complete survey
  const handleCompleteSurvey = async () => {
    // Show a big celebration!
    setShowReward(true);
    
    try {
      console.log(`Attempting to save ${surveyType} survey data...`);
      
      // Ensure we have the latest responses from state
      const allResponses = {...currentSurveyResponses, ...userResponses};
      
      // First try to save the data before any navigation
      if (surveyType === "weekly") {
        // Save weekly check-in
        console.log("Completing weekly check-in with responses:", Object.keys(allResponses).length);
        await completeWeeklyCheckIn(selectedUser.id, currentWeek, allResponses);
        console.log("Weekly check-in saved successfully");
      } else {
        // Save initial survey
        console.log("Completing initial survey with responses:", Object.keys(allResponses).length);
        await completeInitialSurvey(selectedUser.id, allResponses);
        console.log("Initial survey saved successfully");
      }
      
      // Only navigate after confirmed save - with error handling
      setTimeout(() => {
        try {
          console.log("Navigating to loading screen");
          navigate('/loading');
          
          // Check if all family members have completed their surveys
          const allCompleted = familyMembers.every(member => 
            member.completed || member.id === selectedUser.id
          );
          
          // Navigate based on completion status after delay
          setTimeout(() => {
            try {
              if (allCompleted) {
                console.log("All family members completed surveys, going to dashboard");
                navigate('/dashboard', { replace: true });
              } else {
                console.log("Some family members still need to complete surveys, going to selection");
                navigate('/login', { replace: true });
              }
            } catch (navError) {
              console.error("Navigation error:", navError);
              // Fallback to direct URL change if navigation fails
              if (allCompleted) {
                window.location.href = '/dashboard';
              } else {
                window.location.href = '/login';
              }
            }
          }, 3000);
        } catch (navError) {
          console.error("Navigation error:", navError);
          window.location.href = '/login'; // Fallback to login page
        }
      }, 3000);
    } catch (error) {
      console.error(`Error completing ${surveyType} survey:`, error);
      alert('There was an error saving your responses. Please try again.');
      
      // Don't navigate away on error
      setShowReward(false);
      setIsProcessing(false);
    }
  };

  // Function to determine which illustration to show
  function getIllustrationForQuestion(question) {
    if (!question) return 'default';
    
    // This function determines which illustration to show based on keywords in the question
    const text = question.text.toLowerCase();
    const id = question.id || '';
    const category = question.category || '';
    
    // Create a simple hash from the question text or ID for consistent selection
    const hashCode = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash);
    };
    
    const questionHash = hashCode(text + id);
    
    // ENHANCED KEYWORD MATCHING - More specific to task types
    // Cooking and food related
    if (text.includes('cook') || text.includes('meal') || text.includes('food') || 
        text.includes('dinner') || text.includes('breakfast') || text.includes('lunch') ||
        text.includes('kitchen') || text.includes('recipe') || text.includes('grocery') ||
        text.includes('shopping') || text.includes('dishes')) {
      return 'cooking';
    }
    
    // Cleaning related
    else if (text.includes('clean') || text.includes('dust') || text.includes('vacuum') || 
             text.includes('mop') || text.includes('sweep') || text.includes('tidy') ||
             text.includes('wash') || text.includes('laundry') || text.includes('fold') ||
             text.includes('clothes') || text.includes('bed') || text.includes('bathroom')) {
      return 'cleaning';
    }
    
    // Planning and organizing
    else if (text.includes('plan') || text.includes('organize') || text.includes('schedule') ||
             text.includes('arrange') || text.includes('prepare') || text.includes('manage') ||
             text.includes('remember') || text.includes('calendar') || text.includes('list')) {
      return 'planning';
    }
    
    // School and homework
    else if (text.includes('homework') || text.includes('school') || text.includes('study') ||
             text.includes('learn') || text.includes('education') || text.includes('teacher') ||
             text.includes('class') || text.includes('assignment') || text.includes('project')) {
      return 'homework';
    }
    
    // Transportation and driving
    else if (text.includes('drive') || text.includes('pick up') || text.includes('transport') ||
             text.includes('car') || text.includes('vehicle') || text.includes('ride') || 
             text.includes('activity') || text.includes('game') || text.includes('practice')) {
      return 'driving';
    }
    
    // Emotional support
    else if (text.includes('emotional') || text.includes('support') || text.includes('feel') ||
             text.includes('comfort') || text.includes('care') || text.includes('listen') ||
             text.includes('talk') || text.includes('discuss') || text.includes('help')) {
      return 'emotional';
    }
    
    // Child-specific planning
    else if ((text.includes('plan') || text.includes('schedule') || text.includes('organize')) && 
             (text.includes('child') || text.includes('kid') || text.includes('son') || 
              text.includes('daughter') || text.includes('children'))) {
      return 'planning_kids';
    }
    
    // Default based on category - fall back to consistent category-based illustrations
    if (category === "Visible Household Tasks") {
      return (questionHash % 2 === 0) ? 'cleaning' : 'cooking';
    } 
    else if (category === "Invisible Household Tasks") {
      return (questionHash % 2 === 0) ? 'planning' : 'scheduling';
    } 
    else if (category === "Visible Parental Tasks") {
      return (questionHash % 2 === 0) ? 'homework' : 'driving';
    } 
    else if (category === "Invisible Parental Tasks") {
      return (questionHash % 2 === 0) ? 'emotional' : 'planning_kids';
    }
    
    // If all else fails, use hash-based selection
    const illustrations = ['cleaning', 'cooking', 'planning', 'scheduling', 'homework', 'driving', 'emotional', 'planning_kids'];
    return illustrations[questionHash % illustrations.length];
  }

  // Render the appropriate illustration
  const renderIllustration = () => {
    if (!questions[currentQuestionIndex]) return null;
    
    // Use our function to determine the illustration type
    const illustrationType = getIllustrationForQuestion(questions[currentQuestionIndex]);
    
    // Look up the component
    const IllustrationComponent = TaskIllustrations[illustrationType] || TaskIllustrations.default;
    
    return <IllustrationComponent />;
  };

  // Calculate progress percentage
  const progressPercentage = questions.length > 0 
    ? ((currentQuestionIndex) / (questions.length - 1)) * 100 
    : 0;

  // Find Mama and Papa users from family members
  const mamaUser = familyMembers.find(m => m.roleType === 'Mama' || m.name === 'Mama');
  const papaUser = familyMembers.find(m => m.roleType === 'Papa' || m.name === 'Papa');
  
  // Parent profile images with fallbacks
  const parents = {
    mama: {
      name: mamaUser?.name || 'Mama',
      image: mamaUser?.profilePicture || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjgiIHI9IjEyOCIgZmlsbD0iI2U5YjFkYSIvPjxjaXJjbGUgY3g9IjEyOCIgY3k9IjkwIiByPSI0MCIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0yMTUsMTcyLjVjMCwzNS05NSwzNS05NSwzNXMtOTUsMC05NS0zNWMwLTIzLjMsOTUtMTAsOTUtMTBTMjE1LDE0OS4yLDIxNSwxNzIuNVoiIGZpbGw9IiNmZmYiLz48L3N2Zz4='
    },
    papa: {
      name: papaUser?.name || 'Papa',
      image: papaUser?.profilePicture || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjgiIHI9IjEyOCIgZmlsbD0iIzg0YzRlMiIvPjxjaXJjbGUgY3g9IjEyOCIgY3k9IjkwIiByPSI0MCIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0yMTUsMTcyLjVjMCwzNS05NSwzNS05NSwzNXMtOTUsMC05NS0zNWMwLTIzLjMsOTUtMTAsOTUtMTBTMjE1LDE0OS4yLDIxNSwxNzIuNVoiIGZpbGw9IiNmZmYiLz48L3N2Zz4='
    }
  };
  
  // Current question
  const currentQuestion = questions[currentQuestionIndex];
  
  // Only render when questions are loaded
  if (!currentQuestion) {
    return <div className="flex items-center justify-center h-64">Loading fun questions...</div>;
  }
  
  return (
    <div className="max-w-3xl mx-auto bg-white p-4 shadow-lg min-h-screen flex flex-col font-roboto">
      {/* Header with user info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full overflow-hidden mr-3 border-2 border-black shadow-md">
            <img 
              src={selectedUser?.profilePicture} 
              alt={selectedUser?.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="font-bold text-black text-xl font-roboto">
              {selectedUser?.name}'s {surveyType === "weekly" ? "Weekly Adventure" : "Family Survey"}
            </h2>
            <div className="flex items-center">
              {[...Array(totalStars)].map((_, i) => (
                <Star key={i} size={16} className="text-amber-400 fill-amber-400" />
              ))}
              {totalStars > 0 && 
                <span className="text-xs text-amber-600 ml-1 font-medium font-roboto">
                  {totalStars} {totalStars === 1 ? 'Star' : 'Stars'} earned!
                </span>
              }
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <button 
            onClick={() => navigate('/login')}
            className="text-xs bg-black text-white px-3 py-1.5 rounded mb-2 hover:bg-gray-800 transition font-roboto"
            disabled={isProcessing}
          >
            Switch User
          </button>
          <div className="bg-gray-100 px-3 py-1.5 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm font-medium text-gray-800 font-roboto">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
            <div className="w-full bg-gray-200 h-1.5 mt-1 rounded-full overflow-hidden">
              <div 
                className="h-full bg-black rounded-full" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main question */}
      <div className="bg-white rounded-xl p-6 shadow-md mb-6 border-2 border-gray-100">
        {/* Category indicator with icon */}
        <div className="mb-4 flex justify-center">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            currentQuestion.category === "Visible Household Tasks" ? "bg-blue-100 text-blue-800" :
            currentQuestion.category === "Invisible Household Tasks" ? "bg-purple-100 text-purple-800" :
            currentQuestion.category === "Visible Parental Tasks" ? "bg-green-100 text-green-800" :
            "bg-pink-100 text-pink-800"
          }`}>
            {currentQuestion.category}
          </span>
        </div>
        
        <div className="text-center mb-4">
          <h2 className="text-xl font-semibold text-black">
            {currentQuestion.childText || currentQuestion.text}
          </h2>
          
          {/* Simplified explanation always visible */}
          <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-md inline-block">
            Who usually does this in your family?
          </p>
        </div>
        
        {/* Task Illustration - larger and more prominent */}
        <div className="flex justify-center mb-6">
          <div className="task-illustration p-6 bg-gray-50 rounded-lg border border-gray-100 transform hover:scale-105 transition-transform" style={{width: "280px", height: "210px"}}>
            {renderIllustration()}
          </div>
        </div>
        
        {/* Simple explanation always visible for kids */}
        <div className="mb-4 bg-gray-50 p-3 rounded-md text-sm text-gray-700 border border-gray-100">
          <p className="flex items-center justify-center">
            <Info size={16} className="mr-2 text-gray-500" />
            Pick who you see doing this most often!
          </p>
        </div>
      </div>
      
      {/* Parent selection */}
      <div className="flex justify-center items-center mb-6">
        <div className="flex w-full max-w-md justify-between items-center">
          {/* Mama */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => !isProcessing && handleSelectParent('Mama')}
              className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full focus:outline-none border-4 overflow-hidden transition-all transform hover:scale-105 ${
                selectedParent === 'Mama' 
                  ? 'border-purple-500 scale-110 animate-pulse' 
                  : 'border-purple-200 hover:border-purple-300'
              } ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
              aria-label="Select Mama"
              disabled={isProcessing}
            >
              <img 
                src={parents.mama.image} 
                alt="Mama"
                className="w-full h-full object-cover"
              />
            </button>
            <p className="mt-2 font-medium text-black">{parents.mama.name}</p>
          </div>
          
          {/* Center divider */}
          <div className="flex flex-col items-center">
            <div className="h-32 sm:h-40 w-px bg-gray-300"></div>
            <div className="bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center text-gray-800 font-bold text-sm absolute">
              OR
            </div>
          </div>
          
          {/* Papa */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => !isProcessing && handleSelectParent('Papa')}
              className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full focus:outline-none border-4 overflow-hidden transition-all transform hover:scale-105 ${
                selectedParent === 'Papa' 
                  ? 'border-blue-500 scale-110 animate-pulse' 
                  : 'border-blue-200 hover:border-blue-300'
              } ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
              aria-label="Select Papa"
              disabled={isProcessing}
            >
              <img 
                src={parents.papa.image}
                alt="Papa"
                className="w-full h-full object-cover"
              />
            </button>
            <p className="mt-2 font-medium text-black">{parents.papa.name}</p>
          </div>
        </div>
      </div>
      
      {/* Game-like progress tracker MOVED TO BOTTOM */}
      <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg mt-auto">
        <h2 className="text-lg font-semibold mb-2 text-center text-gray-800">Family Adventure Track!</h2>
        <div className="relative h-20 bg-white rounded-lg overflow-hidden border-2 border-gray-200">
          {/* Track background with markers */}
          <div className="absolute inset-0 flex items-center justify-between px-4">
            {[...Array(6)].map((_, index) => (
              <div 
                key={index} 
                className={`w-6 h-6 rounded-full z-10 flex items-center justify-center ${
                  index * (questions.length/5) <= currentQuestionIndex 
                    ? 'bg-black text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index + 1}
              </div>
            ))}
          </div>
          
          {/* Path line */}
          <div className="absolute top-1/2 left-0 right-0 h-2 bg-gray-200 transform -translate-y-1/2"></div>
          
          {/* Progress line */}
          <div 
            className={`absolute top-1/2 left-0 h-2 bg-gradient-to-r from-gray-400 to-black transform -translate-y-1/2 transition-all duration-500 ${
              showAnimatedProgress ? 'animate-pulse' : ''
            }`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
          
          {/* Mama character */}
          <div 
            className={`absolute top-2 w-10 h-10 transition-all duration-500 ${
              animation === 'selected-mama' ? 'animate-bounce' : ''
            }`}
            style={{ 
              left: `calc(${Math.min(gameStatus.mamaPosition, questions.length - 1) / (questions.length - 1) * 100}% - 16px)`,
              maxLeft: 'calc(100% - 32px)'
            }}
          >
            <div className="w-10 h-10 bg-purple-200 rounded-full border-2 border-purple-500 flex items-center justify-center overflow-hidden">
              <img 
                src={parents.mama.image} 
                alt="Mama"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          {/* Papa character */}
          <div 
            className={`absolute bottom-2 w-10 h-10 transition-all duration-500 ${
              animation === 'selected-papa' ? 'animate-bounce' : ''
            }`}
            style={{ 
              left: `calc(${Math.min(gameStatus.papaPosition, questions.length - 1) / (questions.length - 1) * 100}% - 16px)`,
              maxLeft: 'calc(100% - 32px)'
            }}
          >
            <div className="w-10 h-10 bg-blue-200 rounded-full border-2 border-blue-500 flex items-center justify-center overflow-hidden">
              <img 
                src={parents.papa.image} 
                alt="Papa"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          {/* Reward icons at intervals */}
          {[1, 2, 3, 4, 5].map(idx => (
            <div 
              key={idx}
              className="absolute top-1/2 transform -translate-y-1/2 z-0"
              style={{ left: `${(idx * 20) - 3}%` }}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <Star size={16} className={`${
                  currentQuestionIndex >= (idx * questions.length/5) 
                    ? 'text-amber-400 fill-amber-400' 
                    : 'text-gray-300'
                }`} />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Navigation footer */}
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
        <button 
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0 || isProcessing}
          className={`px-4 py-2 rounded-md flex items-center ${
            currentQuestionIndex === 0 || isProcessing
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-white text-black hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <ArrowLeft size={16} className="mr-1" />
          Back
        </button>
        
        <button
          onClick={handlePauseSurvey}
          disabled={isProcessing}
          className="px-4 py-2 rounded-md bg-white text-black hover:bg-gray-100 border border-gray-200"
        >
          Pause Survey
        </button>
        
        <div className="font-medium text-black bg-white px-3 py-1 rounded-lg border border-gray-200">
          <div className="flex items-center">
            {Math.floor(currentQuestionIndex / (questions.length / 20)) >= 1 && 
              <Star size={14} className="text-amber-400 fill-amber-400 mr-1" />}
            {currentQuestionIndex + 1} of {questions.length}
          </div>
        </div>
      </div>
      
      {/* Celebration overlay - shown when earning stars */}
      {showReward && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
          <div className="bg-white rounded-xl p-8 shadow-2xl max-w-md text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
            <div className="relative">
              {/* Stars animation */}
              <div className="absolute inset-0 stars-animation">
                {[...Array(20)].map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute animate-ping" 
                    style={{
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${1 + Math.random() * 2}s`
                    }}
                  >
                    <Star 
                      size={10 + Math.random() * 20} 
                      className="text-amber-400 fill-amber-400" 
                    />
                  </div>
                ))}
              </div>
              
              <div className="mb-4 flex justify-center">
                <div className="relative">
                  <Medal size={60} className="text-amber-500" />
                  <Star size={24} className="absolute -top-2 -right-2 text-amber-400 fill-amber-400 animate-pulse" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-black mb-2">Amazing Job!</h2>
              
              {currentQuestionIndex < questions.length - 1 ? (
                <>
                  <p className="text-black mb-3">You earned a star for your help!</p>
                  <p className="text-sm text-gray-600 mb-6">
                    Keep going to earn more stars and finish the survey!
                  </p>
                </>
              ) : (
                <>
                  <p className="text-black mb-3">You completed the whole survey!</p>
                  <p className="text-sm text-gray-600 mb-6">
                    Thank you for helping your family balance responsibilities!
                  </p>
                </>
              )}
              
              <button 
                className="px-6 py-3 bg-black text-white rounded-full font-bold hover:bg-gray-800 transform hover:scale-105 transition-all"
                onClick={() => setShowReward(false)}
              >
                {currentQuestionIndex < questions.length - 1 ? "Continue Adventure!" : "Finish!"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Custom styles for animations */}
      <style jsx="true">{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        
        .stars-animation {
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default EnhancedKidFriendlySurvey;
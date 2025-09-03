'use client';

import { useEffect, useState } from 'react';

export default function NewBadge() {
  const [isVisible, setIsVisible] = useState(true);
  
  // Create a subtle blink effect
  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(prev => !prev);
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <span 
      className={`ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-full 
                 shadow-lg shadow-green-500/20 transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-70'}`}
      style={{
        textShadow: '0 0 10px rgba(255,255,255,0.7)'
      }}
    >
      NEW
    </span>
  );
}

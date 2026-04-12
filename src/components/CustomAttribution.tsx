import React, { useState } from 'react';
import { MdInfoOutline } from 'react-icons/md';

export function CustomAttribution() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute bottom-4 right-4 z-[1000] flex items-center pointer-events-none">
      {isOpen && (
        <div className="bg-bg-nav px-3 py-2 rounded-xl shadow-lg text-xs text-text-main mr-2 pointer-events-auto">
          MapLibre | © MapTiler © OpenStreetMap contributors
        </div>
      )}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-bg-nav p-1.5 rounded-full shadow-lg text-text-main flex items-center justify-center pointer-events-auto"
      >
        <MdInfoOutline size={20} />
      </button>
    </div>
  );
}

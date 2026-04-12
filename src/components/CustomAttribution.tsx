import React, { useState } from 'react';
import { MdInfoOutline } from 'react-icons/md';
import { useDeviceType } from '../hooks/useDeviceType';

export function CustomAttribution() {
  const [isOpen, setIsOpen] = useState(false);
  const { isMobile } = useDeviceType();

  return (
    <div className={`absolute bottom-4 right-4 z-[1000] flex ${isMobile ? 'flex-col items-end' : 'items-center'} pointer-events-none`}>
      {isOpen && (
        <div className={`bg-bg-nav px-3 py-2 rounded-xl shadow-lg text-xs text-text-main pointer-events-auto ${isMobile ? 'mb-2 text-right' : 'mr-2'}`}>
          {isMobile ? (
            <>
              <div>MapLibre</div>
              <div>© MapTiler</div>
              <div>© OpenStreetMap contributors</div>
            </>
          ) : (
            'MapLibre | © MapTiler © OpenStreetMap contributors'
          )}
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

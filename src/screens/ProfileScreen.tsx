import { t } from '../i18n';
import React, { useState } from 'react';
import { useDeviceType } from '../hooks/useDeviceType';

export default function ProfileScreen() {
  const { isMobile } = useDeviceType();
  const [username, setUsername] = useState('User');
  const [showClearDataPopup, setShowClearDataPopup] = useState(false);

  const handleSave = (newUsername: string) => {
    // Intentionally empty
  };

  const exportData = () => {
    // Intentionally empty
  };

  const handleClearData = () => {
    setShowClearDataPopup(false);
  };

  return (
    <div className={`p-6 ${!isMobile ? 'max-w-[100dvh]' : ''} mx-auto w-full`}>
      {showClearDataPopup && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-bg-nav p-6 rounded-2xl max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-danger/20 text-danger rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl">delete</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Wyczyść dane</h2>
            <p className="text-inactive text-sm mb-6">
              Czy na pewno chcesz usunąć wszystkie zapisane aktywności? Tej operacji nie można cofnąć.
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setShowClearDataPopup(false)}
                className="flex-1 py-3 rounded-xl font-semibold bg-gray-800 text-white"
              >
                Anuluj
              </button>
              <button 
                onClick={() => setShowClearDataPopup(false)}
                className="flex-1 py-3 rounded-xl font-semibold bg-danger text-white"
              >
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold text-primary mb-6">{t.nav_profile}</h1>
      
      <div className="bg-bg-nav rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold mb-2">Nazwa użytkownika</h2>
        <input 
          type="text" 
          value={username}
          onChange={(e) => {
            const val = e.target.value;
            setUsername(val);
            handleSave(val);
          }}
          className="w-full bg-bg-main text-text-main rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Wpisz nazwę..."
        />
      </div>

      <div className="bg-bg-nav rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold mb-2">Zarządzanie danymi</h2>
        <button 
          onClick={exportData}
          className="w-full bg-primary text-bg-main font-bold py-3 rounded-xl hover:bg-opacity-90 transition-colors"
        >
          {t.export_data}
        </button>
        
        <button 
          onClick={() => {}}
          className="w-full bg-primary text-bg-main font-bold py-3 rounded-xl hover:bg-opacity-90 transition-colors text-center"
        >
          {t.import_data}
        </button>

        <button 
          onClick={() => setShowClearDataPopup(true)}
          className="w-full bg-transparent text-danger border-2 border-danger font-bold py-3 rounded-xl transition-colors mt-4"
        >
          Wyczyść dane
        </button>
      </div>
    </div>
  );
}

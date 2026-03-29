import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { t } from '../i18n';
import React, { useState } from 'react';

export default function ProfileScreen() {
  const profile = useLiveQuery(() => db.profile.get(1));
  const [username, setUsername] = useState(profile?.username || '');

  const handleSave = async () => {
    if (profile) {
      await db.profile.update(1, { username });
    } else {
      await db.profile.add({ id: 1, username });
    }
    alert('Zapisano profil');
  };

  const exportData = async () => {
    const sessions = await db.sessions.toArray();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessions));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "open_fit_tracker_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    alert(t.export_success);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          if (Array.isArray(data)) {
            await db.sessions.bulkPut(data);
            alert(t.import_success);
          } else {
            alert(t.error_occurred);
          }
        } catch (err) {
          alert(t.error_occurred);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-primary mb-6">{t.nav_profile}</h1>
      
      <div className="bg-bg-nav rounded-2xl p-6 mb-6">
        <label className="block text-sm text-inactive mb-2">Nazwa użytkownika</label>
        <input 
          type="text" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-bg-main text-text-main rounded-xl p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Wpisz nazwę..."
        />
        <button 
          onClick={handleSave}
          className="w-full bg-primary text-bg-main font-bold py-3 rounded-xl hover:bg-opacity-90 transition-colors"
        >
          Zapisz
        </button>
      </div>

      <div className="bg-bg-nav rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold mb-2">Zarządzanie danymi</h2>
        <button 
          onClick={exportData}
          className="w-full bg-bg-main text-primary border border-primary font-bold py-3 rounded-xl hover:bg-opacity-90 transition-colors"
        >
          {t.export_data}
        </button>
        
        <label className="w-full bg-bg-main text-primary border border-primary font-bold py-3 rounded-xl hover:bg-opacity-90 transition-colors text-center cursor-pointer">
          {t.import_data}
          <input type="file" accept=".json" className="hidden" onChange={importData} />
        </label>

        <button 
          onClick={async () => {
            if (window.confirm('Czy na pewno chcesz usunąć wszystkie dane?')) {
              await db.sessions.clear();
              alert('Dane zostały usunięte');
            }
          }}
          className="w-full bg-transparent text-danger border border-danger font-bold py-3 rounded-xl hover:bg-danger hover:bg-opacity-10 transition-colors mt-4"
        >
          Wyczyść dane
        </button>
      </div>
    </div>
  );
}

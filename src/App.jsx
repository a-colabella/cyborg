import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CanvasPage from './components/pages/CanvasPage';
import MyAppsPage from './components/pages/MyAppsPage';
import SettingsPage from './components/pages/SettingsPage';
import { initDatabase } from './db';

function App() {
  const [currentPage, setCurrentPage] = useState('canvas');
  const [messages, setMessages] = useState([]);
  const [currentComponent, setCurrentComponent] = useState(null);
  const [currentSchema, setCurrentSchema] = useState(null);
  const [currentAppInfo, setCurrentAppInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDatabase()
      .then(() => setDbReady(true))
      .catch((err) => console.error('Failed to initialize database:', err));
  }, []);

  const handleLoadApp = (code, appInfo, schema) => {
    setCurrentComponent(code);
    setCurrentSchema(schema || null);
    setCurrentAppInfo(appInfo);
    setCurrentPage('canvas');
  };

  return (
    <div className="flex h-screen w-screen bg-bg-primary">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />

      <main className="flex-1 h-full overflow-hidden">
        {currentPage === 'canvas' && (
          <CanvasPage
            messages={messages}
            setMessages={setMessages}
            currentComponent={currentComponent}
            setCurrentComponent={setCurrentComponent}
            currentSchema={currentSchema}
            setCurrentSchema={setCurrentSchema}
            currentAppInfo={currentAppInfo}
            setCurrentAppInfo={setCurrentAppInfo}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}
        {currentPage === 'myapps' && (
          <MyAppsPage onLoadApp={handleLoadApp} />
        )}
        {currentPage === 'settings' && (
          <SettingsPage />
        )}
      </main>
    </div>
  );
}

export default App;

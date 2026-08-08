import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AiChatStudio } from './components/AiChatStudio';
import { ScenarioStudio } from './components/ScenarioStudio';
import { DictionaryView } from './components/DictionaryView';
import { PracticeHub } from './components/PracticeHub';
import { ProgressDashboard } from './components/ProgressDashboard';
import { DialectType } from './types';
import { stopSpeech } from './lib/speech';

export function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'dictionary' | 'scenarios' | 'practice' | 'progress'>('chat');
  const [activeDialect, setActiveDialect] = useState<DialectType>('en-US');

  useEffect(() => {
    // Initial state setup if hash present
    const hash = window.location.hash.replace('#', '');
    if (['chat', 'dictionary', 'scenarios', 'practice', 'progress'].includes(hash)) {
      setActiveTab(hash as any);
    } else {
      window.history.replaceState({ tab: 'chat' }, '', '#chat');
    }

    const handlePopState = (e: PopStateEvent) => {
      stopSpeech();
      if (e.state && e.state.tab) {
        setActiveTab(e.state.tab);
      } else {
        const h = window.location.hash.replace('#', '');
        if (['chat', 'dictionary', 'scenarios', 'practice', 'progress'].includes(h)) {
          setActiveTab(h as any);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    let appBackButtonListener: { remove: () => void } | null = null;
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      import('@capacitor/app').then(({ App: CapApp }) => {
        CapApp.addListener('backButton', ({ canGoBack }) => {
          if (window.history.length > 1 && canGoBack) {
            window.history.back();
          } else {
            CapApp.exitApp();
          }
        }).then((listener) => {
          appBackButtonListener = listener;
        }).catch(() => {});
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (appBackButtonListener && typeof appBackButtonListener.remove === 'function') {
        appBackButtonListener.remove();
      }
    };
  }, []);

  const handleTabSelect = (tab: 'chat' | 'dictionary' | 'scenarios' | 'practice' | 'progress') => {
    if (tab !== activeTab) {
      stopSpeech();
      setActiveTab(tab);
      window.history.pushState({ tab }, '', `#${tab}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabSelect}
        activeDialect={activeDialect}
        setActiveDialect={setActiveDialect}
      />

      <main className="flex-1">
        {activeTab === 'chat' && <AiChatStudio activeDialect={activeDialect} />}
        {activeTab === 'scenarios' && <ScenarioStudio activeDialect={activeDialect} />}
        {activeTab === 'dictionary' && <DictionaryView activeDialect={activeDialect} />}
        {activeTab === 'practice' && <PracticeHub activeDialect={activeDialect} />}
        {activeTab === 'progress' && <ProgressDashboard />}
      </main>
    </div>
  );
}

export default App;


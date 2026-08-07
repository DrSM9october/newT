import React, { useState } from 'react';
import { Header } from './components/Header';
import { AiChatStudio } from './components/AiChatStudio';
import { ScenarioStudio } from './components/ScenarioStudio';
import { DictionaryView } from './components/DictionaryView';
import { PracticeHub } from './components/PracticeHub';
import { ProgressDashboard } from './components/ProgressDashboard';
import { DialectType } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'dictionary' | 'scenarios' | 'practice' | 'progress'>('chat');
  const [activeDialect, setActiveDialect] = useState<DialectType>('en-US');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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

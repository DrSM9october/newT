import React, { useState, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Header } from './components/Header';
import { NetworkStatusBanner } from './components/NetworkStatusBanner';
import { AiChatStudio } from './components/AiChatStudio';
import { DictionaryView } from './components/DictionaryView';
import { ScenarioStudio } from './components/ScenarioStudio';
import { PracticeHub } from './components/PracticeHub';
import { ProgressDashboard } from './components/ProgressDashboard';
import { DifficultyLevel, UserProgress, DialectType, GenderType } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'dictionary' | 'scenarios' | 'drills' | 'progress'>('chat');
  const [userLevel, setUserLevel] = useState<DifficultyLevel>('A2');
  const [activeDialect, setActiveDialect] = useState<DialectType>('en-US');
  const [userGender, setUserGender] = useState<GenderType>('masculine');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [forcedOfflineMode, setForcedOfflineMode] = useState<boolean>(false);

  // Handle mobile Back Button navigation across tabs
  useEffect(() => {
    if (activeTab === 'chat') return;

    window.history.pushState({ tab: activeTab }, '');

    const handlePopState = () => {
      setActiveTab('chat');
    };

    window.addEventListener('popstate', handlePopState);

    let backListener: any = null;
    CapacitorApp.addListener('backButton', () => {
      setActiveTab('chat');
    }).then((listener) => {
      backListener = listener;
    }).catch(() => {
      // non-native
    });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (backListener && typeof backListener.remove === 'function') {
        backListener.remove();
      }
    };
  }, [activeTab]);

  // User progress state with localStorage backup
  const [progress, setProgress] = useState<UserProgress>(() => {
    try {
      const saved = localStorage.getItem('lingua_ai_progress');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load progress', e);
    }
    return {
      masteredWordIds: ['w1', 'w4', 'w5'],
      bookmarkedWordIds: ['w12', 'w15'],
      completedScenarioIds: [],
      dailyStreak: 3,
      totalPracticeMinutes: 45,
      completedExercisesCount: 12,
      xpPoints: 180,
      level: 'A2',
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('lingua_ai_progress', JSON.stringify(progress));
    } catch (e) {
      console.error('Failed to save progress', e);
    }
  }, [progress]);

  // Dark mode side effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleToggleBookmark = (id: string) => {
    setProgress((prev) => {
      const exists = prev.bookmarkedWordIds.includes(id);
      return {
        ...prev,
        bookmarkedWordIds: exists
          ? prev.bookmarkedWordIds.filter((item) => item !== id)
          : [...prev.bookmarkedWordIds, id],
      };
    });
  };

  const handleToggleMastered = (id: string) => {
    setProgress((prev) => {
      const exists = prev.masteredWordIds.includes(id);
      return {
        ...prev,
        masteredWordIds: exists
          ? prev.masteredWordIds.filter((item) => item !== id)
          : [...prev.masteredWordIds, id],
        xpPoints: exists ? prev.xpPoints - 10 : prev.xpPoints + 10,
      };
    });
  };

  const handleIncrementXp = (amount: number) => {
    setProgress((prev) => ({
      ...prev,
      xpPoints: prev.xpPoints + amount,
      completedExercisesCount: prev.completedExercisesCount + 1,
      totalPracticeMinutes: prev.totalPracticeMinutes + 2,
    }));
  };

  const handleCompleteScenario = (scId: string) => {
    setProgress((prev) => ({
      ...prev,
      completedScenarioIds: prev.completedScenarioIds.includes(scId)
        ? prev.completedScenarioIds
        : [...prev.completedScenarioIds, scId],
      xpPoints: prev.xpPoints + 50,
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors dir-rtl selection:bg-teal-500 selection:text-white">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userLevel={userLevel}
        setUserLevel={setUserLevel}
        activeDialect={activeDialect}
        setActiveDialect={setActiveDialect}
        userGender={userGender}
        setUserGender={setUserGender}
        streak={progress.dailyStreak}
        masteredCount={progress.masteredWordIds.length}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Connection & Offline Status Banner */}
      <NetworkStatusBanner
        forcedOfflineMode={forcedOfflineMode}
        onToggleForcedOffline={setForcedOfflineMode}
      />

      {/* Main View Router */}
      <main className="pb-12">
        {activeTab === 'chat' && (
          <AiChatStudio
            userLevel={userLevel}
            activeDialect={activeDialect}
            userGender={userGender}
            forcedOfflineMode={forcedOfflineMode}
          />
        )}

        {activeTab === 'dictionary' && (
          <DictionaryView
            userLevel={userLevel}
            activeDialect={activeDialect}
            userGender={userGender}
            masteredIds={progress.masteredWordIds}
            bookmarkedIds={progress.bookmarkedWordIds}
            onToggleBookmark={handleToggleBookmark}
            onToggleMastered={handleToggleMastered}
          />
        )}

        {activeTab === 'scenarios' && (
          <ScenarioStudio
            userLevel={userLevel}
            activeDialect={activeDialect}
            userGender={userGender}
            onCompleteScenario={handleCompleteScenario}
          />
        )}

        {activeTab === 'drills' && (
          <PracticeHub
            userLevel={userLevel}
            activeDialect={activeDialect}
            userGender={userGender}
            onIncrementXp={handleIncrementXp}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressDashboard progress={progress} userLevel={userLevel} />
        )}
      </main>
    </div>
  );
}

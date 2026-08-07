import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AiChatStudio } from './components/AiChatStudio';
import { DictionaryView } from './components/DictionaryView';
import { ScenarioStudio } from './components/ScenarioStudio';
import { PracticeHub } from './components/PracticeHub';
import { ProgressDashboard } from './components/ProgressDashboard';
import { DifficultyLevel, UserProgress } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'dictionary' | 'scenarios' | 'drills' | 'progress'>('chat');
  const [userLevel, setUserLevel] = useState<DifficultyLevel>('A2');
  const [darkMode, setDarkMode] = useState<boolean>(false);

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
        streak={progress.dailyStreak}
        masteredCount={progress.masteredWordIds.length}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Main View Router */}
      <main className="pb-12">
        {activeTab === 'chat' && <AiChatStudio userLevel={userLevel} />}

        {activeTab === 'dictionary' && (
          <DictionaryView
            userLevel={userLevel}
            masteredIds={progress.masteredWordIds}
            bookmarkedIds={progress.bookmarkedWordIds}
            onToggleBookmark={handleToggleBookmark}
            onToggleMastered={handleToggleMastered}
          />
        )}

        {activeTab === 'scenarios' && (
          <ScenarioStudio userLevel={userLevel} onCompleteScenario={handleCompleteScenario} />
        )}

        {activeTab === 'drills' && (
          <PracticeHub userLevel={userLevel} onIncrementXp={handleIncrementXp} />
        )}

        {activeTab === 'progress' && (
          <ProgressDashboard progress={progress} userLevel={userLevel} />
        )}
      </main>
    </div>
  );
}

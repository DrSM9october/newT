import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, HardDrive, Download, Sparkles, ShieldCheck, Database, RefreshCw } from 'lucide-react';
import { exportOfflineDataAsJSON, exportBookmarksAsCSV, getStoredBookmarks } from '../lib/offlineStorage';
import { OFFLINE_WORDS_DATABASE } from '../data/dictionaryData';

interface NetworkStatusBannerProps {
  forcedOfflineMode: boolean;
  onToggleForcedOffline: (val: boolean) => void;
}

export const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({
  forcedOfflineMode,
  onToggleForcedOffline,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleExportJSON = () => {
    exportOfflineDataAsJSON();
    setShowExportModal(false);
  };

  const handleExportCSV = () => {
    const bookmarkedIds = getStoredBookmarks();
    const bookmarkedWords = OFFLINE_WORDS_DATABASE.filter((w) => bookmarkedIds.includes(w.id));
    exportBookmarksAsCSV(bookmarkedWords.length > 0 ? bookmarkedWords : OFFLINE_WORDS_DATABASE.slice(0, 50));
    setShowExportModal(false);
  };

  const isActuallyOfflineMode = !isOnline || forcedOfflineMode;

  return (
    <div className="bg-slate-900 text-white border-b border-slate-800 px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {isActuallyOfflineMode ? (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 animate-pulse">
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span>موتور محلی آفلاین فعال است (بدون نیاز به اینترنت و بدون قطعی)</span>
            </span>
          ) : (
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>اتصال آنلاین برقرار - پشتیبانی از هوش مصنوعی Gemini 2.5</span>
            </span>
          )}

          <span className="hidden md:inline text-slate-400 text-[11px]">
            {isActuallyOfflineMode
              ? 'تمامی امکانات دیکشنری، لهجه‌ها، تلفظ صوتی، گرامر و تمرین‌ها ۱۰۰٪ آفلاین کار می‌کنند.'
              : 'دسترسی همزمان به تحلیل پیشرفته آنلاین و پایگاه داده محلی.'}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Forced Offline Toggle */}
          <button
            onClick={() => onToggleForcedOffline(!forcedOfflineMode)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all border ${
              forcedOfflineMode
                ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="تغییر دستی بین حالت آفلاین محلی و آنلاین"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>{forcedOfflineMode ? 'حالت آفلاین (اجباری)' : 'تغییر به آفلاین دستی'}</span>
          </button>

          {/* Export & Backup Data */}
          <button
            onClick={() => setShowExportModal(true)}
            className="px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white border border-indigo-500 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
            title="پشتیبان‌گیری آفلاین از کلمات و یادداشت‌ها"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی و پشتیبان آفلاین</span>
          </button>
        </div>
      </div>

      {/* Export Options Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-900 dark:text-white space-y-4 shadow-xl">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 font-bold text-sm">
              <Database className="w-5 h-5 text-indigo-500" />
              <h3>پشتیبان‌گیری و خروجی داده‌های آفلاین</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              شما می‌توانید تمام اطلاعات دیکشنری، نشان‌شده‌ها، یادداشت‌های شخصی و آمار مطالعه خود را به صورت فایل ذخیره کنید تا حتی بدون اینترنت روی گوشی یا کامپیوتر همراه داشته باشید:
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleExportJSON}
                className="w-full text-right p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-all font-bold text-xs flex items-center justify-between text-indigo-900 dark:text-indigo-200"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>دانلود پشتیبان کامل (فرمت JSON)</span>
                </div>
                <span className="text-[10px] bg-indigo-200 dark:bg-indigo-900 px-2 py-0.5 rounded">شامل یادداشت‌ها</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="w-full text-right p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-all font-bold text-xs flex items-center justify-between text-slate-900 dark:text-white"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>دانلود کلمات نشان‌شده (فرمت اکسل / CSV)</span>
                </div>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">مخصوص اکسل</span>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 transition-all"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

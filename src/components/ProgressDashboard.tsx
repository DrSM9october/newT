import React from 'react';
import { BarChart3, Flame, BookOpen, Award, Target, CheckCircle } from 'lucide-react';

export const ProgressDashboard: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 md:p-8 flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">داشبورد پیشرفت یادگیری شما</h2>
          <p className="text-xs md:text-sm text-slate-300">
            گزارش فعالیت‌ها، تسلط بر لغات و زنجیره استمرار روزانه
          </p>
        </div>
        <div className="p-4 bg-indigo-600/20 rounded-2xl border border-indigo-500/30 text-indigo-300">
          <Award className="w-8 h-8" />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2">
          <div className="flex items-center justify-between text-amber-400">
            <Flame className="w-6 h-6" />
            <span className="text-xs font-bold bg-amber-950 px-2.5 py-1 rounded-full border border-amber-800">
              استمرار
            </span>
          </div>
          <p className="text-2xl font-black text-white">۵ روز</p>
          <p className="text-xs text-slate-400">زنجیره مطالعه متوالی</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2">
          <div className="flex items-center justify-between text-indigo-400">
            <BookOpen className="w-6 h-6" />
            <span className="text-xs font-bold bg-indigo-950 px-2.5 py-1 rounded-full border border-indigo-800">
              واژگان
            </span>
          </div>
          <p className="text-2xl font-black text-white">۴۲ واژه</p>
          <p className="text-xs text-slate-400">لغات مرورشده و ذخیره</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2">
          <div className="flex items-center justify-between text-emerald-400">
            <CheckCircle className="w-6 h-6" />
            <span className="text-xs font-bold bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800">
              سناریوها
            </span>
          </div>
          <p className="text-2xl font-black text-white">۸ سناریو</p>
          <p className="text-xs text-slate-400">نقش‌آفرینی تکمیل‌شده</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2">
          <div className="flex items-center justify-between text-purple-400">
            <Target className="w-6 h-6" />
            <span className="text-xs font-bold bg-purple-950 px-2.5 py-1 rounded-full border border-purple-800">
              امتیاز
            </span>
          </div>
          <p className="text-2xl font-black text-white">۳۵۰ امتیاز</p>
          <p className="text-xs text-slate-400">سطح فعلی: B1 (متوسط)</p>
        </div>
      </div>
    </div>
  );
};

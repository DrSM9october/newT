import React from 'react';
import { BarChart3, Flame, BookOpen, Award, Target, CheckCircle } from 'lucide-react';

export const ProgressDashboard: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white rounded-3xl p-6 md:p-8 flex items-center justify-between shadow-md">
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">داشبورد پیشرفت یادگیری شما</h2>
          <p className="text-xs md:text-sm text-indigo-100 font-medium">
            گزارش فعالیت‌ها، تسلط بر لغات و زنجیره استمرار روزانه
          </p>
        </div>
        <div className="p-4 bg-white/20 rounded-2xl border border-white/30 text-white backdrop-blur-sm">
          <Award className="w-8 h-8" />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-amber-600">
            <Flame className="w-6 h-6" />
            <span className="text-xs font-bold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
              استمرار
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">۵ روز</p>
          <p className="text-xs text-slate-500 font-medium">زنجیره مطالعه متوالی</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-indigo-600">
            <BookOpen className="w-6 h-6" />
            <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200">
              واژگان
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">۴۲ واژه</p>
          <p className="text-xs text-slate-500 font-medium">لغات مرورشده و ذخیره</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600">
            <CheckCircle className="w-6 h-6" />
            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
              سناریوها
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">۸ سناریو</p>
          <p className="text-xs text-slate-500 font-medium">نقش‌آفرینی تکمیل‌شده</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-purple-600">
            <Target className="w-6 h-6" />
            <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full border border-purple-200">
              امتیاز
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">۳۵۰ امتیاز</p>
          <p className="text-xs text-slate-500 font-medium">سطح فعلی: B1 (متوسط)</p>
        </div>
      </div>
    </div>
  );
};

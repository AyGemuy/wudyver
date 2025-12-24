import Card from "@/components/ui/Card";
import { Icon } from '@iconify/react';
import useDarkMode from "@/hooks/useDarkMode";


const StatCard = ({ title, value, icon, iconClass, valueClass = "text-2xl", isLoading }) => {
  const [isDark] = useDarkMode();

  return (
    <Card bodyClass="p-4" className={`w-full border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-indigo-200 bg-white'} rounded-xl shadow-md`}>
      <div className="flex items-center">
        {icon && (
          <div className={`w-10 h-10 flex items-center justify-center rounded-full ${iconClass || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'} mr-3`}>
            <Icon icon={icon} className="text-xl" />
          </div>
        )}
        <div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'} font-medium mb-0`}>{title}</p>
          {isLoading ? (
            <p className={`font-semibold ${valueClass} ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Loading...</p>
          ) : (
            <p className={`font-semibold ${valueClass} ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{value}</p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default StatCard;
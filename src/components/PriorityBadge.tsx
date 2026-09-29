import React from 'react';

export interface PriorityBadgeProps {
  priority: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  };

  const getStyle = (p: string) => {
    switch (p) {
      case 'V. Urgent':
        return 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-500/20';
      case 'Urgent':
        return 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-500/20';
      case 'EOD':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20';
      case 'End of Week':
        return 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/20';
      case '15 Days':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-500/20';
      case 'End of Month':
        return 'bg-slate-50 text-slate-700 border-slate-200 ring-1 ring-slate-500/20';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border tracking-wide uppercase transition-colors ${sizeClasses[size]} ${getStyle(
        priority
      )}`}
    >
      <span
        className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
          priority === 'V. Urgent'
            ? 'bg-red-600 animate-pulse'
            : priority === 'Urgent'
            ? 'bg-orange-500'
            : priority === 'EOD'
            ? 'bg-amber-500'
            : priority === 'End of Week'
            ? 'bg-blue-500'
            : priority === '15 Days'
            ? 'bg-indigo-500'
            : 'bg-slate-400'
        }`}
      />
      {priority}
    </span>
  );
};

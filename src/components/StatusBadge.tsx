import React from 'react';

export interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  };

  const getStyle = (s: string) => {
    switch (s) {
      case 'Not Started':
        return 'bg-zinc-100 text-zinc-700 border-zinc-300';
      case 'Started':
        return 'bg-sky-50 text-sky-700 border-sky-300';
      case 'Half-way':
        return 'bg-purple-50 text-purple-700 border-purple-300';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-2xs ${sizeClasses[size]} ${getStyle(
        status
      )}`}
    >
      <span
        className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
          status === 'Not Started'
            ? 'bg-zinc-400'
            : status === 'Started'
            ? 'bg-sky-500'
            : status === 'Half-way'
            ? 'bg-purple-500'
            : 'bg-emerald-500'
        }`}
      />
      {status}
    </span>
  );
};

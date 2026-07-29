import React from 'react';
import { Zap, TrendingUp } from 'lucide-react';

/**
 * Badge Component
 * 
 * Types:
 * - compression: Noise reduction indicator
 * - rank: Story ranking number
 * - update: New update indicator
 */

const Badge = ({
  type = 'compression',
  value,
  className = '',
  ...props
}) => {
  if (type === 'compression') {
    return (
      <div
        className={`inline-flex items-center gap-1 h-5 px-2 rounded-md bg-[var(--color-accent-main)]/20 text-[var(--color-accent-main)] text-xs font-medium ${className}`}
        {...props}
      >
        <Zap size={12} />
        <span>Reduced {value}%</span>
      </div>
    );
  }
  
  if (type === 'rank') {
    return (
      <div
        className={`flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--color-accent-main)] to-[var(--color-accent-secondary)] text-[var(--color-text-primary)] text-xs font-semibold shadow-sm ${className}`}
        {...props}
      >
        {value}
      </div>
    );
  }
  
  if (type === 'update') {
    return (
      <div
        className={`inline-flex items-center gap-1 h-5 px-2 rounded-md bg-[var(--color-positive)]/20 text-[var(--color-positive)] text-xs font-medium ${className}`}
        {...props}
      >
        <TrendingUp size={12} />
        <span>{value}</span>
      </div>
    );
  }
  
  return null;
};

export default Badge;


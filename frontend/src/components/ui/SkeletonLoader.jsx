import React from 'react';

/**
 * SkeletonLoader Component
 * 
 * Animated loading placeholder
 */

const SkeletonLoader = ({ 
  variant = 'card',
  count = 1,
  className = '' 
}) => {
  const shimmerStyles = 'animate-pulse bg-[var(--color-bg-subtle)]';
  
  const CardSkeleton = () => (
    <div className="p-5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] space-y-4">
      <div className="flex items-center justify-between">
        <div className={`h-6 w-24 rounded-full ${shimmerStyles}`} />
        <div className={`h-5 w-32 rounded-md ${shimmerStyles}`} />
      </div>
      <div className={`h-6 w-3/4 rounded ${shimmerStyles}`} />
      <div className="space-y-2">
        <div className={`h-4 w-full rounded ${shimmerStyles}`} />
        <div className={`h-4 w-full rounded ${shimmerStyles}`} />
        <div className={`h-4 w-2/3 rounded ${shimmerStyles}`} />
      </div>
      <div className="flex gap-2">
        <div className={`h-6 w-16 rounded-full ${shimmerStyles}`} />
        <div className={`h-6 w-16 rounded-full ${shimmerStyles}`} />
        <div className={`h-6 w-16 rounded-full ${shimmerStyles}`} />
      </div>
    </div>
  );
  
  const LineSkeleton = () => (
    <div className={`h-4 rounded ${shimmerStyles} ${className}`} />
  );
  
  const CircleSkeleton = () => (
    <div className={`rounded-full ${shimmerStyles} ${className}`} />
  );
  
  if (variant === 'card') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </>
    );
  }
  
  if (variant === 'line') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <LineSkeleton key={i} />
        ))}
      </>
    );
  }
  
  if (variant === 'circle') {
    return <CircleSkeleton />;
  }
  
  return null;
};

export default SkeletonLoader;


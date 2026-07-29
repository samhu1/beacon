import React from 'react';

/**
 * Pill Component
 * 
 * Used for:
 * - Category tags
 * - Source chips
 * - Filter pills
 * 
 * Variants:
 * - default: Subtle background
 * - category: Color-coded by category
 * - sentiment: Positive/negative/neutral
 */

const Pill = ({
  children,
  variant = 'default',
  category,
  sentiment,
  dot = false,
  interactive = false,
  selected = false,
  className = '',
  onClick,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium transition-all duration-[120ms] ease-out';
  
  const getCategoryColor = (cat) => {
    const colors = {
      ai: 'bg-[var(--color-category-ai)]/20 text-[var(--color-category-ai)] border-[var(--color-category-ai)]/30',
      markets: 'bg-[var(--color-category-markets)]/20 text-[var(--color-category-markets)] border-[var(--color-category-markets)]/30',
      politics: 'bg-[var(--color-category-politics)]/20 text-[var(--color-category-politics)] border-[var(--color-category-politics)]/30',
      culture: 'bg-[var(--color-category-culture)]/20 text-[var(--color-category-culture)] border-[var(--color-category-culture)]/30',
      world: 'bg-[var(--color-category-world)]/20 text-[var(--color-category-world)] border-[var(--color-category-world)]/30'
    };
    return colors[cat?.toLowerCase()] || colors.world;
  };
  
  const getSentimentColor = (sent) => {
    const colors = {
      positive: 'bg-[var(--color-positive-subtle)] text-[var(--color-positive)] border-[var(--color-positive)]/30',
      negative: 'bg-[var(--color-negative-subtle)] text-[var(--color-negative)] border-[var(--color-negative)]/30',
      neutral: 'bg-[var(--color-neutral-subtle)] text-[var(--color-neutral)] border-[var(--color-neutral)]/30'
    };
    return colors[sent?.toLowerCase()] || colors.neutral;
  };
  
  let variantStyles = 'bg-[var(--color-bg-elevated)]/55 backdrop-blur-sm text-[var(--color-text-secondary)] border border-white/8 hover:border-white/14';
  
  if (variant === 'category' && category) {
    variantStyles = `bg-[var(--color-bg-main)] text-[var(--color-text-primary)] border border-[var(--color-border-strong)] hover:border-[var(--color-border-accent)]`;
    // We'll apply the specific category color to the text or border dynamically within the pill if needed, 
    // but the getCategoryColor logic is fine, let's keep using it
    variantStyles = `bg-black/20 border ${getCategoryColor(category)} backdrop-blur-sm`;
  } else if (variant === 'sentiment' && sentiment) {
    variantStyles = `bg-black/20 border ${getSentimentColor(sentiment)} backdrop-blur-sm`;
  }
  
  const interactiveStyles = interactive
    ? 'cursor-pointer hover:bg-[var(--color-bg-hover)]/75 hover:text-[var(--color-text-primary)] hover:border-white/16 active:scale-[0.98]'
    : '';
  
  const selectedStyles = selected
    ? 'bg-[var(--color-text-primary)] text-black border-[var(--color-text-primary)] shadow-[var(--shadow-glow-accent)]'
    : '';
  
  const combinedStyles = `
    ${baseStyles}
    ${variantStyles}
    ${interactiveStyles}
    ${selectedStyles}
    ${className}
  `.trim().replace(/\s+/g, ' ');
  
  const getDotColor = () => {
    if (sentiment === 'positive') return 'bg-[var(--color-positive)]';
    if (sentiment === 'negative') return 'bg-[var(--color-negative)]';
    if (sentiment === 'neutral') return 'bg-[var(--color-neutral)]';
    return 'bg-[var(--color-text-tertiary)]';
  };
  
  return (
    <span className={combinedStyles} onClick={onClick} {...props}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${getDotColor()}`} />}
      {children}
    </span>
  );
};

export default Pill;

import React from 'react';
import { motion } from 'framer-motion';

/**
 * Button Component
 * 
 * Variants:
 * - primary: Accent background, main CTA
 * - secondary: Transparent with border
 * - ghost: No background, minimal
 * - icon: Square icon button
 * 
 * Sizes:
 * - sm: 32px height
 * - md: 40px height (default)
 * - lg: 48px height
 */

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  disabled = false,
  className = '',
  onClick,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-[180ms] ease-out focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-main)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-main)]';
  
  const variantStyles = {
    primary: 'bg-[var(--color-accent-main)] text-black font-semibold hover:bg-[var(--color-accent-main-hover)] hover:shadow-[var(--shadow-subtle)] active:scale-[0.99]',
    secondary: 'bg-[var(--color-bg-subtle)]/85 border border-white/10 text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] hover:border-white/20 active:scale-[0.99]',
    ghost: 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]/70 hover:text-[var(--color-text-primary)] active:scale-[0.99]',
    icon: 'bg-[var(--color-bg-elevated)]/55 backdrop-blur-sm border border-white/8 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] hover:border-white/16 active:scale-[0.98]'
  };
  
  const sizeStyles = {
    sm: variant === 'icon' ? 'w-8 h-8 rounded-md' : 'h-8 px-4 text-xs rounded-md',
    md: variant === 'icon' ? 'w-10 h-10 rounded-md' : 'h-10 px-6 text-sm rounded-md',
    lg: variant === 'icon' ? 'w-12 h-12 rounded-md' : 'h-12 px-8 text-base rounded-md'
  };
  
  const disabledStyles = 'opacity-40 cursor-not-allowed hover:transform-none hover:shadow-none';
  
  const combinedStyles = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${disabled ? disabledStyles : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');
  
  const content = (
    <>
      {icon && iconPosition === 'left' && (
        <span className={variant !== 'icon' && children ? 'mr-2' : ''}>
          {icon}
        </span>
      )}
      {variant !== 'icon' && children}
      {icon && iconPosition === 'right' && (
        <span className={children ? 'ml-2' : ''}>
          {icon}
        </span>
      )}
    </>
  );
  
  if (variant === 'primary' || variant === 'secondary') {
    return (
      <motion.button
        className={combinedStyles}
        disabled={disabled}
        onClick={onClick}
        whileTap={!disabled ? { scale: 0.98 } : {}}
        {...props}
      >
        {content}
      </motion.button>
    );
  }
  
  return (
    <button
      className={combinedStyles}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {content}
    </button>
  );
};

export default Button;

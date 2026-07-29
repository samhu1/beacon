import React, { forwardRef } from 'react';
import { Search } from 'lucide-react';

/**
 * Input Component
 * 
 * Variants:
 * - search: With search icon
 * - default: Standard input
 */

const Input = forwardRef(({
  type = 'text',
  variant = 'default',
  placeholder = '',
  value,
  onChange,
  className = '',
  ...props
}, ref) => {
  const baseStyles = 'w-full h-11 px-4 rounded-md bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] transition-all duration-[180ms] ease-out focus:outline-none focus:border-[var(--color-border-accent)] focus:shadow-[var(--shadow-glow-accent)]';
  
  const combinedStyles = `${baseStyles} ${className}`.trim();
  
  if (variant === 'search') {
    return (
      <div className="relative w-full">
        <Search 
          size={20} 
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none"
        />
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`${combinedStyles} pl-11`}
          {...props}
        />
      </div>
    );
  }
  
  return (
    <input
      ref={ref}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={combinedStyles}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export default Input;


import React from "react";
import { motion } from "framer-motion";

/**
 * Card Component
 *
 * Variants:
 * - standard: Full story card (20px padding, 16px radius)
 * - compact: Briefing card (16px padding, 12px radius)
 * - elevated: Extra shadow for emphasis
 *
 * Interactive:
 * - Hover lift and shadow enhancement
 * - Optional click handler
 */

const Card = ({
  children,
  variant = "standard",
  interactive = false,
  selected = false,
  className = "",
  onClick,
  ...props
}) => {
  const baseStyles =
    "bg-[var(--color-bg-elevated)]/68 backdrop-blur-md border border-white/6 shadow-[var(--shadow-subtle)] transition-all duration-[180ms] ease-out";

  const variantStyles = {
    standard: "p-5 rounded-lg",
    compact: "p-4 rounded-md",
    elevated: "p-5 rounded-lg shadow-[var(--shadow-medium)]",
  };

  const interactiveStyles = interactive
    ? "cursor-pointer hover:border-white/14 hover:shadow-[var(--shadow-medium)] hover:bg-[var(--color-bg-elevated)]/82 active:scale-[0.995]"
    : "";

  const selectedStyles = selected
    ? "border-[var(--color-border-accent)] shadow-[var(--shadow-glow-accent)]"
    : "";

  const combinedStyles = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${interactiveStyles}
    ${selectedStyles}
    ${className}
  `
    .trim()
    .replace(/\s+/g, " ");

  if (interactive) {
    return (
      <motion.div
        className={combinedStyles}
        onClick={onClick}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.995 }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={combinedStyles} onClick={onClick} {...props}>
      {children}
    </div>
  );
};

export default Card;

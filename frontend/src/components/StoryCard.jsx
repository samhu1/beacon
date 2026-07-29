import React from 'react';
import { Bookmark, EyeOff, ExternalLink, Clock } from 'lucide-react';
import { Card, Pill, Badge, Button } from './ui';
import { motion } from 'framer-motion';

/**
 * StoryCard Component
 * 
 * Full-featured story card for Stream view
 * Includes: category, title, summary, sources, timeline, actions
 */

const StoryCard = ({
  story,
  isSaved = false,
  onSave,
  onHide,
  onOpen,
  className = ''
}) => {
  const {
    title,
    category = 'World',
    sentiment = 'neutral',
    compression = 72,
    summary = [],
    sources = [],
    timeline = {},
    updatedAt = '14 min ago',
    isNew = false,
    ranks = []
  } = story;
  
  return (
    <Card interactive onClick={() => onOpen?.(story)} className={`${className} group ${isSaved ? 'ring-1 ring-[var(--color-accent-main)]/30' : ''}`}>
      {/* Top Row: Category, Timestamp, Badges */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Pill variant="category" category={category}>
            {category}
          </Pill>
          {isNew && (
            <Badge type="update" value="New" />
          )}
          {ranks.length > 0 && ranks[0] <= 10 && (
            <Badge type="rank" value={ranks[0]} />
          )}
          <span className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1">
            <Clock size={12} />
            {updatedAt}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge type="compression" value={compression} />
          <Pill variant="sentiment" sentiment={sentiment} dot>
            {sentiment}
          </Pill>
        </div>
      </div>
      
      {/* Title */}
      <h3 className="text-xl font-bold tracking-tight text-white mb-3 line-clamp-2 leading-snug group-hover:text-[var(--color-accent-main)] transition-colors duration-200">
        {title}
      </h3>
      
      {/* Summary Bullets */}
      <ul className="space-y-1.5 mb-4">
        {summary.slice(0, 3).map((bullet, idx) => (
          <li key={idx} className="text-sm text-[var(--color-text-secondary)] flex items-start gap-2">
            <span className="text-[var(--color-accent-main)] mt-1.5">•</span>
            <span className="line-clamp-1">{bullet}</span>
          </li>
        ))}
      </ul>
      
      {/* Sources Row */}
      <div className="mb-4">
        <span className="text-xs text-[var(--color-text-tertiary)] mr-2">Sources:</span>
        <div className="inline-flex flex-wrap gap-1.5 mt-1">
          {sources.slice(0, 5).map((source, idx) => (
            <Pill key={idx} className="text-xs">
              {source.name || source}
            </Pill>
          ))}
          {sources.length > 5 && (
            <Pill className="text-xs">+{sources.length - 5} more</Pill>
          )}
        </div>
      </div>
      
      {/* Timeline Snapshot */}
      <div className="mb-4">
        <div className="flex items-center gap-2 h-8">
          <div className="flex-1 relative h-px bg-white/10">
            {[0, 33, 66, 100].map((pos, idx) => (
              <div
                key={idx}
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/40 border border-[#0A0A0A]"
                style={{ left: `${pos}%` }}
              />
            ))}
          </div>
        </div>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
          First reported {timeline.firstReported || '5h ago'} • Last update {timeline.lastUpdate || '20 min ago'}
        </p>
      </div>
      
      {/* Actions Row */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-2">
          <Button
            variant="icon"
            size="sm"
            icon={<Bookmark size={16} className={isSaved ? 'fill-[var(--color-accent-main)]' : ''} />}
            className={isSaved ? 'text-[var(--color-accent-main)] bg-[var(--color-accent-main)]/10' : ''}
            onClick={(e) => {
              e.stopPropagation();
              onSave?.(story);
            }}
          />
          <Button
            variant="icon"
            size="sm"
            icon={<EyeOff size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              onHide?.(story);
            }}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<ExternalLink size={14} />}
          iconPosition="right"
          onClick={(e) => {
            e.stopPropagation();
            if (story.url) {
              window.open(story.url, '_blank');
            }
          }}
        >
          Open Story
        </Button>
      </div>
    </Card>
  );
};

export default StoryCard;

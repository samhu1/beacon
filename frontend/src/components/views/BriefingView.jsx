import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, ExternalLink, FileText } from 'lucide-react';
import { Card, Pill, Badge, Button, SkeletonLoader } from '../ui';
import { motion } from 'framer-motion';
import { normalizeTopicLabel } from '../../utils/topicLabel';

/**
 * BriefingView Component
 *
 * Curated daily briefing organized by sections
 * Compact story cards with key updates
 */

// Detect category from word group and title
const CATEGORY_PATTERNS = {
  'AI': /\b(ai|artificial intelligence|machine learning|llm|gpt|openai|anthropic|claude|neural)\b/i,
  'Markets': /\b(stock|market|fed|inflation|nasdaq|wall street|bitcoin|crypto|earnings|ipo)\b/i,
  'Politics': /\b(congress|senate|trump|biden|election|democrat|republican|white house)\b/i,
  'Culture': /\b(netflix|movie|music|entertainment|tiktok|instagram|social media)\b/i,
  'World': /\b(china|russia|ukraine|nato|eu|global|international|war)\b/i,
  'Tech': /\b(apple|google|microsoft|amazon|meta|nvidia|tesla|spacex)\b/i,
  'Science': /\b(nasa|space|quantum|climate|renewable|research|study)\b/i,
};

function detectCategory(text) {
  for (const [category, pattern] of Object.entries(CATEGORY_PATTERNS)) {
    if (pattern.test(text)) return category;
  }
  return 'General';
}

const BriefingView = ({ onSelectStory }) => {
  const [loading, setLoading] = useState(true);
  const [briefingData, setBriefingData] = useState(null);
  const [selectedDate] = useState('today');
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchBriefing = async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:8888/api/report');
        const result = await response.json();

        if (!result.success || !result.data) {
          console.error('API returned error:', result);
          return;
        }

        setTotalCount(result.total_titles || 0);

        // Group stories by detected category from word groups
        const grouped = {};
        let storyCount = 0;

        result.data.stats?.forEach((stat) => {
          // Take top 2 stories from each word group for briefing
          stat.titles?.slice(0, 2).forEach((titleData) => {
            const category = detectCategory(stat.word + ' ' + titleData.title);
            if (!grouped[category]) {
              grouped[category] = [];
            }

            // Avoid duplicates by title
            if (!grouped[category].some(s => s.title === titleData.title)) {
              grouped[category].push({
                title: titleData.title,
                source: titleData.source_name,
                time: titleData.time_display || 'Recently',
                url: titleData.url || titleData.mobile_url,
                wordGroup: normalizeTopicLabel(stat.word),
                groupCount: stat.count,
                isNew: titleData.is_new,
                ranks: titleData.ranks || []
              });
              storyCount++;
            }
          });
        });

        // Sort sections by story count and limit stories per section
        const sections = Object.entries(grouped)
          .map(([name, items]) => ({
            name,
            items: items.slice(0, 5),
            totalItems: items.length,
            newCount: items.filter(i => i.isNew).length
          }))
          .filter(s => s.items.length > 0)
          .sort((a, b) => b.items.length - a.items.length);

        setBriefingData({
          generatedAt: result.generated_at || new Date().toISOString(),
          sections,
          totalStories: storyCount
        });
      } catch (error) {
        console.error('Failed to fetch briefing:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBriefing();
  }, [selectedDate]);
  
  const CompactStoryCard = ({ story }) => (
    <Card
      variant="compact"
      interactive
      className="hover:border-[var(--color-border-strong)]"
      onClick={() => {
        if (onSelectStory) onSelectStory(story);
        if (story.url) window.open(story.url, '_blank');
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {story.isNew && <Badge type="update" value="New" />}
            {story.ranks?.[0] <= 5 && (
              <Badge type="rank" value={story.ranks[0]} />
            )}
            <Pill className="text-xs">{story.source || 'Unknown'}</Pill>
            <span className="text-xs text-[var(--color-text-tertiary)]">
              {story.time || 'Recently'}
            </span>
          </div>
          <h4 className="font-medium text-sm mb-2 line-clamp-2 group-hover:text-[var(--color-accent-main)] transition-colors">
            {story.title}
          </h4>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-tertiary)]">
              {story.groupCount} related articles
            </span>
            <span className="text-xs text-[var(--color-accent-main)] flex items-center gap-1">
              <ExternalLink size={12} />
              Open
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
  
  const formatTime = (isoString) => {
    if (!isoString) return 'recently';
    try {
      return new Date(isoString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'recently';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="sticky top-[var(--app-header-height)] z-[calc(var(--z-sticky)-1)] mb-6 rounded-b-xl border border-white/6 border-t-0 bg-[rgba(8,12,24,0.78)] backdrop-blur-xl px-3 pt-3 pb-4 shadow-[var(--shadow-subtle)]">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
          <div>
            <h1 className="text-[2.25rem] font-bold tracking-tight text-white mb-1">Daily Briefing</h1>
            <p className="text-sm font-medium text-[var(--color-text-secondary)] mt-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              {briefingData?.totalStories || 0} curated stories from {totalCount} articles
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-xs text-[var(--color-text-tertiary)] font-mono">
              UPDATED: {formatTime(briefingData?.generatedAt).toUpperCase()}
            </span>
            <Button variant="secondary" size="sm" icon={<Calendar size={14} />} iconPosition="right" className="bg-white/5 border-white/10 hover:bg-white/10 text-white">
              {selectedDate === 'today' ? 'Today' : selectedDate}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {!loading && briefingData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {briefingData.sections.slice(0, 4).map((section) => (
            <Card key={section.name} className="text-center py-4">
              <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                {section.items.length}
              </div>
              <div className="text-sm text-[var(--color-text-secondary)]">
                {section.name}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Sections */}
      {loading ? (
        <div className="space-y-8">
          <SkeletonLoader variant="card" count={3} />
        </div>
      ) : briefingData?.sections.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.03)] text-white/20">
             <FileText size={32} />
          </div>
          <h3 className="text-xl font-medium text-white mb-2 tracking-tight">No briefing available</h3>
          <p className="text-[var(--color-text-secondary)]">
            Try refreshing to load the latest curated news
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {briefingData?.sections.map((section, sectionIdx) => (
            <motion.div
              key={section.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: Math.min(sectionIdx * 0.035, 0.16) }}
            >
              {/* Section Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">{section.name}</h2>
                  {section.newCount > 0 && (
                    <Badge type="update" value={`${section.newCount} new`} />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Pill variant="category" category={section.name}>
                    {section.items.length} stories
                  </Pill>
                  {section.totalItems > section.items.length && (
                    <span className="text-xs text-[var(--color-text-tertiary)]">
                      +{section.totalItems - section.items.length} more
                    </span>
                  )}
                </div>
              </div>

              {/* Section Stories */}
              <div className="space-y-3">
                {section.items.map((story, idx) => (
                  <CompactStoryCard
                    key={idx}
                    story={story}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Footer */}
      {!loading && briefingData?.sections.length > 0 && (
        <div className="mt-12 pt-8 border-t border-[var(--color-border-subtle)] text-center">
          <p className="text-sm text-[var(--color-text-tertiary)] mb-4">
            That's all for today's briefing • {briefingData?.totalStories} stories across {briefingData?.sections.length} categories
          </p>
          <Button variant="secondary">
            <TrendingUp size={16} className="mr-2" />
            Explore Full Stream
          </Button>
        </div>
      )}
    </div>
  );
};

export default BriefingView;

import React, { useState, useEffect, useRef, useMemo, useDeferredValue, startTransition } from 'react';
import { ChevronDown, RefreshCw, Radio } from 'lucide-react';
import { Pill, Button, SkeletonLoader } from '../ui';
import StoryCard from '../StoryCard';
import { motion, AnimatePresence } from 'framer-motion';
import { normalizeTopicLabel } from '../../utils/topicLabel';

/**
 * StreamView Component
 *
 * Vertical feed of story cards with:
 * - Filter toggles (All/Following/Saved)
 * - Category filters
 * - Sort dropdown
 * - Infinite scroll (future)
 */

// Category mapping based on word groups
const CATEGORY_MAP = {
  'AI': ['AI', 'artificial intelligence', 'machine learning', 'LLM', 'neural', 'GPT', 'OpenAI', 'Anthropic', 'Claude'],
  'Markets': ['stock', 'market', 'Fed', 'inflation', 'S&P', 'Nasdaq', 'Wall Street', 'Bitcoin', 'crypto', 'IPO', 'earnings'],
  'Politics': ['Congress', 'Senate', 'Trump', 'Biden', 'election', 'Democrat', 'Republican', 'White House', 'Supreme Court'],
  'Culture': ['Netflix', 'movie', 'music', 'entertainment', 'social media', 'TikTok', 'Instagram'],
  'World': ['China', 'Russia', 'Ukraine', 'NATO', 'EU', 'global', 'international', 'foreign']
};

function detectCategory(title, wordGroup) {
  const lowerTitle = title.toLowerCase();
  const lowerWord = wordGroup.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    for (const keyword of keywords) {
      if (lowerTitle.includes(keyword.toLowerCase()) || lowerWord.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }
  return 'World';
}

function detectSentiment(title) {
  const positive = ['success', 'growth', 'rise', 'gain', 'win', 'breakthrough', 'record', 'boost'];
  const negative = ['fall', 'drop', 'crisis', 'death', 'kill', 'war', 'crash', 'fail', 'loss', 'decline'];
  const lowerTitle = title.toLowerCase();

  for (const word of positive) {
    if (lowerTitle.includes(word)) return 'positive';
  }
  for (const word of negative) {
    if (lowerTitle.includes(word)) return 'negative';
  }
  return 'neutral';
}

const StreamView = ({ onSelectStory }) => {
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState([]);
  const [savedStories, setSavedStories] = useState(new Set());
  const [hiddenStories, setHiddenStories] = useState(new Set());
  const [filter, setFilter] = useState('all'); // all, following, saved
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState('relevance'); // relevance, fresh, impact
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [generatedAt, setGeneratedAt] = useState('');
  const [syncProgress, setSyncProgress] = useState(null);
  const streamRef = useRef(null);
  const deferredStories = useDeferredValue(stories);

  const categories = ['AI', 'Markets', 'Politics', 'Culture', 'World'];
  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'fresh', label: 'Fresh' },
    { value: 'impact', label: 'Impact' }
  ];

  const applyReportToStories = (result) => {
    if (!result?.success || !result?.data) {
      return false;
    }

    setTotalCount(result.total_titles || 0);
    setGeneratedAt(result.generated_at || '');

    const allStories = [];
    let storyId = 0;

    result.data.stats?.forEach((stat) => {
      const topicLabel = normalizeTopicLabel(stat.word);
      stat.titles?.forEach((titleData) => {
        const category = detectCategory(titleData.title, stat.word);
        const sentiment = detectSentiment(titleData.title);

        allStories.push({
          id: storyId++,
          title: titleData.title,
          category,
          sentiment,
          compression: Math.min(95, 60 + (titleData.count || 1) * 5),
          wordGroup: topicLabel,
          groupCount: stat.count,
          summary: [
            `Part of "${topicLabel.substring(0, 50)}${topicLabel.length > 50 ? '...' : ''}" cluster`,
            `${stat.count} related articles in this topic`,
            titleData.count > 1 ? `Mentioned ${titleData.count} times across sources` : 'Single source report'
          ],
          sources: [
            { name: titleData.source_name, url: titleData.url },
          ],
          timeline: {
            firstReported: titleData.time_display || 'Recently',
            lastUpdate: titleData.time_display || 'Just now'
          },
          updatedAt: titleData.time_display || 'Recently',
          url: titleData.url || titleData.mobile_url,
          ranks: titleData.ranks || [],
          isNew: titleData.is_new || false
        });
      });
    });

    startTransition(() => {
      setStories(allStories);
    });
    return true;
  };

  const fetchStoriesFallback = async (forceRefresh = false) => {
    try {
      const url = forceRefresh
        ? 'http://localhost:8888/api/report?refresh=true'
        : 'http://localhost:8888/api/report';
      const response = await fetch(url);
      const result = await response.json();
      if (!applyReportToStories(result)) {
        console.error('API returned error:', result);
      }
    } catch (error) {
      console.error('Failed to fetch stories:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setSyncProgress(null);
    }
  };

  // Fetch stories from API progressively using SSE
  const fetchStories = (forceRefresh = false) => {
    setLoading(true);
    setSyncProgress({ completed: 0, total: 0, message: 'Connecting…' });
    if (forceRefresh) setRefreshing(true);

    if (streamRef.current) {
      streamRef.current.close();
      streamRef.current = null;
    }

    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      fetchStoriesFallback(forceRefresh);
      return;
    }

    const url = `http://localhost:8888/api/report/stream?refresh=${forceRefresh ? 'true' : 'false'}`;
    const es = new EventSource(url);
    streamRef.current = es;

    es.addEventListener('progress', (event) => {
      try {
        const payload = JSON.parse(event.data);
        setSyncProgress(payload);
      } catch (error) {
        console.error('Invalid progress event:', error);
      }
    });

    es.addEventListener('partial_report', (event) => {
      try {
        const payload = JSON.parse(event.data);
        const applied = applyReportToStories(payload);
        if (applied) {
          setLoading(false);
        }
        if (payload.progress) {
          setSyncProgress((prev) => ({ ...(prev || {}), ...payload.progress }));
        }
      } catch (error) {
        console.error('Invalid partial_report event:', error);
      }
    });

    es.addEventListener('final', (event) => {
      try {
        const payload = JSON.parse(event.data);
        applyReportToStories(payload);
        setSyncProgress(payload.progress || { message: 'Complete' });
      } catch (error) {
        console.error('Invalid final event:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        if (streamRef.current) {
          streamRef.current.close();
          streamRef.current = null;
        }
        setTimeout(() => setSyncProgress(null), 1500);
      }
    });

    es.addEventListener('error', (event) => {
      try {
        if (event?.data) {
          const payload = JSON.parse(event.data);
          console.error('Stream error:', payload.message);
        }
      } catch {
        // ignore parse failures
      }
    });

    es.onerror = () => {
      if (streamRef.current === es) {
        es.close();
        streamRef.current = null;
      }
      // Fall back to standard request if the stream fails before we get data.
      if (stories.length === 0) {
        fetchStoriesFallback(forceRefresh);
      } else {
        setRefreshing(false);
      }
    };
  };

  useEffect(() => {
    fetchStories();
    return () => {
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
    };
  }, []);
  
  const toggleCategory = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSaveStory = (story) => {
    setSavedStories(prev => {
      const next = new Set(prev);
      if (next.has(story.id)) {
        next.delete(story.id);
      } else {
        next.add(story.id);
      }
      return next;
    });
  };

  const handleHideStory = (story) => {
    setHiddenStories(prev => new Set([...prev, story.id]));
  };

  const handleOpenStory = (story) => {
    if (onSelectStory) {
      onSelectStory(story);
    }
    if (story.url) {
      window.open(story.url, '_blank');
    }
  };

  const handleRefresh = () => {
    fetchStories(true);
  };

  // Filter stories
  const filteredStories = useMemo(() => deferredStories.filter(story => {
    // Hide hidden stories
    if (hiddenStories.has(story.id)) return false;

    // Filter by saved
    if (filter === 'saved' && !savedStories.has(story.id)) return false;

    // Filter by category
    if (selectedCategories.length > 0 && !selectedCategories.includes(story.category)) {
      return false;
    }
    return true;
  }), [deferredStories, hiddenStories, filter, savedStories, selectedCategories]);

  // Sort stories
  const sortedStories = useMemo(() => [...filteredStories].sort((a, b) => {
    if (sortBy === 'fresh') {
      return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
    }
    if (sortBy === 'impact') {
      return b.groupCount - a.groupCount;
    }
    // Default: relevance (by compression/deduplication)
    return b.compression - a.compression;
  }), [filteredStories, sortBy]);
  const visibleStories = useMemo(() => sortedStories.slice(0, 50), [sortedStories]);

  return (
    <div className="w-full">
      {/* Header & Sticky Filters */}
      <div className="sticky top-[var(--app-header-height)] z-[calc(var(--z-sticky)-1)] mb-5 rounded-b-xl border border-white/6 border-t-0 bg-[rgba(8,12,24,0.78)] backdrop-blur-xl px-3 pt-3 pb-4 shadow-[var(--shadow-subtle)]">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-[2.25rem] font-bold tracking-tight text-white mb-1">Stream</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[var(--color-text-tertiary)] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {totalCount} active signals • Updated {generatedAt ? new Date(generatedAt).toLocaleTimeString() : 'recently'}
              </span>
              {syncProgress && (
                <span className="text-xs text-[var(--color-accent-main)]/90">
                  {typeof syncProgress.completed === 'number' && typeof syncProgress.total === 'number' && syncProgress.total > 0
                    ? `Syncing ${syncProgress.completed}/${syncProgress.total}`
                    : 'Syncing'}
                  {syncProgress.source_name ? ` • ${syncProgress.source_name}` : ''}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="secondary"
            size="md"
            icon={<RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />}
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-xl bg-white/5 border-white/10 hover:bg-white/10 shadow-lg"
          >
            {refreshing ? 'Syncing...' : 'Sync Data'}
          </Button>
        </div>
        
        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-lg bg-white/4 border border-white/6">
          {/* Filter Toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            {['all', 'following', 'saved'].map((f) => (
              <Pill
                key={f}
                interactive
                selected={filter === f}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Pill>
            ))}
          </div>
          
          {/* Category Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map((cat) => (
              <Pill
                key={cat}
                variant="category"
                category={cat}
                interactive
                selected={selectedCategories.includes(cat)}
                onClick={() => toggleCategory(cat)}
              >
                {cat}
              </Pill>
            ))}
          </div>
          
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[var(--color-text-tertiary)]">Sort:</span>
            {sortOptions.map((option) => (
              <Pill
                key={option.value}
                interactive
                selected={sortBy === option.value}
                onClick={() => setSortBy(option.value)}
              >
                {option.label}
              </Pill>
            ))}
          </div>
        </div>
      </div>
      
      {/* Results Count */}
      <div className="max-w-[840px] mx-auto mb-4">
        <p className="text-sm text-[var(--color-text-tertiary)]">
          Showing {sortedStories.length} of {stories.length} stories
          {savedStories.size > 0 && ` • ${savedStories.size} saved`}
          {hiddenStories.size > 0 && ` • ${hiddenStories.size} hidden`}
        </p>
      </div>

      {/* Story Feed */}
      <div className="max-w-[840px] mx-auto space-y-5">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <SkeletonLoader variant="card" count={3} />
          ) : sortedStories.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.03)] text-white/20">
                <Radio size={32} />
              </div>
              <h3 className="text-xl font-medium text-white mb-2 tracking-tight">No signals detected</h3>
              <p className="text-[var(--color-text-secondary)]">
                {filter === 'saved' ? 'You haven\'t pinned any stories yet.' : 'Adjust your radar filters to discover new topics.'}
              </p>
            </div>
          ) : (
            visibleStories.map((story, idx) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.18, delay: idx < 8 ? idx * 0.015 : 0 }}
              >
                <StoryCard
                  story={story}
                  isSaved={savedStories.has(story.id)}
                  onSave={handleSaveStory}
                  onHide={handleHideStory}
                  onOpen={handleOpenStory}
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>

        {/* Load More */}
        {!loading && sortedStories.length > 50 && (
          <div className="text-center py-8">
            <Button variant="secondary">
              Load More ({sortedStories.length - 50} remaining)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamView;

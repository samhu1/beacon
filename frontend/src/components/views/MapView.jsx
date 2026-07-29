import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { Pill, Button, Card, Badge, SkeletonLoader } from '../ui';
import { motion, AnimatePresence } from 'framer-motion';
import { normalizeTopicLabel } from '../../utils/topicLabel';

/**
 * MapView Component
 *
 * Interactive narrative graph showing story clusters
 * Uses CSS-based bubble visualization for cluster representation
 */

// Category color mapping
const CATEGORY_COLORS = {
  'AI': { bg: 'rgba(91, 127, 255, 0.15)', border: '#5B7FFF', text: '#5B7FFF' },
  'Markets': { bg: 'rgba(45, 212, 191, 0.15)', border: '#2DD4BF', text: '#2DD4BF' },
  'Politics': { bg: 'rgba(239, 68, 68, 0.15)', border: '#EF4444', text: '#EF4444' },
  'Culture': { bg: 'rgba(232, 93, 154, 0.15)', border: '#E85D9A', text: '#E85D9A' },
  'World': { bg: 'rgba(148, 163, 184, 0.15)', border: '#94A3B8', text: '#94A3B8' },
  'Tech': { bg: 'rgba(168, 85, 247, 0.15)', border: '#A855F7', text: '#A855F7' },
  'Science': { bg: 'rgba(34, 197, 94, 0.15)', border: '#22C55E', text: '#22C55E' },
  'General': { bg: 'rgba(107, 114, 128, 0.15)', border: '#6B7280', text: '#6B7280' },
};

// Detect category from word group
function detectCategory(wordGroup) {
  const text = wordGroup.toLowerCase();
  if (/\b(ai|artificial intelligence|machine learning|llm|gpt|openai)\b/.test(text)) return 'AI';
  if (/\b(stock|market|fed|inflation|nasdaq|bitcoin|crypto)\b/.test(text)) return 'Markets';
  if (/\b(congress|trump|biden|election|democrat|republican)\b/.test(text)) return 'Politics';
  if (/\b(netflix|movie|music|entertainment|tiktok)\b/.test(text)) return 'Culture';
  if (/\b(china|russia|ukraine|nato|war|global)\b/.test(text)) return 'World';
  if (/\b(apple|google|microsoft|amazon|meta|nvidia|tesla)\b/.test(text)) return 'Tech';
  if (/\b(nasa|space|quantum|climate|research)\b/.test(text)) return 'Science';
  return 'General';
}

const MapView = ({ onSelectStory }) => {
  const [loading, setLoading] = useState(true);
  const [clusters, setClusters] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [timeWindow, setTimeWindow] = useState('24h');
  const [selectedTopics, setSelectedTopics] = useState(['all']);
  const [sentiment, setSentiment] = useState('all');
  const [zoom, setZoom] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const mapRef = useRef(null);

  const timeWindows = ['3h', '24h', '7d'];
  const topics = ['All', 'AI', 'Markets', 'Politics', 'Culture', 'Tech'];
  const sentiments = ['All', 'Positive', 'Negative'];

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:8888/api/report');
        const result = await response.json();

        if (!result.success || !result.data) return;

        setTotalCount(result.total_titles || 0);

        // Transform word groups into clusters
        const clusterData = result.data.stats?.map((stat, idx) => {
          const category = detectCategory(stat.word);
          const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.General;

          return {
            id: idx,
            word: stat.word,
            label: normalizeTopicLabel(stat.word).slice(0, 30),
            count: stat.count,
            percentage: stat.percentage || 0,
            category,
            colors,
            titles: stat.titles?.slice(0, 5) || [],
            // Position will be calculated based on count
            size: Math.min(Math.max(stat.count * 3 + 40, 60), 180),
          };
        }) || [];

        setClusters(clusterData);
      } catch (error) {
        console.error('Failed to fetch map data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeWindow]);

  const toggleTopic = (topic) => {
    if (topic === 'All') {
      setSelectedTopics(['all']);
    } else {
      setSelectedTopics(prev => {
        const filtered = prev.filter(t => t !== 'all');
        return filtered.includes(topic)
          ? filtered.filter(t => t !== topic)
          : [...filtered, topic];
      });
    }
  };

  // Filter clusters
  const filteredClusters = clusters.filter(c => {
    if (selectedTopics.includes('all')) return true;
    return selectedTopics.some(t => c.category.toLowerCase() === t.toLowerCase());
  });
  
  return (
    <div className="w-full">
      {/* Header */}
      <div className="sticky top-[var(--app-header-height)] z-[calc(var(--z-sticky)-1)] mb-5 rounded-b-xl border border-white/6 border-t-0 bg-[rgba(8,12,24,0.78)] backdrop-blur-xl px-3 pt-3 pb-4 shadow-[var(--shadow-subtle)]">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-[2.25rem] font-bold tracking-tight text-white mb-1">Today's Map</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[var(--color-text-tertiary)] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                {filteredClusters.length} clusters • {totalCount} signals
              </span>
            </div>
          </div>
          <Button
            variant="secondary"
            size="md"
            icon={<RefreshCw size={16} />}
            className="rounded-xl bg-white/5 border-white/10 hover:bg-white/10 shadow-lg"
          >
            Refresh
          </Button>
        </div>
        
        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-lg bg-[var(--color-bg-elevated)]/45 border border-white/6">
          {/* Time Window */}
          <div className="flex items-center gap-1 p-1 rounded-md bg-black/40">
            {timeWindows.map((tw) => (
              <button
                key={tw}
                onClick={() => setTimeWindow(tw)}
                className={`
                  px-4 h-8 rounded-md text-sm font-medium transition-all duration-[120ms]
                  ${timeWindow === tw
                    ? 'bg-white text-black shadow-lg'
                    : 'text-[var(--color-text-secondary)] hover:text-white'
                  }
                `}
              >
                {tw}
              </button>
            ))}
          </div>
          
          {/* Topic Filters */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {topics.map((topic) => (
              <Pill
                key={topic}
                variant={topic !== 'All' ? 'category' : 'default'}
                category={topic}
                interactive
                selected={selectedTopics.includes(topic.toLowerCase()) || selectedTopics.includes('all')}
                onClick={() => toggleTopic(topic)}
              >
                {topic}
              </Pill>
            ))}
          </div>
          
          {/* Sentiment Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-md bg-black/40">
            {sentiments.map((s) => (
              <button
                key={s}
                onClick={() => setSentiment(s.toLowerCase())}
                className={`
                  px-3 h-8 rounded-md text-xs font-medium transition-all duration-[120ms]
                  ${sentiment === s.toLowerCase()
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                  }
                `}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mb-6 flex items-center justify-end">
        <div className="flex items-center gap-2 bg-white/5 rounded-md p-1 border border-white/5">
          <Button variant="icon" size="sm" icon={<ZoomOut size={16} />} onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="hover:bg-white/10" />
          <span className="text-xs font-mono text-[var(--color-text-tertiary)] w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="icon" size="sm" icon={<ZoomIn size={16} />} onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="hover:bg-white/10" />
          <Button variant="icon" size="sm" icon={<Maximize2 size={16} />} onClick={() => setZoom(1)} className="hover:bg-white/10" />
        </div>
      </div>

      {/* Bubble Map */}
      <Card className="h-[560px] overflow-hidden relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <SkeletonLoader variant="card" count={1} />
          </div>
        ) : (
          <div
            ref={mapRef}
            className="w-full h-full overflow-auto p-8"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          >
            <div className="flex flex-wrap gap-4 justify-center items-center min-h-full">
              <AnimatePresence>
                {filteredClusters.map((cluster, idx) => (
                  <motion.div
                    key={cluster.id}
                    initial={{ scale: 0.94, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.96, opacity: 0 }}
                    transition={{ delay: idx < 10 ? idx * 0.015 : 0, duration: 0.18 }}
                    className={`
                      flex flex-col items-center justify-center rounded-full cursor-pointer
                      transition-all duration-200 hover:scale-[1.03] hover:z-10
                      ${selectedCluster?.id === cluster.id ? 'ring-2 ring-white/80 scale-[1.03] z-10' : ''}
                    `}
                    style={{
                      width: cluster.size,
                      height: cluster.size,
                      backgroundColor: cluster.colors.bg,
                      borderWidth: 2,
                      borderColor: cluster.colors.border,
                      boxShadow: selectedCluster?.id === cluster.id
                        ? `0 0 18px ${cluster.colors.border}`
                        : `0 0 10px ${cluster.colors.border}35`
                    }}
                    onClick={() => setSelectedCluster(selectedCluster?.id === cluster.id ? null : cluster)}
                  >
                    <span
                      className="text-xs font-semibold text-center px-2 line-clamp-2"
                      style={{ color: cluster.colors.text }}
                    >
                      {cluster.label}
                    </span>
                    <span className="text-lg font-bold mt-1" style={{ color: cluster.colors.text }}>
                      {cluster.count}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-[var(--color-bg-main)]/80 backdrop-blur-sm px-3 py-2 rounded-lg">
          {Object.entries(CATEGORY_COLORS).slice(0, 6).map(([cat, colors]) => (
            <div key={cat} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.border }} />
              <span className="text-xs text-[var(--color-text-tertiary)]">{cat}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Selected Cluster Details */}
      {selectedCluster && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Pill variant="category" category={selectedCluster.category}>
                    {selectedCluster.category}
                  </Pill>
                  <Badge type="compression" value={selectedCluster.count} />
                </div>
                <h3 className="text-xl font-semibold">{selectedCluster.label}</h3>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  {selectedCluster.count} articles in this cluster
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCluster(null)}>
                Close
              </Button>
            </div>

            {/* Top stories in cluster */}
            <div className="space-y-3">
              {selectedCluster.titles.map((title, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-[var(--color-bg-subtle)]/70 hover:bg-[var(--color-bg-elevated)]/90 cursor-pointer transition-colors"
                  onClick={() => {
                    if (title.url) window.open(title.url, '_blank');
                    if (onSelectStory) onSelectStory(title);
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Pill className="text-xs">{title.source_name}</Pill>
                    {title.ranks?.[0] <= 5 && <Badge type="rank" value={title.ranks[0]} />}
                    <span className="text-xs text-[var(--color-text-tertiary)]">{title.time_display}</span>
                  </div>
                  <p className="text-sm font-medium line-clamp-2">{title.title}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Top Clusters Grid */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Top Story Clusters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClusters.slice(0, 6).map((cluster) => (
            <Card
              key={cluster.id}
              interactive
              className="p-4"
              onClick={() => setSelectedCluster(cluster)}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
                  style={{
                    backgroundColor: cluster.colors.bg,
                    color: cluster.colors.text,
                    borderWidth: 1,
                    borderColor: cluster.colors.border
                  }}
                >
                  {cluster.count}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Pill variant="category" category={cluster.category} className="text-xs">
                      {cluster.category}
                    </Pill>
                  </div>
                  <h4 className="font-medium text-sm mb-1 line-clamp-2">
                    {cluster.label}
                  </h4>
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    {cluster.titles.length} top stories
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapView;

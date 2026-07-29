import React, { useState } from 'react';
import AppShell from './components/AppShell';
import MapView from './components/views/MapView';
import StreamView from './components/views/StreamView';
import BriefingView from './components/views/BriefingView';
import SettingsView from './components/views/SettingsView';
import { AlignLeft } from 'lucide-react';

/**
 * Signal0 - Premium News Aggregator
 * 
 * Main application component with view routing
 * 
 * Design: Bloomberg Terminal × Apple News × Notion
 * - Dark-first color palette
 * - Calm, intentional interactions
 * - Premium typography and spacing
 * - Highly structured information architecture
 */

export default function App() {
  const [currentView, setCurrentView] = useState('stream');
  const [selectedStory, setSelectedStory] = useState(null);
  const showSidePanel = currentView !== 'me';
  
  const renderView = () => {
    switch (currentView) {
      case 'map':
        return <MapView onSelectStory={setSelectedStory} />;
      case 'stream':
        return <StreamView onSelectStory={setSelectedStory} />;
      case 'briefing':
        return <BriefingView onSelectStory={setSelectedStory} />;
      case 'me':
        return <SettingsView />;
      default:
        return <StreamView onSelectStory={setSelectedStory} />;
    }
  };
  
  const renderSidePanel = () => {
    if (!selectedStory) {
      return (
        <div className="text-center py-12">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[var(--color-bg-subtle)] flex items-center justify-center text-white/50">
            <AlignLeft size={20} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Story Details</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Select a story to view detailed information, timeline, and source comparison
          </p>
        </div>
      );
    }
    
    return (
      <div>
        <h3 className="text-xl font-semibold mb-4">{selectedStory.title}</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Key Takeaways
            </h4>
            <ul className="space-y-2">
              {selectedStory.summary?.map((bullet, idx) => (
                <li key={idx} className="text-sm text-[var(--color-text-primary)] flex items-start gap-2">
                  <span className="text-[var(--color-accent-main)] mt-1">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Sources
            </h4>
            <div className="space-y-2">
              {selectedStory.sources?.map((source, idx) => (
                <div key={idx} className="text-sm text-[var(--color-text-primary)]">
                  {source.name || source}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <AppShell
      currentView={currentView}
      onViewChange={(view) => {
        setCurrentView(view);
        if (view === 'me') {
          setSelectedStory(null);
        }
      }}
      showSidePanel={showSidePanel}
      sidePanel={renderSidePanel()}
    >
      {renderView()}
    </AppShell>
  );
}

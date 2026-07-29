import React, { useState, useEffect } from 'react';
import { User, Bell, Shield, Settings2, Database, Key, Layout } from 'lucide-react';
import { Card, Button, Input, Pill } from '../ui';
import { motion } from 'framer-motion';

/**
 * SettingsView Component
 *
 * User profile, application preferences, and source management.
 */

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'preferences', label: 'Preferences', icon: Settings2 },
  { id: 'sources', label: 'Sources & Connectors', icon: Database },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'api', label: 'API Keys', icon: Key },
];

export default function SettingsView() {
  const [activeSection, setActiveSection] = useState('profile');
  const [sources, setSources] = useState([]);
  
  // Fetch existing sources to match dashboard
  useEffect(() => {
    fetch('http://localhost:8888/api/sources')
      .then((res) => res.json())
      .then((data) => {
        if (data.sources) setSources(data.sources);
      })
      .catch((err) => console.error("Failed to load sources", err));
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto flex gap-12">
      {/* Sidebar Navigation */}
      <div className="w-64 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-8">Settings</h1>
        <nav className="flex flex-col gap-2">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`
                  flex items-center gap-3 w-full px-4 py-3 rounded-md text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-white text-black shadow-lg shadow-white/10' 
                    : 'text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                <Icon size={18} />
                {section.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 pb-20">
        {activeSection === 'profile' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-white mb-1">Profile</h2>
              <p className="text-[var(--color-text-secondary)] text-sm mb-6">Manage your personal information.</p>
              
              <Card className="p-6">
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 shadow-lg">
                     <User size={32} />
                  </div>
                  <div>
                    <Button variant="secondary" size="sm" className="mb-2">Upload new avatar</Button>
                    <p className="text-xs text-[var(--color-text-tertiary)]">JPG, GIF or PNG. Max size of 800K</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--color-text-secondary)]">First Name</label>
                    <Input defaultValue="Sam" className="bg-black/20" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--color-text-secondary)]">Last Name</label>
                    <Input defaultValue="Hu" className="bg-black/20" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium text-[var(--color-text-secondary)]">Email Address</label>
                    <Input defaultValue="admin@signal0.com" type="email" className="bg-black/20" />
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <Button variant="primary">Save Changes</Button>
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {activeSection === 'sources' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">Sources & Connectors</h2>
                  <p className="text-[var(--color-text-secondary)] text-sm">Manage where Signal0 ingests data from.</p>
                </div>
                <Button variant="primary" size="sm">+ Add Source</Button>
              </div>
              
              <div className="space-y-4">
                {sources.length === 0 ? (
                   <div className="text-center py-12 border border-white/5 bg-white/[0.02] rounded-lg">
                     <p className="text-sm text-[var(--color-text-secondary)]">Loading registered sources...</p>
                   </div>
                ) : (
                  sources.map(src => (
                    <Card key={src.id} className="p-5 flex items-center justify-between group hover:border-[var(--color-border-strong)]">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg border border-white/10 bg-black/40 flex items-center justify-center text-white/50">
                           <Database size={18} />
                        </div>
                        <div>
                          <h4 className="font-medium text-white text-sm mb-1">{src.name}</h4>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                            <span className="text-xs text-[var(--color-text-tertiary)]">Connected & Syncing</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="secondary" size="sm">Configure</Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'preferences' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-white mb-1">Preferences</h2>
              <p className="text-[var(--color-text-secondary)] text-sm mb-6">Customize your reading experience and feed density.</p>
              
              <Card className="p-6 space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-white text-sm mb-1">Dense Layout</h4>
                    <p className="text-xs text-[var(--color-text-tertiary)] max-w-md">Compact story cards to show more content simultaneously.</p>
                  </div>
                  <div className="w-12 h-6 rounded-full bg-white/20 relative cursor-pointer">
                    <div className="w-5 h-5 rounded-full bg-white absolute left-0.5 top-0.5 shadow-md transition-transform translate-x-6"></div>
                  </div>
                </div>

                <div className="w-full h-px bg-white/5"></div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-white text-sm mb-1">Show AI Insight Previews</h4>
                    <p className="text-xs text-[var(--color-text-tertiary)] max-w-md">Automatically expand the top 3 bullet points of an article's summary.</p>
                  </div>
                  <div className="w-12 h-6 rounded-full bg-[var(--color-accent-main)] relative cursor-pointer transition-colors">
                    <div className="w-5 h-5 rounded-full bg-black absolute left-0.5 top-0.5 shadow-md transition-transform translate-x-6"></div>
                  </div>
                </div>
                
                <div className="w-full h-px bg-white/5"></div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-white text-sm mb-1">Auto-refresh Feed</h4>
                    <p className="text-xs text-[var(--color-text-tertiary)] max-w-md">Fetch new signals in the background without refreshing the page.</p>
                  </div>
                  <div className="w-12 h-6 rounded-full bg-[var(--color-accent-main)] relative cursor-pointer transition-colors">
                    <div className="w-5 h-5 rounded-full bg-black absolute left-0.5 top-0.5 shadow-md transition-transform translate-x-6"></div>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        )}
        
        {/* Empty state catch for other sections */}
        {['notifications', 'api'].includes(activeSection) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
             <div className="text-center py-20 border border-white/5 bg-white/[0.02] rounded-xl mt-12">
                <div className="w-16 h-16 mx-auto mb-6 rounded-md bg-white/5 flex items-center justify-center text-white/50">
                  <Layout size={32} />
                </div>
                <h3 className="text-lg font-medium text-white mb-2 tracking-tight">Configuration coming soon</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">We're still building out this settings panel.</p>
             </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

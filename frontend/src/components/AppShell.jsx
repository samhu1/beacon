import React, { useState } from 'react';
import { Map, List, FileText, User, Bell } from 'lucide-react';
import { Input, Button } from './ui';
import { motion } from 'framer-motion';

/**
 * AppShell Component
 * 
 * Main application layout with:
 * - Top bar (logo, search, notifications, user)
 * - Left navigation rail
 * - Main content area
 * - Optional right side panel
 */

const AppShell = ({ 
  children,
  currentView = 'map',
  onViewChange,
  sidePanel,
  showSidePanel = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const navItems = [
    { id: 'map', icon: Map },
    { id: 'stream', icon: List },
    { id: 'briefing', icon: FileText },
    { id: 'me', icon: User }
  ];
  
  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-primary)]">
      {/* Top Bar */}
      <header className="sticky top-0 z-[var(--z-sticky)] h-[var(--app-header-height)] border-b border-white/6 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.92),rgba(2,6,23,0.76))] backdrop-blur-xl">
        <div className="h-full max-w-[var(--content-max-width)] mx-auto px-4 md:px-8 xl:px-12 flex items-center justify-between gap-4 md:gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-white shadow-[0_0_10px_rgba(255,255,255,0.22)] flex items-center justify-center">
              <span className="text-sm font-bold text-black tracking-tighter">S0</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Signal0</h1>
          </div>
          
          {/* Search */}
          <div className="hidden md:block flex-1 max-w-xl">
            <Input
              variant="search"
              placeholder="Search topics, people, events…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <Button variant="icon" icon={<Bell size={20} />} />
            <Button variant="icon" icon={<User size={20} />} />
          </div>
        </div>
      </header>
      
      {/* Main Layout */}
      <div className="flex">
        {/* Left Navigation Rail */}
        <nav className="sticky top-[var(--app-header-height)] h-[calc(100vh-var(--app-header-height))] w-18 md:w-20 border-r border-white/6 bg-[var(--color-bg-main)]/70 backdrop-blur-md">
          <div className="flex flex-col items-center gap-2 p-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange?.(item.id)}
                  className={`
                    relative w-12 h-12 rounded-md flex items-center justify-center
                    transition-all duration-[180ms] ease-out
                    ${isActive 
                      ? 'text-black z-10' 
                      : 'text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--color-text-primary)]'
                    }
                  `}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavBg"
                      className="absolute inset-0 rounded-md bg-white shadow-[0_0_14px_rgba(255,255,255,0.16)]"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    />
                  )}
                  <span className="relative z-20 flex flex-col items-center gap-1">
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
        
        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-4.5rem)]">
          <div className={`max-w-[var(--content-max-width)] mx-auto ${showSidePanel ? 'pr-0' : 'px-4 md:px-8 xl:px-12'} py-6 md:py-8`}>
            {children}
          </div>
        </main>
        
        {/* Right Side Panel */}
        {showSidePanel && sidePanel && (
          <aside className="sticky top-[var(--app-header-height)] h-[calc(100vh-var(--app-header-height))] w-[22rem] border-l border-white/6 bg-[var(--color-bg-main)]/70 backdrop-blur-md overflow-y-auto hidden xl:block">
            <div className="p-5">
              {sidePanel}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default AppShell;

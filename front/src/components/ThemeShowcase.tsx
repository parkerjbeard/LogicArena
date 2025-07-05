'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Theme definitions
const themes = {
  warmAcademic: {
    name: 'Warm Academic',
    description: 'Classic academic/library feel with reduced eye strain',
    colors: {
      background: '#FAF9F6',
      surface: '#FFFFFF',
      surfaceHover: '#F5F5F5',
      border: '#E5E5E5',
      primary: '#1E3A8A',
      primaryHover: '#1E40AF',
      secondary: '#F59E0B',
      text: '#1F2937',
      textMuted: '#6B7280',
      success: '#059669',
      error: '#DC2626',
      cardShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    },
  },
  modernLearning: {
    name: 'Modern Learning Platform',
    description: 'Fresh and approachable EdTech aesthetic',
    colors: {
      background: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceHover: '#F1F5F9',
      border: '#E2E8F0',
      primary: '#0891B2',
      primaryHover: '#0E7490',
      secondary: '#FB7185',
      text: '#0F172A',
      textMuted: '#64748B',
      success: '#10B981',
      error: '#EF4444',
      cardShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    },
  },
  softDark: {
    name: 'Soft Dark Mode',
    description: 'Warm dark theme that\'s easier on the eyes',
    colors: {
      background: '#262626',
      surface: '#404040',
      surfaceHover: '#525252',
      border: '#525252',
      primary: '#A78BFA',
      primaryHover: '#8B5CF6',
      secondary: '#6EE7B7',
      text: '#FEF3C7',
      textMuted: '#D4D4D4',
      success: '#34D399',
      error: '#F87171',
      cardShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)',
    },
  },
  dualTone: {
    name: 'Dual-Tone Minimalist',
    description: 'Clean separation between UI and content',
    colors: {
      background: '#FAFAFA',
      surface: '#FFFFFF',
      surfaceHover: '#F5F5F5',
      border: '#E5E7EB',
      primary: '#312E81',
      primaryHover: '#4338CA',
      secondary: '#7C3AED',
      text: '#111827',
      textMuted: '#6B7280',
      success: '#10B981',
      error: '#EF4444',
      cardShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      navBackground: '#312E81',
      navText: '#FFFFFF',
    },
  },
  natureCalm: {
    name: 'Nature-Inspired Calm',
    description: 'Reduces cognitive load and promotes focus',
    colors: {
      background: '#F0F4F0',
      surface: '#FEFFFE',
      surfaceHover: '#E8EEE8',
      border: '#D1D9D1',
      primary: '#059669',
      primaryHover: '#047857',
      secondary: '#0EA5E9',
      text: '#1F2A1F',
      textMuted: '#4B5B4B',
      success: '#10B981',
      error: '#F87171',
      cardShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
    },
  },
};

const ThemeShowcase: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState<keyof typeof themes>('warmAcademic');
  const theme = themes[currentTheme];

  return (
    <div 
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: theme.colors.background }}
    >
      {/* Theme Selector */}
      <div className="sticky top-0 z-50 border-b" style={{ 
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        boxShadow: theme.colors.cardShadow,
      }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>
              LogicArena Theme Showcase
            </h1>
            <div className="flex flex-wrap gap-2">
              {Object.entries(themes).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => setCurrentTheme(key as keyof typeof themes)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    currentTheme === key ? 'ring-2 ring-offset-2' : ''
                  }`}
                  style={{
                    backgroundColor: currentTheme === key ? theme.colors.primary : theme.colors.surface,
                    color: currentTheme === key ? '#FFFFFF' : theme.colors.text,
                    borderWidth: '1px',
                    borderColor: theme.colors.border,
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2" style={{ color: theme.colors.textMuted }}>
            {theme.description}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Navigation Example */}
        <section>
          <h2 className="text-xl font-semibold mb-4" style={{ color: theme.colors.text }}>
            Navigation Bar
          </h2>
          <div 
            className="rounded-lg overflow-hidden"
            style={{ 
              backgroundColor: theme.colors.primary,
              boxShadow: theme.colors.cardShadow,
            }}
          >
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-6">
                <span className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
                  LogicArena-α
                </span>
                <nav className="hidden md:flex gap-4">
                  {['Practice', 'Duel', 'Tutorials', 'Leaderboard'].map((item) => (
                    <a
                      key={item}
                      href="#"
                      className="px-3 py-1 rounded transition-all hover:opacity-80"
                      style={{ color: '#FFFFFF' }}
                    >
                      {item}
                    </a>
                  ))}
                </nav>
              </div>
              <button
                className="px-4 py-2 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                }}
              >
                Account
              </button>
            </div>
          </div>
        </section>

        {/* Cards Grid */}
        <section>
          <h2 className="text-xl font-semibold mb-4" style={{ color: theme.colors.text }}>
            Game Mode Cards
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { title: 'Practice Mode', desc: 'Sharpen your logic skills at your own pace', icon: '🎯' },
              { title: 'Duel Mode', desc: 'Challenge other players in real-time battles', icon: '⚔️' },
              { title: 'Tutorials', desc: 'Learn the fundamentals of formal logic', icon: '📚' },
            ].map((card) => (
              <motion.div
                key={card.title}
                whileHover={{ y: -4 }}
                className="rounded-lg p-6 transition-all cursor-pointer"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderWidth: '1px',
                  borderColor: theme.colors.border,
                  boxShadow: theme.colors.cardShadow,
                }}
              >
                <div className="text-3xl mb-3">{card.icon}</div>
                <h3 className="font-semibold text-lg mb-2" style={{ color: theme.colors.text }}>
                  {card.title}
                </h3>
                <p style={{ color: theme.colors.textMuted }}>{card.desc}</p>
                <button
                  className="mt-4 px-4 py-2 rounded-lg font-medium transition-all w-full"
                  style={{
                    backgroundColor: theme.colors.primary,
                    color: '#FFFFFF',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.primaryHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.primary;
                  }}
                >
                  Start
                </button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Proof Editor Example */}
        <section>
          <h2 className="text-xl font-semibold mb-4" style={{ color: theme.colors.text }}>
            Proof Editor
          </h2>
          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: theme.colors.surface,
              borderWidth: '1px',
              borderColor: theme.colors.border,
              boxShadow: theme.colors.cardShadow,
            }}
          >
            <div className="space-y-3">
              {[
                { line: '1.', content: 'P → Q', rule: 'Premise', highlight: false },
                { line: '2.', content: 'P', rule: 'Premise', highlight: false },
                { line: '3.', content: 'Q', rule: 'MP 1,2', highlight: true },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 p-3 rounded-lg font-mono"
                  style={{
                    backgroundColor: item.highlight ? 
                      (currentTheme === 'softDark' ? 'rgba(167, 139, 250, 0.1)' : 'rgba(14, 165, 233, 0.1)') : 
                      theme.colors.surfaceHover,
                    borderWidth: '1px',
                    borderColor: item.highlight ? theme.colors.secondary : theme.colors.border,
                  }}
                >
                  <span style={{ color: theme.colors.textMuted }}>{item.line}</span>
                  <span className="flex-1" style={{ color: theme.colors.text }}>{item.content}</span>
                  <span style={{ color: theme.colors.primary }}>{item.rule}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Form Elements */}
        <section>
          <h2 className="text-xl font-semibold mb-4" style={{ color: theme.colors.text }}>
            Form Elements
          </h2>
          <div
            className="rounded-lg p-6 space-y-4"
            style={{
              backgroundColor: theme.colors.surface,
              borderWidth: '1px',
              borderColor: theme.colors.border,
              boxShadow: theme.colors.cardShadow,
            }}
          >
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
                Username
              </label>
              <input
                type="text"
                placeholder="Enter your username"
                className="w-full px-4 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: theme.colors.background,
                  borderWidth: '1px',
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }}
              />
            </div>
            <div className="flex gap-4">
              <button
                className="px-6 py-2 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: theme.colors.primary,
                  color: '#FFFFFF',
                }}
              >
                Submit
              </button>
              <button
                className="px-6 py-2 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: 'transparent',
                  color: theme.colors.text,
                  borderWidth: '1px',
                  borderColor: theme.colors.border,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </section>

        {/* Status Messages */}
        <section>
          <h2 className="text-xl font-semibold mb-4" style={{ color: theme.colors.text }}>
            Status Messages
          </h2>
          <div className="space-y-3">
            <div
              className="p-4 rounded-lg"
              style={{
                backgroundColor: currentTheme === 'softDark' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                borderWidth: '1px',
                borderColor: theme.colors.success,
              }}
            >
              <p style={{ color: theme.colors.success }}>✓ Proof completed successfully!</p>
            </div>
            <div
              className="p-4 rounded-lg"
              style={{
                backgroundColor: currentTheme === 'softDark' ? 'rgba(248, 113, 113, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                borderWidth: '1px',
                borderColor: theme.colors.error,
              }}
            >
              <p style={{ color: theme.colors.error }}>✗ Invalid inference rule applied</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ThemeShowcase;
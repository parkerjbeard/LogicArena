# LogicArena Style Guide

## Overview
This document serves as the comprehensive style guide for LogicArena. All new features and components should follow these established patterns to maintain consistency throughout the application.

## Color Palette

### Dark Theme (Primary)
- **Background Colors**:
  - Main background: `bg-gray-900`
  - Secondary background: `bg-gray-800`
  - Card/Panel background: `bg-gray-800/30` or `bg-gray-800/50` (semi-transparent)
  - Interactive hover: `bg-gray-700/30`
  - Code/Example background: `bg-gray-900/50`

- **Border Colors**:
  - Primary borders: `border-gray-700` or `border-gray-700/50`
  - Hover borders: `border-gray-600/50`
  - Success borders: `border-green-600/30`
  - Warning borders: `border-yellow-600/30`
  - Error borders: `border-red-600/30`

- **Text Colors**:
  - Primary text: `text-gray-200` or `text-white`
  - Secondary text: `text-gray-300`
  - Muted text: `text-gray-400` or `text-gray-500`
  - Success text: `text-green-400`
  - Warning text: `text-yellow-400`
  - Error text: `text-red-400`

## Component Patterns

### Cards & Panels
```tsx
// Standard card with semi-transparent background
<div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
  <h3 className="font-semibold text-lg mb-2 text-white">Title</h3>
  <p className="text-gray-200">Content</p>
</div>

// Hover-able card
<div className="bg-gray-800/30 border border-gray-700/50 p-4 rounded-lg hover:bg-gray-700/30 hover:border-gray-600/50 transition-all cursor-pointer">
  {/* Content */}
</div>
```

### Buttons
```tsx
// Primary button (blue)
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
  Action
</button>

// Secondary button (gray)
<button className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
  Cancel
</button>

// Disabled state
<button className="px-4 py-2 bg-gray-600 text-gray-400 rounded-lg opacity-50 cursor-not-allowed">
  Disabled
</button>
```

### Headers & Navigation
```tsx
// Main header (matching landing page)
<div className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
  <h1 className="text-2xl font-bold">LogicArena-α</h1>
</div>

// Modal/Tutorial header (solid gray)
<div className="bg-gray-800 text-white p-6 border-b border-gray-700">
  <h2 className="text-2xl font-bold">Title</h2>
  <p className="text-gray-300 mt-1">Subtitle</p>
</div>
```

### Forms & Inputs
```tsx
// Text input
<input
  type="text"
  className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  placeholder="Enter text..."
/>

// Select dropdown
<select className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
  <option>Option 1</option>
</select>
```

### Status Messages
```tsx
// Success message
<div className="bg-green-900/20 backdrop-blur-sm border border-green-600/30 rounded-lg p-4">
  <p className="text-sm text-green-400">Success message</p>
</div>

// Error message
<div className="bg-red-900/20 backdrop-blur-sm border border-red-600/30 rounded-lg p-4">
  <p className="text-sm text-red-400">Error message</p>
</div>

// Warning/Hint message
<div className="bg-yellow-900/20 backdrop-blur-sm border border-yellow-600/30 rounded-lg p-4">
  <p className="text-sm text-yellow-400">Warning or hint</p>
</div>
```

### Modals & Overlays
```tsx
// Modal backdrop
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
  {/* Modal content */}
</div>

// Modal container
<div className="relative w-full max-w-5xl max-h-[90vh] bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
  {/* Header, content, footer */}
</div>
```

## Typography

### Font Sizes
- Headers: `text-2xl` to `text-4xl`
- Subheaders: `text-lg` to `text-xl`
- Body text: `text-base`
- Small text: `text-sm`
- Extra small: `text-xs`

### Font Weights
- Headers: `font-bold` or `font-semibold`
- Emphasis: `font-medium`
- Regular text: default (no class)

### Code & Monospace
```tsx
// Inline code
<span className="font-mono text-gray-300">code</span>

// Code blocks
<pre className="font-mono bg-gray-900/50 text-gray-300 p-4 rounded border border-gray-700/50">
  {code}
</pre>
```

## Spacing & Layout

### Container Widths
- Full width with max: `w-full max-w-5xl`
- Content max width: `max-w-4xl mx-auto`
- Narrow content: `max-w-2xl mx-auto`

### Common Spacing
- Section padding: `p-6` or `p-8`
- Card padding: `p-4` or `p-6`
- Element spacing: `space-y-4` or `gap-4`
- Margins: `mb-4`, `mt-6`, etc.

## Animation & Transitions

### Hover Effects
- Colors: `transition-colors`
- All properties: `transition-all duration-200`
- Scale on hover: `hover:scale-105`

### Framer Motion Patterns
```tsx
// Fade in
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}

// Slide in
initial={{ opacity: 0, x: 20 }}
animate={{ opacity: 1, x: 0 }}

// Scale in
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
```

## Proof Editor Specific

### Proof Lines
```tsx
// Standard line
<div className="bg-gray-800/30 border border-gray-700/50 p-3 rounded-lg">
  <span className="text-gray-400 font-mono text-sm">1.</span>
  <span className="font-mono text-base text-gray-200">P → Q</span>
  <span className="font-mono text-sm text-purple-400">Premise</span>
</div>

// Highlighted line
<div className="bg-blue-900/20 border border-blue-600/50 shadow-md p-3 rounded-lg">
  {/* Content */}
</div>
```

### Inference Rule Colors
- Modus Ponens/Tollens: `text-purple-400`
- Conjunction: `text-green-400`
- Disjunction: `text-orange-400`
- Conditional: `text-blue-400`
- Negation: `text-red-400`
- Assumption: `text-indigo-400`
- Default: `text-gray-400`

## Best Practices

1. **Always use semi-transparent backgrounds** for cards and panels to create depth
2. **Add backdrop-blur-sm** to semi-transparent elements for better readability
3. **Use consistent border colors** with /50 opacity for subtle boundaries
4. **Maintain high contrast** between text and backgrounds for accessibility
5. **Apply transitions** to interactive elements for smooth user experience
6. **Use Framer Motion** for complex animations and page transitions
7. **Keep consistent spacing** using Tailwind's spacing scale
8. **Test in both light and dark modes** (though dark is primary)

## Component Checklist

When creating new components, ensure they:
- [ ] Use the established color palette
- [ ] Have proper hover states for interactive elements
- [ ] Include appropriate transitions
- [ ] Use semi-transparent backgrounds where applicable
- [ ] Follow the spacing conventions
- [ ] Have sufficient text contrast
- [ ] Include dark mode classes
- [ ] Match the overall aesthetic of the application

## Examples from Codebase

### Tutorial Modal (TutorialFramework.tsx)
- Header: Solid `bg-gray-800` with `border-b border-gray-700`
- Content background: `bg-gray-800/50 backdrop-blur-sm`
- Progress bar: `bg-gray-700` track with `bg-blue-500` fill

### Inference Rules Panel (InferenceRulePalette.tsx)
- Container: `bg-gray-800/50 backdrop-blur-sm border border-gray-700/50`
- Rule cards: `bg-gray-800/30 border-gray-700/50` with hover state
- Examples: `bg-gray-900/50 text-gray-300` code blocks

### Interactive Proof Editor (InteractiveProofEditor.tsx)
- Proof lines: `bg-gray-800/30 border-gray-700/50`
- Highlighted lines: `bg-blue-900/20 border-blue-600/50`
- Rule colors following the established palette

This style guide should be referenced and updated as new patterns emerge in the development process.
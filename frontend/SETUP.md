# Frontend Setup Guide

## What Was Created

A React + Vite frontend application with Tailwind CSS v4 in the `frontend/` directory.

## Tech Stack

- **React 18** - UI library
- **Vite 7** - Build tool and dev server
- **Tailwind CSS v4** - Utility-first CSS framework (latest version)
- **Framer Motion** - Animation library for smooth transitions
- **Lucide React** - Modern icon library

## Tailwind CSS v4 Configuration

Tailwind CSS v4 works differently than v3:

### What's Different

1. **No `tailwind.config.js`** - Configuration is now done via CSS custom properties
2. **New PostCSS plugin** - Uses `@tailwindcss/postcss` instead of `tailwindcss`
3. **CSS import syntax** - Uses `@import "tailwindcss"` instead of `@tailwind` directives

### Configuration Files

**postcss.config.js:**
```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

**src/index.css:**
```css
@import "tailwindcss";
```

**vite.config.js:**
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

## Running the App

```bash
cd frontend
npm install  # If not already done
npm run dev
```

Visit: http://localhost:5173/

## The Signal App

The app includes a beautiful, minimal reading experience with:

- **Live updating indicator** - Shows the app is actively updating
- **Three main sections:**
  1. **"If you only read one thing"** - Top story per interested topic with sources
  2. **Trending** - Top 5 trending items with category switcher (tech, finance, economics, health)
  3. **Today's picks** - Curated content feed
- **Interactive features:**
  - Like/dislike buttons
  - Mute topic functionality
  - Smooth animations and transitions
  - Shimmer loading states
- **Responsive design** - Works on all screen sizes

## Key Features

- Dark theme with subtle glassmorphism effects
- Framer Motion animations for smooth transitions
- Mock data for demonstration
- Clean, minimal UI with excellent typography
- Accessible and semantic HTML

## Next Steps

1. Connect to a real backend API
2. Implement user authentication
3. Add real-time updates
4. Implement topic preferences
5. Add more interactive features


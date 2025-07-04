# AI Agency - Comprehensive API Documentation

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Core Components](#core-components)
   - [AnimatedText](#animatedtext)
   - [AnimatedBackground](#animatedbackground)
   - [Navbar](#navbar)
3. [Section Components](#section-components)
   - [Hero](#hero)
   - [AIAgents](#aiagents)
4. [Layout Components](#layout-components)
   - [RootLayout](#rootlayout)
   - [Home](#home)
5. [Configuration](#configuration)
6. [Dependencies](#dependencies)
7. [Usage Examples](#usage-examples)

---

## 🚀 Project Overview

The AI Agency project is a modern Next.js 15 application built with TypeScript, featuring animated components and interactive UI elements. The project showcases AI automation services with smooth animations powered by Anime.js and Framer Motion.

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Animations**: Anime.js + Framer Motion
- **Icons**: Heroicons React
- **Fonts**: Geist Sans & Geist Mono

---

## 🧩 Core Components

### AnimatedText

A reusable component that provides character-by-character text animation with gradient effects.

#### API Reference

```typescript
interface AnimatedTextProps {
  text: string;           // Required: The text to animate
  className?: string;     // Optional: Additional CSS classes
  delay?: number;         // Optional: Animation delay in milliseconds (default: 0)
}
```

#### Features
- Character-by-character reveal animation
- Gradient text coloring (blue to purple)
- Elastic bounce effect
- Continuous floating animation
- Accessibility support with `aria-label`

#### Usage Example

```tsx
import AnimatedText from './components/AnimatedText';

export default function MyComponent() {
  return (
    <div>
      {/* Basic usage */}
      <AnimatedText text="Welcome to AI Agency" />
      
      {/* With custom styling and delay */}
      <AnimatedText 
        text="Transform Your Business" 
        className="text-4xl font-bold"
        delay={500}
      />
    </div>
  );
}
```

#### Animation Details
- **Initial State**: Characters start with opacity 0, translated up and left, rotated
- **Reveal Animation**: 1.5s elastic animation with staggered 100ms delays
- **Floating Effect**: Continuous subtle vertical movement

---

### AnimatedBackground

A component that creates an animated particle background with floating elements.

#### API Reference

```typescript
// No props required - fully self-contained component
export default function AnimatedBackground(): JSX.Element
```

#### Features
- Creates 10 floating animated particles
- Random sizes, colors, and movement patterns
- Infinite looping animations
- Fixed positioning with no pointer events
- Automatic cleanup on unmount

#### Usage Example

```tsx
import AnimatedBackground from './components/AnimatedBackground';

export default function MyPage() {
  return (
    <div className="relative">
      <AnimatedBackground />
      <div className="relative z-10">
        {/* Your content here */}
      </div>
    </div>
  );
}
```

#### Animation Properties
- **Position**: Absolute positioning across viewport
- **Movement**: Random translation (-500 to 500px)
- **Scale**: Random scaling (0.2 to 2x)
- **Duration**: 3-5 seconds per animation cycle
- **Effects**: Blur filter applied for depth

---

### Navbar

A responsive navigation component with scroll effects and animations.

#### API Reference

```typescript
// No props required - configuration through internal navItems array
export default function Navbar(): JSX.Element
```

#### Features
- Responsive design (mobile-ready)
- Scroll-based background changes
- Staggered navigation item animations
- Framer Motion integration
- Gradient logo text
- Fixed positioning with backdrop blur

#### Navigation Items

```typescript
const navItems = [
  { name: 'Home', href: '/' },
  { name: 'Services', href: '/services' },
  { name: 'AI Agents', href: '/ai-agents' },
  { name: 'Case Studies', href: '/case-studies' },
  { name: 'Contact', href: '/contact' },
];
```

#### Usage Example

```tsx
import Navbar from './components/Navbar';

export default function Layout({ children }) {
  return (
    <div>
      <Navbar />
      <main className="pt-16"> {/* Add padding to account for fixed navbar */}
        {children}
      </main>
    </div>
  );
}
```

#### Scroll Behavior
- **Transparent**: When `scrollY <= 10px`
- **Blurred Background**: When `scrollY > 10px` with `bg-white/80 backdrop-blur-md`

---

## 📄 Section Components

### Hero

The main landing section featuring animated text, call-to-action buttons, and feature highlights.

#### API Reference

```typescript
// No props required - fully self-contained section
export default function Hero(): JSX.Element
```

#### Features
- Animated headline text with staggered reveals
- Interactive call-to-action buttons
- Feature cards with hover effects
- Animated SVG decorations
- Gradient backgrounds
- Responsive design

#### Key Elements

1. **Animated Headlines**
   - "Transform Your Business" (immediate)
   - "with AI Automation" (800ms delay)
   - Subtitle with 1.2s delay

2. **Call-to-Action Buttons**
   - Primary: "Get Started" with purple hover effect
   - Secondary: "Watch Demo" with scale animation

3. **Feature Cards**
   ```typescript
   const features = [
     { icon: '📞', title: 'Call Handling' },
     { icon: '📧', title: 'Email Response' },
     { icon: '⚡', title: 'Task Automation' }
   ];
   ```

#### Usage Example

```tsx
import Hero from './sections/Hero';

export default function HomePage() {
  return (
    <main>
      <Hero />
      {/* Other sections */}
    </main>
  );
}
```

---

### AIAgents

A section showcasing AI agent capabilities with interactive demos and animations.

#### API Reference

```typescript
// No props required - fully self-contained section
export default function AIAgents(): JSX.Element
```

#### Features
- Intersection Observer for scroll-triggered animations
- Agent capability cards with demos
- Animated background lines
- Hover effects and transformations
- Typing animation effects

#### Agent Features Data

```typescript
const agentFeatures = [
  {
    title: 'Intelligent Call Handling',
    description: 'Our AI agents answer calls 24/7...',
    icon: '🎯',
    demo: 'Customer: "I need to reschedule..."\nAI: "I can help..."'
  },
  {
    title: 'Smart Email Response',
    description: 'AI-powered email management...',
    icon: '✉️',
    demo: 'Subject: Order Status Update\nAI: "Your order #12345..."'
  },
  {
    title: 'Task Automation',
    description: 'Automate repetitive tasks...',
    icon: '⚙️',
    demo: 'Task: Invoice Processing\nAI: "Extracting data..."'
  }
];
```

#### Usage Example

```tsx
import AIAgents from './sections/AIAgents';

export default function HomePage() {
  return (
    <main>
      {/* Other sections */}
      <AIAgents />
    </main>
  );
}
```

#### Animation Triggers
- **Viewport Entry**: Cards animate in with staggered delays
- **Hover Effects**: Scale and shadow transformations
- **Demo Text**: Typewriter-style width animations

---

## 🏗 Layout Components

### RootLayout

The root layout component that sets up fonts, metadata, and global styles.

#### API Reference

```typescript
interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): JSX.Element
```

#### Features
- Google Fonts integration (Geist Sans & Mono)
- CSS variable setup for fonts
- SEO metadata configuration
- Global CSS import

#### Metadata Configuration

```typescript
export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};
```

#### Usage Example

```tsx
// This is automatically used by Next.js App Router
// No manual implementation required
```

---

### Home

The main page component that orchestrates all sections.

#### API Reference

```typescript
// No props required - page component
export default function Home(): JSX.Element
```

#### Structure
```tsx
<main className="min-h-screen">
  <Navbar />
  <Hero />
  <AIAgents />
</main>
```

#### Usage Example

```tsx
// This is the default export for src/app/page.tsx
// Automatically rendered by Next.js App Router
```

---

## ⚙️ Configuration

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "jsx": "preserve",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Next.js Configuration

```typescript
// next.config.ts
export default {
  // Default Next.js 15 configuration
};
```

### PostCSS Configuration

```javascript
// postcss.config.mjs
export default {
  plugins: {
    tailwindcss: {},
  },
};
```

---

## 📦 Dependencies

### Core Dependencies

```json
{
  "@heroicons/react": "^2.2.0",
  "@types/animejs": "^3.1.13",
  "animejs": "^3.2.2",
  "framer-motion": "^12.4.10",
  "next": "15.2.1",
  "react": "^19.0.0",
  "react-dom": "^19.0.0"
}
```

### Development Dependencies

```json
{
  "@tailwindcss/postcss": "^4",
  "tailwindcss": "^4",
  "typescript": "^5",
  "eslint": "^9",
  "eslint-config-next": "15.2.1"
}
```

---

## 💡 Usage Examples

### Complete Page Implementation

```tsx
import Navbar from './components/Navbar';
import Hero from './sections/Hero';
import AIAgents from './sections/AIAgents';
import AnimatedBackground from './components/AnimatedBackground';

export default function LandingPage() {
  return (
    <div className="relative">
      <AnimatedBackground />
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <AIAgents />
      </main>
    </div>
  );
}
```

### Custom Animated Section

```tsx
import AnimatedText from './components/AnimatedText';
import { motion } from 'framer-motion';

export default function CustomSection() {
  return (
    <section className="py-20">
      <div className="max-w-4xl mx-auto text-center">
        <AnimatedText 
          text="Custom Section Title"
          className="text-4xl font-bold mb-8"
        />
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-lg text-gray-600"
        >
          Your content here with coordinated animations.
        </motion.p>
      </div>
    </section>
  );
}
```

### Responsive Layout Pattern

```tsx
export default function ResponsiveComponent() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns */}
    </div>
  );
}
```

---

## 🚀 Getting Started

### Installation

```bash
npm install
# or
yarn install
```

### Development

```bash
npm run dev
# or
yarn dev
```

### Building

```bash
npm run build
# or
yarn build
```

### Linting

```bash
npm run lint
# or
yarn lint
```

---

## 🎨 Animation Guidelines

### Performance Considerations
- Use `transform` and `opacity` properties for optimal performance
- Implement `will-change` when necessary
- Clean up animations on component unmount
- Use `requestAnimationFrame` for complex animations

### Accessibility
- Respect `prefers-reduced-motion` user preferences
- Provide `aria-label` attributes for animated text
- Ensure animations don't interfere with screen readers

### Best Practices
- Coordinate animation timing with user expectations
- Use easing functions that feel natural
- Stagger animations for visual hierarchy
- Provide fallbacks for users with motion sensitivity

---

*This documentation covers all public APIs, components, and functions in the AI Agency project. For additional customization or advanced usage patterns, refer to the individual component implementations in the source code.*
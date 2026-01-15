# Design Guidelines

## Design Approach
**Reference-Based: Modern SaaS Application** - Drawing inspiration from Linear, Vercel, and Stripe's clean, professional aesthetics with emphasis on clarity and sophisticated simplicity.

## Core Design Principles
- **Information Clarity**: Content-first with strategic whitespace
- **Professional Polish**: Refined, contemporary design that builds trust
- **Purposeful Simplicity**: Every element serves a clear function

---

## Typography System

**Font Stack:**
- Primary: Inter (400, 500, 600)
- Mono: JetBrains Mono (for code/technical elements if needed)

**Hierarchy:**
- H1: text-5xl md:text-6xl font-semibold tracking-tight
- H2: text-3xl md:text-4xl font-semibold
- H3: text-2xl font-semibold
- Body: text-base leading-relaxed
- Small: text-sm
- Caption: text-xs

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Component padding: p-6 to p-8
- Section spacing: py-16 md:py-24
- Element gaps: gap-4 to gap-8

**Container Strategy:**
- Max-width: max-w-7xl
- Content sections: max-w-6xl
- Text content: max-w-3xl
- Consistent px-6 md:px-8 horizontal padding

**Grid Patterns:**
- Feature grids: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Content layouts: grid-cols-1 lg:grid-cols-2
- Always single column on mobile

---

## Component Library

**Navigation**
- Clean horizontal nav with subtle hover states
- Logo left, primary actions right
- Sticky positioning with backdrop blur when scrolling
- Mobile: Hamburger menu with slide-in panel

**Buttons**
- Primary: Solid with medium font weight, rounded-lg
- Secondary: Outlined with border
- Ghost: Text-only with hover background
- Sizes: px-6 py-3 (default), px-8 py-4 (large)

**Cards**
- Subtle border with rounded-xl
- Padding: p-6 to p-8
- Hover: Gentle lift with shadow (translate-y-[-2px])

**Forms**
- Inputs: Clean borders, rounded-lg, px-4 py-3
- Labels: text-sm font-medium, mb-2
- Focus states: Ring with offset
- Validation: Inline messages below fields

**Data Display**
- Tables: Striped rows, sticky headers
- Stats: Large numbers with descriptive labels
- Lists: Clean spacing with subtle dividers

---

## Page Structure

**Hero Section**
- Height: min-h-[600px] md:min-h-[700px]
- Large, impactful headline
- Supporting subtext (max-w-2xl)
- Primary + Secondary CTA buttons
- **Hero Image: YES** - Large, high-quality image or gradient background
- If buttons over image: Add backdrop-blur-sm bg-white/10 to button backgrounds

**Content Sections**
- Alternating layouts for visual interest
- Feature sections: 2-column split (text + visual)
- Showcase grids: 3-column on desktop, stack on mobile
- Testimonials: 3-column grid with customer photos
- CTA sections: Centered with gradient backgrounds

**Footer**
- 4-column grid on desktop (Product, Company, Resources, Legal)
- Newsletter signup
- Social links
- Copyright and trust indicators
- Stack on mobile

---

## Images Strategy

**Placement:**
- Hero: Full-width background or large featured image
- Feature sections: Product screenshots, UI mockups
- Team section: Professional headshots
- Testimonials: Customer photos (rounded-full, small)
- Case studies: Before/after, results visuals

**Treatment:**
- Rounded corners: rounded-lg to rounded-xl
- Subtle shadows for depth
- Aspect ratios: Maintain 16:9 for screenshots, 1:1 for avatars

---

## Animations
**Minimal & Purposeful:**
- Fade-in on scroll for major sections only
- Subtle hover states (scale, opacity, transform)
- Page transitions: Smooth, no jarring effects
- Loading states: Simple spinners or skeleton screens

**Avoid:** Complex scroll-triggered animations, parallax effects, elaborate transitions

---

## Accessibility
- Semantic HTML throughout
- ARIA labels on interactive elements
- Keyboard navigation support
- Sufficient contrast ratios (WCAG AA minimum)
- Focus indicators visible and clear

---

## Key Differentiators
- **Sophisticated restraint** over flashy effects
- **Generous whitespace** for breathing room
- **Strong typography hierarchy** for scannability
- **Purposeful imagery** that supports content
- **Clean, professional aesthetic** that builds credibility

This design balances modern aesthetics with practical functionality, creating a polished, trustworthy experience suitable for professional web applications.
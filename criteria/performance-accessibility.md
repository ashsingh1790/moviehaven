# Performance & Accessibility Criteria

> Evaluator type: AI agent | Scoring: 1-10 per dimension
> Weighting: All dimensions weighted equally (1x).

**Evaluator instructions:** Be skeptical — do not default to praising the work. Every score must cite specific evidence (measured load times, DOM inspection, viewport testing). If you are unsure whether something meets a threshold, score it lower and explain why.

## Dimensions

### 1. Load Performance (Weight: 1x)

How fast does the application load and become interactive? Considers bundle size, code splitting, image optimization, server-side rendering, and initial paint times.

| Score | Description |
|-------|-------------|
| 9-10  | Near-instant. Optimized bundles, proper code splitting, lazy loading, SSR/streaming where appropriate. Sub-second meaningful paint. |
| 7-8   | Fast. Minor optimization opportunities remain but nothing noticeable to users. |
| 5-6   | Acceptable. Loads in a few seconds. Missing some obvious optimizations (uncompressed images, no code splitting). |
| 3-4   | Slow. Noticeable delays, large unoptimized bundles, no lazy loading. Users wait. |
| 1-2   | Painfully slow. Multi-second blank screens, massive bundles, render-blocking everything. |

### 2. Runtime Performance (Weight: 1x)

Is the app responsive during use? Smooth scrolling, fast interactions, no jank, efficient re-renders, no memory leaks during extended use.

| Score | Description |
|-------|-------------|
| 9-10  | Buttery smooth. 60fps interactions, efficient updates, no unnecessary re-renders. Handles large datasets gracefully. |
| 7-8   | Smooth with occasional minor hiccups under stress. No issues in normal use. |
| 5-6   | Noticeable lag in some interactions. Unnecessary re-renders or heavy operations on the main thread. |
| 3-4   | Janky. Dropped frames, sluggish interactions, UI freezes during operations. |
| 1-2   | Unusable. Constant freezing, memory leaks, crashes under normal load. |

### 3. Semantic HTML & Screen Readers (Weight: 1x)

Proper use of semantic elements, ARIA attributes where needed, logical heading hierarchy, meaningful alt text, keyboard-navigable interactive elements.

| Score | Description |
|-------|-------------|
| 9-10  | Fully accessible. Semantic markup throughout, correct ARIA usage, screen reader tested, logical tab order, meaningful alt text. |
| 7-8   | Good accessibility. Minor gaps (missing alt text, occasional div-as-button) but largely navigable with assistive tech. |
| 5-6   | Basic semantics in place. Some ARIA, some semantic elements, but screen reader experience would be rough. |
| 3-4   | Poor. Div soup, no ARIA, images without alt text, custom controls without keyboard support. |
| 1-2   | Inaccessible. Completely unusable with assistive technology. |

### 4. Responsive Design (Weight: 1x)

Does the interface work across viewport sizes? Proper breakpoints, no horizontal overflow, touch targets sized correctly on mobile, images scale appropriately.

| Score | Description |
|-------|-------------|
| 9-10  | Flawless across all viewports. Thoughtful layout shifts, appropriate touch targets, no content loss at any size. |
| 7-8   | Works well on major breakpoints. Minor issues at uncommon sizes. |
| 5-6   | Desktop-first with basic mobile support. Some elements overflow or become cramped on small screens. |
| 3-4   | Broken on mobile. Overlapping elements, unreadable text, horizontal scrolling. |
| 1-2   | Single viewport only. Completely unusable outside the designed screen size. |

## Scoring Formula

```
Weighted Score = (Load Performance + Runtime Performance + Semantic HTML + Responsive Design) / 4
```

## Hard Threshold

Any single dimension scoring **3 or below** triggers a fail. Semantic HTML scoring **4 or below** also triggers a fail — accessibility is a baseline requirement.

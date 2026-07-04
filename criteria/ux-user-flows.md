# UX & User Flows Criteria

> Evaluator type: AI agent | Scoring: 1-10 per dimension
> Weighting: Task Completion, Information Architecture, and Product Depth weighted **1.5x** relative to Feedback & State Communication and Onboarding.

**Evaluator instructions:** Be skeptical — do not default to praising the work. Every score must cite specific flows, screens, or interactions as evidence. If you are unsure whether something meets a threshold, score it lower and explain why.

## Dimensions

### 1. Task Completion (Weight: 1.5x)

Can a user complete core tasks end-to-end without confusion or dead ends? Every primary flow should have a clear start, logical progression, and satisfying conclusion.

| Score | Description |
|-------|-------------|
| 9-10  | All core flows are seamless. Clear entry points, logical steps, obvious completion states. No dead ends or ambiguous next steps. |
| 7-8   | Core flows work well. Minor friction points that don't block completion. |
| 5-6   | Flows are completable but require some guessing. Missing confirmation states or unclear progression. |
| 3-4   | Some core flows have dead ends or confusing branching. Users would abandon tasks. |
| 1-2   | Primary tasks cannot be completed. Broken flows, missing steps, no clear paths. |

### 2. Information Architecture (Weight: 1.5x)

Is content organized in a way that matches user mental models? Logical grouping, sensible navigation hierarchy, predictable locations for features.

| Score | Description |
|-------|-------------|
| 9-10  | Intuitive structure. Users find things where they expect them. Navigation mirrors how people think about the domain. |
| 7-8   | Logical organization with minor surprises. Most things are where you'd expect. |
| 5-6   | Adequate but some features are buried or grouped in non-obvious ways. |
| 3-4   | Confusing organization. Features in unexpected places, illogical groupings, deep nesting. |
| 1-2   | No coherent structure. Features are randomly distributed. Navigation provides no useful mental model. |

### 3. Product Depth (Weight: 1.5x)

Are features fully built out or just surface-level shells? A feature should work end-to-end with edge cases handled, not just the happy path demo'd.

| Score | Description |
|-------|-------------|
| 9-10  | Every feature is complete. Edge cases handled, settings persist, advanced options work, nothing is a stub or placeholder. |
| 7-8   | Core features are deep and complete. A few secondary features are shallow but functional. |
| 5-6   | Happy paths work but features lack depth. Missing edge case handling, incomplete settings, some stubs. |
| 3-4   | Most features are surface-level. They look present in the UI but break or dead-end when used beyond the demo case. |
| 1-2   | Features are facades. Buttons exist but do nothing, forms don't save, core functionality is missing. |

### 4. Feedback & State Communication (Weight: 1x)

Does the UI keep users informed? Loading states, success/error messages, progress indicators, empty states, and transition animations that communicate what's happening.

| Score | Description |
|-------|-------------|
| 9-10  | Every action has clear feedback. Loading spinners, success toasts, error explanations, progress bars, meaningful empty states. Users always know what's happening. |
| 7-8   | Good feedback for most actions. A few silent operations or missing empty states. |
| 5-6   | Basic feedback. Some actions provide confirmation, others leave users guessing. Inconsistent empty states. |
| 3-4   | Sparse feedback. Actions happen silently, errors aren't communicated, loading states missing. |
| 1-2   | No feedback. Users click and nothing visibly happens. No indication of loading, success, or failure. |

### 5. Onboarding & Discoverability (Weight: 1x)

Can a first-time user understand the app without instruction? Are features discoverable through the UI? Tooltips, contextual hints, progressive disclosure where appropriate.

| Score | Description |
|-------|-------------|
| 9-10  | Self-explanatory. A first-time user understands the purpose and primary actions immediately. Advanced features are discoverable but don't overwhelm. |
| 7-8   | Mostly self-explanatory. One or two features require discovery but core value is immediately clear. |
| 5-6   | Requires some exploration. Purpose is clear but how to accomplish tasks isn't immediately obvious. |
| 3-4   | Confusing for new users. Key features hidden, purpose unclear without explanation. |
| 1-2   | Impenetrable. A new user would not know what the app does or how to start. |

## Scoring Formula

```
Weighted Score = ((Task Completion * 1.5) + (Info Architecture * 1.5) + (Product Depth * 1.5) + Feedback + Onboarding) / 6.5
```

## Hard Threshold

Any single dimension scoring **3 or below** triggers a fail. Task Completion or Product Depth scoring **4 or below** also triggers a fail — if users can't complete core tasks or features are hollow, nothing else matters.

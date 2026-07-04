# Code Quality & Architecture Criteria

> Evaluator type: AI agent | Scoring: 1-10 per dimension
> Weighting: All dimensions weighted equally (1x).

**Evaluator instructions:** Be skeptical — do not default to praising the work. Every score must cite specific files, functions, or patterns as evidence. If you are unsure whether something meets a threshold, score it lower and explain why.

## Dimensions

### 1. Structure & Organization (Weight: 1x)

Is the codebase logically organized? Clear separation of concerns, sensible file/folder structure, and discoverable code — a new developer should be able to navigate it without a tour.

| Score | Description |
|-------|-------------|
| 9-10  | Immediately navigable. Clear module boundaries, consistent file organization, separation of concerns is obvious. |
| 7-8   | Well-organized with minor inconsistencies. Easy to find things, a few misplaced files or unclear boundaries. |
| 5-6   | Adequate but requires some hunting. Mixed conventions, some business logic in wrong layers. |
| 3-4   | Disorganized. Logic scattered across files, no clear boundaries, unclear where new code should go. |
| 1-2   | Chaotic. Everything in a few monolithic files or randomly scattered. No discernible structure. |

### 2. Maintainability (Weight: 1x)

Can the code be modified safely? Readable naming, reasonable function/component size, minimal coupling, no hidden side effects, DRY without over-abstraction.

| Score | Description |
|-------|-------------|
| 9-10  | Highly maintainable. Clear naming, small focused functions, changes are localized and safe. |
| 7-8   | Good. Most code is readable and modifiable. A few long functions or unclear names. |
| 5-6   | Functional but risky to change. Some tightly coupled modules, unclear side effects. |
| 3-4   | Fragile. Changes in one place break others. Duplicated logic, misleading names. |
| 1-2   | Unmaintainable. God functions, global mutable state, impossible to change safely. |

### 3. Patterns & Consistency (Weight: 1x)

Are patterns applied consistently across the codebase? Same problem solved the same way, consistent naming conventions, consistent error handling approach, no style drift between files.

| Score | Description |
|-------|-------------|
| 9-10  | Perfectly consistent. One clear way to do each thing. Feels like one developer wrote it. |
| 7-8   | Mostly consistent. A few deviations that don't cause confusion. |
| 5-6   | Mixed. Two or three competing patterns for the same problem. Workable but noisy. |
| 3-4   | Inconsistent. Every file does things differently. No established conventions. |
| 1-2   | No patterns. Random approaches throughout. Copy-paste with local mutations. |

### 4. Type Safety & Correctness (Weight: 1x)

Proper use of TypeScript (or the project's type system). Minimal use of `any`, correct types for data shapes, exhaustive handling where needed, no type assertions that hide bugs.

| Score | Description |
|-------|-------------|
| 9-10  | Full type coverage. Types accurately model the domain, no `any` escape hatches, compiler catches real bugs. |
| 7-8   | Strong typing with occasional pragmatic shortcuts that don't hide bugs. |
| 5-6   | Types present but shallow. Many `any` or overly broad types. Type system provides limited safety. |
| 3-4   | Minimal typing. Frequent `any`, type assertions everywhere, types are decorative. |
| 1-2   | Effectively untyped. `any` throughout, or types are actively wrong/misleading. |

## Scoring Formula

```
Weighted Score = (Structure + Maintainability + Patterns + Type Safety) / 4
```

## Hard Threshold

Any single dimension scoring **3 or below** triggers a fail.

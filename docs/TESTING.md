# Test-Driven Development Guide for Movie Haven

**Philosophy:** Write tests first, implementation second. Tests define the contract; code fulfills it.

**Coverage Target:** 80% for critical paths (auth, recommendations), 60% overall.

---

## Table of Contents

1. [TDD Workflow](#tdd-workflow)
2. [Testing Pyramid](#testing-pyramid)
3. [Testing Stack](#testing-stack)
4. [Backend Testing (Node.js + tRPC)](#backend-testing-nodejs--trpc)
5. [Frontend Testing (Next.js + React)](#frontend-testing-nextjs--react)
6. [CI/CD Integration](#cicd-integration)
7. [Testing Best Practices](#testing-best-practices)

---

## TDD Workflow

### Step 1: Write the Test (RED)
```typescript
// Write test that defines desired behavior
// Test will FAIL because code doesn't exist yet
describe("User Registration", () => {
  it("should create a user with valid email and password", async () => {
    const result = await authRouter.createCaller(ctx).register({
      email: "user@example.com",
      password: "SecurePass123!",
      username: "newuser"
    });
    
    expect(result.user.email).toBe("user@example.com");
    expect(result.token).toBeDefined();
  });
});
```

### Step 2: Write Minimal Code (GREEN)
```typescript
// Write minimal code to make test pass
export const register = async (input: RegisterInput) => {
  const user = await db.insert(users).values({
    email: input.email,
    passwordHash: await hashPassword(input.password),
    username: input.username
  }).returning();
  
  const token = await signToken({ userId: user.id });
  return { user, token };
};
```

### Step 3: Refactor (REFACTOR)
```typescript
// Improve code quality without changing behavior
// Tests stay green throughout refactoring
const normalizedEmail = input.email.toLowerCase().trim();
const passwordHash = await hashPassword(input.password);

const [user] = await db.insert(users).values({
  email: normalizedEmail,
  passwordHash,
  username: input.username
}).returning();
```

### Repeat
Cycle through RED → GREEN → REFACTOR for every feature.

---

## Testing Pyramid

```
        🎭
       E2E Tests
      (10% of tests)
     
      🔗
    Integration Tests
    (30% of tests)
    
    ✅
  Unit Tests
  (60% of tests)
```

### Unit Tests (60%)
**What:** Test individual functions in isolation  
**Tools:** Vitest (fast, Node.js native)  
**Example:** Testing password validation function

```typescript
describe("Password Validation", () => {
  it("should reject password without uppercase", () => {
    expect(() => validatePassword("lowercase123")).toThrow();
  });
  
  it("should accept valid password", () => {
    expect(() => validatePassword("ValidPass123")).not.toThrow();
  });
});
```

### Integration Tests (30%)
**What:** Test how components work together (API + DB)  
**Tools:** Vitest + test database  
**Example:** Testing full auth flow (register → login → access protected route)

```typescript
describe("Auth Flow", () => {
  it("should register user and allow login", async () => {
    // Register
    const registerResult = await authRouter.register({ /* ... */ });
    
    // Login with same credentials
    const loginResult = await authRouter.login({
      email: "user@example.com",
      password: "SecurePass123!"
    });
    
    expect(loginResult.user.id).toBe(registerResult.user.id);
    expect(loginResult.token).toBeDefined();
  });
});
```

### E2E Tests (10%)
**What:** Test full user flows in browser  
**Tools:** Playwright  
**Example:** User signs up, browses films, rates a movie

```typescript
test("user can sign up and rate a movie", async ({ page }) => {
  // Sign up
  await page.goto("http://localhost:3000/sign-up");
  await page.fill('input[name="email"]', "user@example.com");
  await page.fill('input[name="password"]', "SecurePass123!");
  await page.click("button[type='submit']");
  
  // Wait for redirect to films page
  await page.waitForURL("/films");
  
  // Rate a movie
  await page.click("text=Browse");
  await page.click("text=Rate"); // First movie's rate button
  await page.click("text=8"); // Rate 8/10
  
  // Verify rating was saved
  expect(await page.textContent("text=You rated")).toBeTruthy();
});
```

---

## Testing Stack

### Backend (Node.js)

| Tool | Purpose | Install |
|------|---------|---------|
| **Vitest** | Unit/integration testing | `npm install -D vitest` |
| **@vitest/ui** | Test UI dashboard | `npm install -D @vitest/ui` |
| **@testing-library/node** | Test utilities | `npm install -D @testing-library/node` |
| **Docker** | Isolated test DB/Redis | Pre-installed |

### Frontend (Next.js)

| Tool | Purpose | Install |
|------|---------|---------|
| **Vitest** | Component testing | `npm install -D vitest` |
| **@testing-library/react** | React component testing | `npm install -D @testing-library/react` |
| **@testing-library/user-event** | User interaction simulation | `npm install -D @testing-library/user-event` |
| **jsdom** | DOM environment | `npm install -D jsdom` |
| **Playwright** | E2E testing | `npm install -D @playwright/test` |

### Configuration

**vitest.config.ts**
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom", // for React components
    globals: true, // use describe/it without imports
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "packages/*/dist",
      ],
    },
  },
});
```

---

## Backend Testing (Node.js + tRPC)

### Setup Test Database

```typescript
// apps/api/src/test-setup.ts

import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import postgres from "postgres";

export async function setupTestDatabase() {
  // Connect to test database
  const client = postgres(process.env.TEST_DATABASE_URL!);
  const db = drizzle(client);
  
  // Run migrations
  await db.execute(sql`CREATE TABLE IF NOT EXISTS users (...)`);
  
  return { db, client };
}

export async function teardownTestDatabase(client: postgres.Sql) {
  // Drop all tables
  await client`DROP TABLE IF EXISTS users, films, ratings CASCADE`;
  await client.end();
}
```

### Unit Test Example: Password Hashing

```typescript
// apps/api/src/lib/__tests__/password.test.ts

import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../password";

describe("Password Hashing", () => {
  it("should hash password", async () => {
    const hash = await hashPassword("SecurePass123!");
    
    // Hash should not equal original
    expect(hash).not.toBe("SecurePass123!");
    // Hash should be a valid bcrypt hash
    expect(hash).toMatch(/^\$2[aby]\$/);
  });
  
  it("should verify correct password", async () => {
    const password = "SecurePass123!";
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });
  
  it("should reject incorrect password", async () => {
    const hash = await hashPassword("SecurePass123!");
    
    const isValid = await verifyPassword("WrongPassword456", hash);
    expect(isValid).toBe(false);
  });
});
```

### Integration Test Example: User Registration

```typescript
// apps/api/src/trpc/routers/__tests__/auth.test.ts

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTRPCMsw } from "trpc-msw";
import { appRouter } from "../../router";
import { setupTestDatabase, teardownTestDatabase } from "../../../test-setup";

describe("Auth Router - Registration", () => {
  let db: any;
  let client: any;
  
  beforeEach(async () => {
    ({ db, client } = await setupTestDatabase());
  });
  
  afterEach(async () => {
    await teardownTestDatabase(client);
  });
  
  it("should register a new user", async () => {
    const caller = appRouter.createCaller({ db });
    
    const result = await caller.auth.register({
      email: "user@example.com",
      password: "SecurePass123!",
      username: "testuser"
    });
    
    expect(result.user.email).toBe("user@example.com");
    expect(result.user.username).toBe("testuser");
    expect(result.token).toBeDefined();
  });
  
  it("should reject duplicate email", async () => {
    const caller = appRouter.createCaller({ db });
    
    // Register first user
    await caller.auth.register({
      email: "user@example.com",
      password: "SecurePass123!",
      username: "user1"
    });
    
    // Try to register with same email
    expect(
      caller.auth.register({
        email: "user@example.com",
        password: "DifferentPass456!",
        username: "user2"
      })
    ).rejects.toThrow("Email already registered");
  });
  
  it("should validate password requirements", async () => {
    const caller = appRouter.createCaller({ db });
    
    expect(
      caller.auth.register({
        email: "user@example.com",
        password: "weak", // no uppercase, no number
        username: "testuser"
      })
    ).rejects.toThrow("Password must");
  });
});
```

### Testing tRPC Procedures

```typescript
// Pattern for testing tRPC routers

const caller = appRouter.createCaller({
  db: testDb,
  redis: testRedis,
  userId: "test-user-id", // for protectedProcedure
});

// Public procedure
const result = await caller.films.search({ query: "Interstellar" });

// Protected procedure
expect(
  caller.users.rateFilm({ filmId: 1, score: 9 })
).rejects.toThrow("UNAUTHORIZED"); // without userId in context
```

---

## Frontend Testing (Next.js + React)

### Unit Test Example: Password Strength Indicator

```typescript
// apps/web/src/app/(auth)/sign-up/__tests__/page.test.tsx

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { getPasswordStrength } from "../page";

describe("Password Strength", () => {
  it("should return 'Weak' for short password", () => {
    const result = getPasswordStrength("Abc1");
    expect(result.label).toBe("Weak");
  });
  
  it("should return 'Good' for medium password", () => {
    const result = getPasswordStrength("SecurePass123");
    expect(result.label).toBe("Good");
  });
  
  it("should return 'Strong' for long password with special chars", () => {
    const result = getPasswordStrength("VerySecurePass123!@#");
    expect(result.label).toBe("Strong");
  });
});
```

### Component Test Example: Sign Up Form

```typescript
// apps/web/src/app/(auth)/sign-up/__tests__/form.test.tsx

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignUpPage from "../page";

describe("Sign Up Form", () => {
  beforeEach(() => {
    render(<SignUpPage />);
  });
  
  it("should display sign up form with email and password fields", () => {
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(screen.getByLabelText("Username")).toBeTruthy();
  });
  
  it("should disable submit button when form is invalid", async () => {
    const submitBtn = screen.getByRole("button", { name: /create account/i });
    
    // Initially disabled
    expect(submitBtn).toBeDisabled();
    
    // Still disabled with only email
    await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
    expect(submitBtn).toBeDisabled();
  });
  
  it("should enable submit button when form is valid", async () => {
    await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "SecurePass123!");
    await userEvent.type(screen.getByLabelText("Username"), "testuser");
    
    const submitBtn = screen.getByRole("button", { name: /create account/i });
    expect(submitBtn).not.toBeDisabled();
  });
  
  it("should show error message on submission failure", async () => {
    await userEvent.type(screen.getByLabelText("Email"), "taken@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "SecurePass123!");
    await userEvent.type(screen.getByLabelText("Username"), "testuser");
    
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeTruthy();
    });
  });
});
```

---

## E2E Testing with Playwright

```typescript
// apps/web/e2e/auth.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("user can sign up and sign in", async ({ page }) => {
    // Visit sign up page
    await page.goto("http://localhost:3000/sign-up");
    
    // Fill form
    await page.fill('input[name="email"]', "newuser@example.com");
    await page.fill('input[name="password"]', "SecurePass123!");
    await page.fill('input[name="username"]', "newuser");
    
    // Submit
    await page.click("button[type='submit']");
    
    // Should redirect to films page
    await expect(page).toHaveURL(/\/films/);
    
    // Log out
    await page.click("button[aria-label='User menu']");
    await page.click("text=Logout");
    
    // Should be back at home
    await expect(page).toHaveURL(/^\//);
    
    // Log in again
    await page.click("text=Sign in");
    await page.fill('input[name="email"]', "newuser@example.com");
    await page.fill('input[name="password"]', "SecurePass123!");
    await page.click("button[type='submit']");
    
    // Should be back at films
    await expect(page).toHaveURL(/\/films/);
  });
  
  test("user can browse and rate films", async ({ page, context }) => {
    // Sign in first
    await signInAs(page, "user@example.com", "SecurePass123!");
    
    // Browse to films
    await page.goto("http://localhost:3000/films");
    
    // Filter by genre
    await page.click("button:has-text('Filters')");
    await page.click("text=Sci-Fi");
    
    // Should show filtered films
    const filmCards = await page.locator('[data-testid="film-card"]');
    expect(await filmCards.count()).toBeGreaterThan(0);
    
    // Rate first film
    const firstFilmRateBtn = filmCards.first().locator("button:has-text('Rate')");
    await firstFilmRateBtn.click();
    await page.click("text=8");
    
    // Confirm rating was saved
    await expect(page.locator("text=You rated")).toBeTruthy();
  });
});

async function signInAs(page: any, email: string, password: string) {
  await page.goto("http://localhost:3000/sign-in");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click("button[type='submit']");
  await page.waitForURL(/\/films/);
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml

name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: movie_haven_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: pnpm/action-setup@v2
      
      - uses: actions/setup-node@v3
        with:
          node-version: "22"
          cache: "pnpm"
      
      - run: pnpm install
      
      - run: pnpm type-check
      
      - run: pnpm lint
      
      - run: pnpm test:unit
        env:
          TEST_DATABASE_URL: postgresql://postgres:test@localhost:5432/movie_haven_test
          TEST_REDIS_URL: redis://localhost:6379
      
      - run: pnpm test:integration
        env:
          TEST_DATABASE_URL: postgresql://postgres:test@localhost:5432/movie_haven_test
          TEST_REDIS_URL: redis://localhost:6379
      
      - run: pnpm build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:unit": "vitest run --reporter=verbose",
    "test:integration": "vitest run integration",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch",
    "test:debug": "vitest --inspect-brk --inspect --single-thread"
  }
}
```

---

## Testing Best Practices

### 1. Write Tests Before Code (TDD)

```typescript
// ❌ WRONG: Write code first, then tests
export const register = async (input) => { ... };

// ✅ RIGHT: Write test first, then code
it("should register user with valid input", async () => { ... });
// Then implement register()
```

### 2. Test Behavior, Not Implementation

```typescript
// ❌ WRONG: Tests too tightly coupled to implementation
expect(user.passwordHash).toBe(expectedHash);

// ✅ RIGHT: Test what matters
const isValid = await verifyPassword(password, user.passwordHash);
expect(isValid).toBe(true);
```

### 3. Use Descriptive Test Names

```typescript
// ❌ WRONG
it("should work", () => { ... });

// ✅ RIGHT
it("should create user with valid email and reject duplicate emails", () => { ... });
```

### 4. Isolate Tests

```typescript
// ✅ RIGHT: Each test is independent
beforeEach(async () => {
  await setupTestDatabase(); // Fresh DB for each test
});

afterEach(async () => {
  await teardownTestDatabase(); // Clean up
});
```

### 5. Don't Test Third-Party Code

```typescript
// ❌ WRONG: Testing bcrypt (trust the library)
expect(bcrypt.hash(...)).toBeDefined();

// ✅ RIGHT: Test your wrapper
expect(hashPassword("pass")).resolves.toBeDefined();
```

### 6. Use Test Data Builders

```typescript
// ✅ RIGHT: Easy to create test data
const user = createUser({ email: "test@example.com" });
const film = createFilm({ title: "Interstellar", tmdbScore: 8.5 });

function createUser(overrides = {}) {
  return {
    id: "test-id",
    email: "user@example.com",
    username: "testuser",
    ...overrides
  };
}
```

### 7. Test Error Cases

```typescript
// ✅ RIGHT: Test both happy path and errors
it("should accept valid password", () => { ... });
it("should reject password without uppercase", () => { ... });
it("should reject password under 8 characters", () => { ... });
```

---

## Coverage Targets

| Module | Target | Rationale |
|--------|--------|-----------|
| **Auth** | 90% | Critical for security |
| **Recommendations** | 85% | High business impact |
| **Films API** | 80% | Core feature |
| **Utils** | 60% | Supporting code |
| **UI Components** | 70% | User-facing |
| **Overall** | 80% | Balance coverage vs. speed |

### Check Coverage

```bash
pnpm test:coverage

# Output:
# Statements   : 82.5% ( 330/400 )
# Branches     : 78.3% ( 145/185 )
# Functions    : 85.2% ( 87/102 )
# Lines        : 81.9% ( 320/390 )
```

---

## Testing Checklist for Each Story

When implementing a story, include:

- [ ] **Unit tests** for new functions/utilities
- [ ] **Integration tests** for API endpoints
- [ ] **Component tests** for new React components
- [ ] **E2E tests** for critical user flows
- [ ] **Error handling tests** (what if API fails?)
- [ ] **Edge case tests** (empty input, null values, etc.)
- [ ] **Performance tests** (if applicable)
- [ ] **Accessibility tests** (for components)
- [ ] **All tests pass** before committing
- [ ] **Coverage maintained** (no decrease)

---

## Running Tests Locally

```bash
# Run all tests once
pnpm test

# Watch mode (auto-rerun on changes)
pnpm test:watch

# Run only one test file
pnpm test auth.test.ts

# Run tests matching pattern
pnpm test password

# Open UI dashboard
pnpm test:ui

# Debug a specific test
pnpm test:debug auth.test.ts

# Check coverage
pnpm test:coverage
```

---

## Resources

- **Vitest Docs:** https://vitest.dev
- **Testing Library:** https://testing-library.com
- **Playwright:** https://playwright.dev
- **Jest/Vitest Guide:** https://kentcdodds.com/blog/common-mistakes-with-react-testing-library

---

**Last Updated:** May 25, 2026  
**Next:** Apply TDD to Phase 1 stories (write tests before code)

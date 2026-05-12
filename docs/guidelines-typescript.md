# TypeScript & Code Quality Guidelines

Coding standards and best practices for perpetual-presentation (React 19 + Vite + TypeScript PWA).

## 1. The "No Magic Strings/Numbers" Rule

**Principle:** Do not scatter string literals or magic numbers throughout the codebase. Magic strings for state, phases, or constants make refactoring difficult and prone to typos.

**Bad Practice:**
```typescript
// ❌ BAD: Magic strings
if (playerState.phase === 'fullscreen') { ... }

// ❌ BAD: Magic number
if (elapsedTime > 5000) { ... }

// ❌ BAD: Hardcoded color
backgroundColor: '#FF0000'
```

**Good Practice:**
```typescript
// ✅ GOOD: Centralized constants
import { PlayerPhase } from './types/player';
if (playerState.phase === PlayerPhase.FULLSCREEN) { ... }

// ✅ GOOD: Named constant
import { SLIDE_AUTO_ADVANCE_MS } from './constants/timing';
if (elapsedTime > SLIDE_AUTO_ADVANCE_MS) { ... }

// ✅ GOOD: Theme color
import { themeColors } from './theme/colors';
backgroundColor: themeColors.error
```

### 1a. No Magic Numbers in Tests

**Principle:** Test files MUST use the same constants defined in the source code. When a constant value changes, tests using hardcoded magic numbers will NOT be automatically updated.

**Bad Practice:**
```typescript
// ❌ BAD: Magic number in test - breaks when constant changes
describe('Slide timer', () => {
  it('should clamp interval to minimum', () => {
    const result = clampInterval(500);
    expect(result).toBe(1000);  // ❌ Wrong! MIN_INTERVAL_MS is 2000, not 1000
  });
});
```

**Good Practice:**
```typescript
// ✅ GOOD: Import and use the constant
import { MIN_INTERVAL_MS, MAX_INTERVAL_MS, DEFAULT_INTERVAL_MS } from '../src/constants/timing';

describe('Slide timer', () => {
  it('should clamp interval to minimum', () => {
    const result = clampInterval(500);
    expect(result).toBe(MIN_INTERVAL_MS);  // ✅ Stays in sync with code
  });
});
```

**Rule:** If a number is defined as a constant in the source code, tests MUST import and use that constant instead of hardcoding the value.

### 1b. Exception: Magic Numbers in Styles

**Principle:** The "no magic numbers" rule applies primarily to **business logic, state, and semantic constants**. For styling, magic numbers are **acceptable** when a design system constant doesn't exist.

**When Magic Numbers Are OK:**
```typescript
const styles = {
  // ✅ OK: Component-specific font sizes (no standard constants exist)
  fontSize: 28,
  lineHeight: 36,

  // ✅ OK: Shadow properties (no standard constants exist)
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.4,
  shadowRadius: 16,

  // ✅ OK: Animation timing values (style-related, not business logic)
  transitionDuration: 0.4,
  staggerDelay: 0.08,
};
```

**When to Extract to Constants:**
- Reused multiple times in the same file
- Represents a semantic concept (e.g., `MAX_SLIDES_PER_PRESENTATION`)

## 2. Centralized Definitions

Define standard values **in one place** and refer to them everywhere.

### Locations for Definitions

*   **Types & Interfaces:** Place in **`src/types/`**
    *   Usage: Component props, state shapes, IndexedDB schemas
*   **Constants:** Place in **`src/constants/`**
    *   Usage: Timings, localStorage keys, display settings

### Defining Constants

Prefer TypeScript `const` objects with `as const` to create immutable, type-safe groupings.

```typescript
// src/constants/playerPhase.ts
export const PlayerPhase = {
  UPLOADING: 'uploading',
  KIOSK_ENTRY: 'kiosk_entry',
  PLAYING: 'playing',
  SETTINGS: 'settings',
} as const;

export type PlayerPhaseType = typeof PlayerPhase[keyof typeof PlayerPhase];
```

### Creating Derived Types from Constants

**Pattern:**
```typescript
// 1. Define constants with 'as const'
export const DiagnosticLevel = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

// 2. Derive the union type
export type DiagnosticLevelType = typeof DiagnosticLevel[keyof typeof DiagnosticLevel];
// Result: 'info' | 'warn' | 'error'
```

**Usage in Type Definitions:**
```typescript
// ✅ GOOD: Use derived type instead of manual union
interface DiagnosticEntry {
  level: DiagnosticLevelType;  // Auto-syncs with constants
}
```

## 3. Type Safety & Imports

*   **No Inline Imports**: Do NOT use inline `import()` statements within type definitions.
*   **No `any`**: Avoid `any` unless absolutely necessary. Use `unknown` or specific types.
*   **Strict Null Checks**: Handle `null` and `undefined` explicitly.

**Bad Practice:**
```typescript
// ❌ BAD: Inline import
playerRoleDetails?: Record<string, import('./types/player').PlayerDetails>;
```

**Good Practice:**
```typescript
// ✅ GOOD: Standard top-level import
import { PlayerDetails } from './types/player';

playerRoleDetails?: Record<string, PlayerDetails>;
```

## 3a. Typing IndexedDB Data

**Principle:** IndexedDB data is untyped by default. Always apply explicit types.

**Bad Practice:**
```typescript
// ❌ BAD: Untyped IndexedDB data
const presentation = await db.presentations.get(id);
console.log(presentation.name);  // No type checking - field might not exist!
```

**Good Practice:**
```typescript
// ✅ GOOD: Type IndexedDB data explicitly
import { Presentation } from './types/presentation';

const presentation = await db.presentations.get(id) as Presentation | undefined;
if (!presentation) {
  throw new Error(`Presentation ${id} not found`);
}
console.log(presentation.name);  // Type-checked
```

## 4. Default Constants for Complex Types

**Principle:** For types with many fields (especially interfaces with 5+ properties), always provide a `DEFAULT_<TYPENAME>` constant.

**Pattern:**
```typescript
// Define the interface
export interface PlaybackState {
  isActive: boolean;
  currentSlideIndex: number;
  slideInterval: number;
  fullscreen: boolean;
  startTime: number | null;
}

// Provide a default constant
export const DEFAULT_PLAYBACK_STATE: PlaybackState = {
  isActive: false,
  currentSlideIndex: 0,
  slideInterval: 5000,
  fullscreen: false,
  startTime: null,
};

// Usage: Easy initialization
const newState = {
  ...DEFAULT_PLAYBACK_STATE,
  isActive: true,
  startTime: Date.now(),
};
```

**Rules:**
- Name the constant `DEFAULT_<TYPENAME>`
- Initialize all fields to sensible defaults
- Place the constant immediately after the type definition

## 5. Control Flow: Switch vs If/Else

**Principle:** Prefer `switch` statements over complex `if/else` chains, especially for mode/type branching.

**Why this matters:**
- **Exhaustiveness:** Use `default` case to catch unexpected values
- **Maintainability:** Easier to audit for missing logic
- **Clarity:** Clearly signals branching based on a single variable

**Bad Practice:**
```typescript
if (phase === PlayerPhase.UPLOADING) {
  // logic
} else if (phase === PlayerPhase.PLAYING) {
  // logic
}
// ❌ If a new phase is added, this code silently fails
```

**Good Practice:**
```typescript
switch (phase) {
  case PlayerPhase.UPLOADING:
    // logic
    break;
  case PlayerPhase.PLAYING:
    // logic
    break;
  default:
    // ✅ Always handle the default case
    console.error(`Unhandled phase: ${phase}`);
}
```

## 6. Null/Undefined Checks: Using `const` to Satisfy Linters

**Principle:** When a linter warns that a variable might be `null` or `undefined` even after a guard clause, extract it to a `const` to reset the type narrowing context.

**Bad Practice:**
```typescript
// ❌ BAD: Non-null assertions hide potential bugs
if (!currentState) return undefined;

const newState = cloneGameState(currentState!); // ❌ Using ! assertion
```

**Good Practice:**
```typescript
// ✅ GOOD: Extract to const, THEN check for null
const validState = currentState;

if (!validState) {
  return undefined;
}

// TypeScript knows validState is not null
const newState = cloneGameState(validState); // ✅ No ! assertion needed
```

## 7. Type Narrowing with Guards and Derived Variables

**Principle:** When a variable can have multiple types (union types), use type guards to check the actual type, then create a new variable with that specific type.

**Pattern:**
```typescript
// 1. Type guard function
export function isPresentationLoaded(data: unknown): data is Presentation {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'slides' in data
  );
}

// 2. Usage
if (!presentationData || !isPresentationLoaded(presentationData)) {
  return null;
}

// 3. Create derived variable with known type
const presentation = presentationData as Presentation;
const slideCount = presentation.slides.length; // Type-safe access
```

## 8. React Hooks: Wrapper Component Pattern

**Principle:** React Hooks must be called in the exact same order on every render. Use the **wrapper component pattern** when validation is needed before hooks.

**Bad Practice:**
```typescript
// ❌ BAD: Early return BEFORE useMemo
export function Player() {
  const { presentation } = usePresentation();

  if (!presentation) {
    return null;  // Early return violates Rules of Hooks
  }

  const slides = useMemo(() => {
    // Hook called conditionally - fails lint
    return presentation.slides;
  }, [presentation]);
}
```

**Good Practice:**
```typescript
// ✅ GOOD: Wrapper validates, inner component uses hooks

interface PlayerInternProps {
  presentation: Presentation;  // Not nullable
}

function PlayerIntern({ presentation }: PlayerInternProps) {
  // ✅ All hooks called unconditionally
  const slides = useMemo(() => presentation.slides, [presentation]);
  return <div>...</div>;
}

export function Player() {
  const { presentation } = usePresentation();

  if (!presentation) {
    return null;
  }

  return <PlayerIntern presentation={presentation} />;
}
```

**Key Rules:**
1. Export only the wrapper
2. Pass ALL necessary hook values
3. Define props interface with strong types
4. Keep wrapper minimal - only validation
5. Put all hooks in inner component

## 9. Naming Conventions

*   **Types/Interfaces:** `PascalCase` (e.g., `PlaybackState`, `DiagnosticEntry`)
*   **Components:** `PascalCase` (e.g., `Player`, `Uploader`)
*   **Variables/Functions:** `camelCase` (e.g., `calculateSlideIndex`, `isValid`)
*   **Constants:** `UPPER_CASE` (e.g., `MAX_SLIDES`, `DEFAULT_INTERVAL_MS`)

## 10. Error Handling: Catch Clause Type Restrictions

**Principle:** TypeScript catch clause variables can only be typed as `any` or `unknown`.

```typescript
// ❌ BAD: TypeScript doesn't allow specific types
} catch (err: Error) {
  // TS Error: Catch clause variable must be 'any' or 'unknown'
}

// ✅ GOOD: Use `unknown` and narrow
} catch (err: unknown) {
  const errorMsg = err instanceof Error ? err.message : 'Unknown error';
  logger.error('Operation failed', errorMsg);
}
```

## 11. Input Validation for File Uploads

**Principle:** Validate uploaded PPTX files for size, type, and structure before storing.

```typescript
// ✅ GOOD: Validate before IndexedDB write
export async function validateAndStorePresentation(
  file: File,
  db: Dexie
): Promise<Presentation> {
  // 1. Check file type
  if (!file.name.endsWith('.pptx')) {
    throw new Error('Only .pptx files are supported');
  }

  // 2. Check file size (e.g., 50MB limit)
  const MAX_SIZE_BYTES = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('File size exceeds 50MB limit');
  }

  // 3. Parse and validate structure
  const arrayBuffer = await file.arrayBuffer();
  const slides = await parsePptxSlides(arrayBuffer);

  if (!slides || slides.length === 0) {
    throw new Error('Presentation contains no slides');
  }

  // 4. Store with metadata
  const presentation: Presentation = {
    id: crypto.randomUUID(),
    name: file.name,
    slides,
    uploadedAt: Date.now(),
    fileSize: file.size,
  };

  await db.presentations.add(presentation);
  return presentation;
}
```

## 12. PWA-Specific Patterns

### Service Worker Updates

```typescript
// ✅ GOOD: Handle SW updates gracefully
useEffect(() => {
  const handleSWUpdate = () => {
    if (confirm('New version available. Reload now?')) {
      window.location.reload();
    }
  };

  document.addEventListener('sw-update', handleSWUpdate);
  return () => document.removeEventListener('sw-update', handleSWUpdate);
}, []);
```

### Wake Lock API

```typescript
// ✅ GOOD: Re-acquire wake lock on visibility change
useEffect(() => {
  let wakeLock: WakeLockSentinel | null = null;

  const requestWakeLock = async () => {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) {
      console.warn('Wake lock not supported', err);
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      requestWakeLock();  // Re-acquire when returning to tab
    }
  };

  requestWakeLock();
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    wakeLock?.release();
  };
}, []);
```

### Fullscreen API

```typescript
// ✅ GOOD: Handle fullscreen user gesture requirement
const enterFullscreen = async () => {
  try {
    await document.documentElement.requestFullscreen();
  } catch (err) {
    console.warn('Fullscreen failed', err);
    // Fallback: show message that fullscreen requires user gesture
  }
};
```

## 13. IndexedDB Patterns

### Dexie Schema Definition

```typescript
// ✅ GOOD: Define schema with types
import Dexie, { Table } from 'dexie';

export interface Presentation {
  id: string;
  name: string;
  slides: Slide[];
  uploadedAt: number;
  fileSize: number;
}

export interface AppSettings {
  id: 'settings';  // Singletons use fixed ID
  slideInterval: number;
  enableFullscreen: boolean;
  enableWakeLock: boolean;
}

export class AppDatabase extends Dexie {
  presentations!: Table<Presentation>;
  settings!: Table<AppSettings>;

  constructor() {
    super('LooPPTDB');
    this.version(1).stores({
      presentations: 'id, name, uploadedAt',
      settings: 'id',
    });
  }
}

export const db = new AppDatabase();
```

### Singleton Settings Pattern

```typescript
// ✅ GOOD: Use singleton for app-wide settings
export async function getSettings(): Promise<AppSettings> {
  let settings = await db.settings.get('settings');
  if (!settings) {
    settings = {
      id: 'settings',
      slideInterval: DEFAULT_INTERVAL_MS,
      enableFullscreen: false,
      enableWakeLock: true,
    };
    await db.settings.add(settings);
  }
  return settings;
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<void> {
  await db.settings.update('settings', updates);
}
```

## 14. Testing Guidelines

### Mocking External Dependencies

```typescript
// ✅ GOOD: Mock PPTX parser in tests
vi.mock('@kandiforge/pptx-renderer', () => ({
  parsePptx: vi.fn().mockResolvedValue([
    { id: '1', content: 'Slide 1' },
    { id: '2', content: 'Slide 2' },
  ]),
}));
```

### Testing IndexedDB Operations

```typescript
// ✅ GOOD: Use in-memory Dexie for tests
import { dexieLiveQuery } from 'dexie-live-query';
import { db } from './db';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(async () => {
  await db.close();
});
```

## 15. Performance Patterns

### Memoizing Expensive Computations

```typescript
// ✅ GOOD: Memoize slide rendering
const renderedSlides = useMemo(() => {
  return slides.map((slide, index) => ({
    ...slide,
    index,
    isActive: index === currentSlideIndex,
  }));
}, [slides, currentSlideIndex]);
```

### Debouncing IndexedDB Writes

```typescript
// ✅ GOOD: Debounce settings persistence
const debouncedSaveSettings = useMemo(
  () => debounce(async (settings: AppSettings) => {
    await db.settings.put(settings);
  }, 500),
  []
);
```

---

**Source:** Adapted from [hornswoggle4 TypeScript Guidelines](/Volumes/Projects/dev/hornswoggle4/docs/guidelines-typescript.md)

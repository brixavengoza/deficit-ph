---
name: naming-conventions
description: Use when naming React Native files, screens, components, hooks, state slices, API modules, or TypeScript types. Standardizes naming for mobile projects using React Native, Expo, and TypeScript.
---

# Naming Conventions (React Native)

Use consistent naming so screens, components, hooks, and services are predictable.

## Instructions

### Screen Files and Screen Components

Use PascalCase for screen files and exported screen component names.

```text
src/screens/
  HomeScreen.tsx
  LoginScreen.tsx
  PropertyDetailScreen.tsx
```

```tsx
export function PropertyDetailScreen() {
  return <View />;
}
```

### Component Files and Components

Use PascalCase for component files and exported component names.

```text
src/components/
  PriceCard.tsx
  ScoreBadge.tsx
  FormField.tsx
```

### Hook Files and Hook Functions

- File name: kebab-case prefixed with `use-`
- Export name: camelCase prefixed with `use`

```text
src/hooks/
  use-auth-session.ts
  use-get-properties.ts
  use-network-status.ts
```

```ts
export function useAuthSession() {}
export function useGetProperties() {}
```

### Utility and Service Modules

Use kebab-case for files and camelCase for function names.

```text
src/services/
  auth-service.ts
  properties-api.ts
src/utils/
  currency-format.ts
```

```ts
export async function fetchProperties() {}
export function formatCurrency() {}
```

### Variables and Functions

Use camelCase.

```ts
const selectedPropertyId = 'abc123';
function calculateOccupancyRate() {}
```

### Types and Interfaces

Use PascalCase.

```ts
interface PropertyCardProps {}
type ApiError = { message: string; code?: string };
```

### Constants

Use SCREAMING_SNAKE_CASE for module-level constants.

```ts
const DEFAULT_PAGE_SIZE = 20;
const MAX_RETRY_COUNT = 3;
```

### Query Keys

Use kebab-case string segments.

```ts
['properties']
['property-detail', propertyId]
['user-profile', userId]
```

### Store Naming (Zustand/Redux)

- Store file: `use-<domain>-store.ts` (kebab-case)
- Hook export: `use<Domain>Store`

```text
src/stores/
  use-auth-store.ts
  use-booking-store.ts
```

```ts
export const useAuthStore = create<AuthStoreState>(() => ({ ... }));
```

### Asset Naming

Use lowercase kebab-case for static assets.

```text
assets/icons/location-pin.png
assets/images/empty-state-illustration.png
```

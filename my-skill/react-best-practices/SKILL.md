---
name: react-best-practices
description: Use when building or refactoring React Native screens and components. Covers separation of concerns, state co-location, screen composition, FlatList performance, memoization, navigation-safe patterns, strict typing, and maintainable mobile UI structure.
---

# React Native Best Practices

Build small, focused components. Keep business logic outside JSX. Keep state as close as possible to where it is used.

## Instructions

### Split by Responsibility

Use three layers for non-trivial features:

1. Logic layer: custom hooks, calculations, derived state
2. Container/screen: compose hooks and pass data down
3. View components: render-only UI with minimal logic

Example structure:

```text
src/
  features/
    area-check/
      hooks/
        use-area-check.ts
        use-revenue-score.ts
      constants.ts
      types.ts
      screens/
        AreaCheckScreen.tsx
      components/
        DemandStep.tsx
        RevenueStep.tsx
        ResultsStep.tsx
```

### Prefer Screen Maps Over Large Conditional Chains

```tsx
type Step = 'entry' | 'demand' | 'revenue' | 'results';

const STEP_COMPONENTS: Record<Step, React.ComponentType> = {
  entry: EntryStep,
  demand: DemandStep,
  revenue: RevenueStep,
  results: ResultsStep,
};

export function AreaCheckScreen() {
  const step = useAreaCheckStore((s) => s.step);
  const StepComponent = STEP_COMPONENTS[step];
  return <StepComponent />;
}
```

### Keep State Local, Share Only What Is Truly Shared

Rule:

- Screen-local UI state: `useState` in that screen/component
- Shared cross-screen state: small global store (`zustand`) or server cache (`@tanstack/react-query`)

Do not hoist local state to parent screens unless multiple children must coordinate on it.

### Use FlatList Correctly for Performance

- Always provide stable `keyExtractor`
- Use `renderItem` with memoized row components for large lists
- Use `getItemLayout` when row height is fixed
- Avoid inline anonymous callbacks in very hot list paths

```tsx
const Row = React.memo(({ item }: { item: Item }) => {
  return <Text>{item.title}</Text>;
});

export function ItemList({ items }: { items: Item[] }) {
  const renderItem = useCallback(({ item }: { item: Item }) => <Row item={item} />, []);

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.content}
    />
  );
}
```

### Extract Expensive Logic Into Hooks

Keep calculations and transformations in hooks so screens stay readable and testable.

```ts
export function useRevenueScore(nightlyRate: number, occupancyRate: number) {
  return useMemo(() => {
    const monthlyRevenue = nightlyRate * 30.44 * (occupancyRate / 100);
    const score = monthlyRevenue >= 3000 ? 5 : monthlyRevenue >= 2200 ? 4 : 3;
    return { monthlyRevenue, score };
  }, [nightlyRate, occupancyRate]);
}
```

### Keep Static Data Out of Render Bodies

Move constant arrays/maps to module scope or `constants.ts`.

```ts
export const CHECKLIST_ITEMS = [
  'University nearby',
  'Hospital nearby',
  'Good transport links',
] as const;
```

### Navigation-Safe Patterns

- Keep route params minimal and serializable
- Pass IDs, not heavy objects
- Re-fetch details in destination screen when needed
- Keep navigation calls in handlers (`onPress`) not deep utility modules

### Strict Typing Only

Never use `any`. Type props, hook return values, API responses, and navigation params.

```ts
type RootStackParamList = {
  Home: undefined;
  PropertyDetail: { propertyId: string };
};
```

### Styling Consistency

- Use a single styling approach per codebase (`StyleSheet`, `NativeWind`, etc.)
- Keep design tokens centralized (spacing, radius, colors, typography)
- Do not hardcode random values repeatedly across files

### Component Checklist Before Commit

- [ ] Component or screen has one clear responsibility
- [ ] Business logic is in hooks/helpers, not mixed into UI rendering
- [ ] Shared state is minimal and justified
- [ ] FlatList usage is performance-safe (stable keys and memoization)
- [ ] Static constants are outside component bodies
- [ ] Route params are typed and serializable
- [ ] No `any` in touched files

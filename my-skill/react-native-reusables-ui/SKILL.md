---
name: react-native-reusables-ui
description: Use when building or refactoring React Native UI in this codebase. Enforces react-native-reusables component usage and utility-class styling via Uniwind, including Button variants, Text variants, Icon usage, and composition patterns. Trigger when a task involves screen UI, component styling, buttons, typography, or replacing raw React Native styled components.
---

# React Native Reusables UI

Use the local react-native-reusables layer from `components/ui/*` as the default UI system. Prefer Tailwind/Uniwind `className` utilities as the default styling approach. Use traditional `StyleSheet` or inline style objects only when utility classes cannot express the requirement (for example: complex SVG geometry, platform-specific dynamic calculations, or unsupported style props).

## Core Rules

- Prefer `Button`, `Text`, and `Icon` from `components/ui/*` over raw `Pressable`, `Text`, and icon usage.
- Prefer `className` utility styling (Uniwind) over `StyleSheet` and inline style objects for visual styling.
- Prefer standard Tailwind scale classes over arbitrary values. Example: use `-top-18` instead of `top-[-72px]` when equivalent scale values exist.
- Use raw `View` for layout wrappers only.
- Keep design tokens and colors from theme classes (`bg-primary`, `text-foreground`, `bg-secondary`, etc.).
- When creating reusable UI, extend existing `cva` variants instead of creating one-off component styles.
- Use `StyleSheet` only when necessary for unsupported utility cases.

## Tailwind Class Standard

- Use preset spacing/size tokens first (`p-4`, `mt-6`, `-left-14`, `w-12`, etc.).
- Use arbitrary values (`[...px]`, `[...%]`) only when no Tailwind preset matches the requirement.
- When replacing arbitrary values, prefer the equivalent scale class:
  - `top-[-72px]` -> `-top-18`
  - `left-[-56px]` -> `-left-14`

## Component Imports

```tsx
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
```

## Button Standards

Use `Button` variants and sizes already defined in `components/ui/button.tsx`.

### Variants

- `default`: treat as primary CTA
- `secondary`: secondary CTA
- `outline`: neutral bordered action
- `ghost`: low-emphasis action
- `destructive`: destructive action
- `link`: text-only action

If a request asks for "primary", map it to `variant="default"`.

### Sizes

- `default`
- `sm`
- `lg`
- `icon`

### Examples

```tsx
<Button variant="default">
  <Text>Get Started</Text>
</Button>

<Button variant="secondary">
  <Text>Maybe Later</Text>
</Button>

<Button variant="outline" size="sm">
  <Text>View Details</Text>
</Button>

<Button variant="destructive">
  <Text>Delete Account</Text>
</Button>
```

## Text Standards

Use the local `Text` component and semantic variants from `components/ui/text.tsx`.

Available variants include:

- `h1`, `h2`, `h3`, `h4`
- `lead`, `large`, `small`, `muted`
- `default`, `p`, `blockquote`, `code`

Example:

```tsx
<Text variant="h1">Welcome to DeficitPH</Text>
<Text variant="muted">Track calories and stay consistent.</Text>
```

## Icon Standards

Use `Icon` wrapper with Lucide icons; do not style raw icons ad hoc.

```tsx
import { ArrowRightIcon } from 'lucide-react-native';

<Icon as={ArrowRightIcon} className="size-4 text-white" />
```

## Composition Pattern

Use reusables for visible controls and text, with `View` containers for layout.

```tsx
<View className="gap-4 px-6">
  <Text variant="h2">Run toward your goals</Text>

  <Button variant="default" size="lg" className="rounded-full">
    <Text>Get Started</Text>
    <Icon as={ArrowRightIcon} className="size-4 text-white" />
  </Button>

  <Button variant="ghost">
    <Text>I already have an account</Text>
  </Button>
</View>
```

## Anti-Patterns

- Do not create new custom button primitives with raw `Pressable` for standard actions.
- Do not hardcode color hex values in components when theme utility classes exist.
- Do not default to `StyleSheet` for routine screen styling.
- Do not default to arbitrary Tailwind values when scale classes exist.
- Do not mix many inline style objects for basic UI styling.
- Do not bypass `Text` component for standard typography.

## Implementation Checklist

- [ ] Uses `Button`, `Text`, and `Icon` from `components/ui/*` when applicable
- [ ] Maps CTA priority to existing `Button` variants (`default` for primary)
- [ ] Uses `className` utilities as the primary styling approach
- [ ] Uses `StyleSheet`/inline styles only for necessary exceptions
- [ ] Uses Tailwind scale classes first; arbitrary values only when needed
- [ ] Keeps layout wrappers simple and readable
- [ ] Avoids creating duplicate primitives already provided by reusables

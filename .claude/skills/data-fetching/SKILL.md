---
name: data-fetching
description: Use when implementing React Native data fetching, caching, and mutations. Covers TanStack Query patterns, API client separation, offline-aware behavior, query keys, retries, and cache invalidation for mobile apps.
---

# Data Fetching (React Native)

Use `@tanstack/react-query` for remote data and caching. Do not fetch directly inside screen render logic.

## Instructions

### File Organization

```text
src/
  hooks/
    use-get-properties.ts
    use-update-profile.ts
  services/
    api-client.ts
    properties-api.ts
```

Keep network calls in `services/*`. Keep React Query wiring in hooks.

### Query Hook Pattern

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchProperties } from '@/services/properties-api';

export function useGetProperties(cityId: string) {
  return useQuery({
    queryKey: ['properties', cityId],
    queryFn: () => fetchProperties(cityId),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
```

### Mutation Hook Pattern

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProfile } from '@/services/profile-api';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', vars.userId] });
    },
  });
}
```

### Service Function Rules

- Keep service functions pure and framework-agnostic
- Throw typed errors on non-OK response
- Return normalized response data

```ts
export async function fetchProperties(cityId: string): Promise<Property[]> {
  const res = await fetch(`${API_URL}/cities/${cityId}/properties`);
  if (!res.ok) throw new Error('Failed to fetch properties');

  const json: { data: Property[] } = await res.json();
  return json.data ?? [];
}
```

### Query Key Conventions

- Use array keys
- Use kebab-case segments
- Include resource scope parameters in key

```ts
['properties']
['properties', cityId]
['property-detail', propertyId]
['bookings', userId]
```

### Mobile-Specific Guidance

- Set `refetchOnReconnect: true` for critical user data
- Prefer conservative retries on mobile networks (`retry: 1` or `2`)
- Persist query cache if app requires offline resume
- Use pull-to-refresh to call `refetch()` explicitly

### Screen Usage

```tsx
export function PropertiesScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useGetProperties('manila');

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <FlatList
      data={data ?? []}
      onRefresh={refetch}
      refreshing={isRefetching}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PropertyCard item={item} />}
    />
  );
}
```

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const queryKeys = {
  foods: ['foods'] as const,
  commonFoods: ['foods', 'common'] as const,
  foodSearch: (query: string) => ['foods', 'search', query] as const,
  foodLogs: ['food-logs'] as const,
  homeDashboard: (dayCount: number) => ['home-dashboard', dayCount] as const,
  progress: ['progress'] as const,
};

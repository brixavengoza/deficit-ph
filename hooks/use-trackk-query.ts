import {
  addHydrationLog,
  addWeightLog,
  fetchCommonSeedFoods,
  fetchFoodLogs,
  fetchFoodsForSearch,
  fetchHomeDashboardSnapshot,
  fetchProgressSnapshot,
  insertFoodLog,
  searchFoodsByName,
  softDeleteFoodLog,
  updateFoodLog,
  upsertUserFoodByName,
} from '@/lib/supabase-data';
import { queryKeys } from '@/lib/query-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useFoodsQuery() {
  return useQuery({
    queryKey: queryKeys.foods,
    queryFn: fetchFoodsForSearch,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCommonFoodsQuery() {
  return useQuery({
    queryKey: queryKeys.commonFoods,
    queryFn: fetchCommonSeedFoods,
    staleTime: 1000 * 60 * 60,
  });
}

export function useFoodSearchQuery(query: string) {
  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, ' ');
  return useQuery({
    queryKey: queryKeys.foodSearch(normalizedQuery),
    queryFn: () => searchFoodsByName(normalizedQuery),
    enabled: normalizedQuery.length >= 2,
    staleTime: 1000 * 60 * 10,
  });
}

export function useFoodLogsQuery() {
  return useQuery({
    queryKey: queryKeys.foodLogs,
    queryFn: fetchFoodLogs,
  });
}

export function useHomeDashboardQuery(dayCount: number) {
  return useQuery({
    queryKey: queryKeys.homeDashboard(dayCount),
    queryFn: () => fetchHomeDashboardSnapshot(dayCount),
  });
}

export function useProgressQuery() {
  return useQuery({
    queryKey: queryKeys.progress,
    queryFn: fetchProgressSnapshot,
  });
}

function invalidateAllAnalytics(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: queryKeys.foodLogs });
  void client.invalidateQueries({ queryKey: queryKeys.foods });
  void client.invalidateQueries({ queryKey: queryKeys.progress });
  void client.invalidateQueries({ queryKey: ['home-dashboard'] });
}

export function useAddHydrationMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (volumeMl: number) => addHydrationLog(volumeMl),
    onSuccess: () => invalidateAllAnalytics(client),
  });
}

export function useAddWeightMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (weightKg: number) => addWeightLog(weightKg),
    onSuccess: () => invalidateAllAnalytics(client),
  });
}

export function useUpsertUserFoodMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: upsertUserFoodByName,
    onSuccess: () => invalidateAllAnalytics(client),
  });
}

export function useInsertFoodLogMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: insertFoodLog,
    onSuccess: () => invalidateAllAnalytics(client),
  });
}

export function useUpdateFoodLogMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateFoodLog>[1] }) =>
      updateFoodLog(id, payload),
    onSuccess: () => invalidateAllAnalytics(client),
  });
}

export function useDeleteFoodLogMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: softDeleteFoodLog,
    onSuccess: () => invalidateAllAnalytics(client),
  });
}

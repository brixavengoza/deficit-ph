import {
  addHydrationLog,
  addWeightLog,
  fetchCommonSeedFoods,
  fetchFoodLogsForDay,
  fetchFoodLogs,
  fetchFoodsForSearch,
  fetchHomeDashboardSnapshot,
  fetchMacroTargets,
  fetchProgressSnapshot,
  insertFoodLog,
  revertCalorieGoalToAuto,
  revertMacroTargetsToAuto,
  saveUserFoodIfMissing,
  searchFoodsByName,
  setCustomMacroTargets,
  setManualCalorieGoal,
  softDeleteFoodLog,
  updateFoodLog,
  upsertUserFoodByName,
} from '@/lib/local-data';
import { queryKeys } from '@/lib/query-client';
import { useProfileBundleStore } from '@/stores/use-profile-bundle-store';
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

export function useFoodLogsForDayQuery(localDay: string) {
  return useQuery({
    queryKey: queryKeys.foodLogsForDay(localDay),
    queryFn: () => fetchFoodLogsForDay(localDay),
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

export function useMacroTargetsQuery() {
  return useQuery({
    queryKey: queryKeys.macroTargets,
    queryFn: fetchMacroTargets,
  });
}

function invalidateAllAnalytics(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: queryKeys.foodLogs });
  void client.invalidateQueries({ queryKey: ['food-logs'] });
  void client.invalidateQueries({ queryKey: queryKeys.foods });
  void client.invalidateQueries({ queryKey: queryKeys.progress });
  void client.invalidateQueries({ queryKey: ['home-dashboard'] });
  // A weigh-in recomputes the derived calorie/macro targets — keep the settings row fresh.
  void client.invalidateQueries({ queryKey: queryKeys.macroTargets });
}

function invalidateMacroTargets(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: queryKeys.macroTargets });
  // Dashboard tiles read the targets via the home-dashboard snapshot — refresh them too.
  void client.invalidateQueries({ queryKey: ['home-dashboard'] });
}

export function useSetCustomMacroTargetsMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: setCustomMacroTargets,
    onSuccess: () => invalidateMacroTargets(client),
  });
}

export function useRevertMacroTargetsMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: revertMacroTargetsToAuto,
    onSuccess: () => invalidateMacroTargets(client),
  });
}

export function useSetManualCalorieGoalMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: setManualCalorieGoal,
    onSuccess: () => invalidateMacroTargets(client),
  });
}

export function useRevertCalorieGoalMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: revertCalorieGoalToAuto,
    onSuccess: () => invalidateMacroTargets(client),
  });
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
    onSuccess: () => {
      invalidateAllAnalytics(client);
      // Weight + derived calorie goal also live in the zustand profile bundle, which has
      // no query-cache invalidation path — refresh it or Profile shows stale numbers.
      void useProfileBundleStore.getState().refresh();
    },
  });
}

export function useUpsertUserFoodMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: upsertUserFoodByName,
    onSuccess: () => invalidateAllAnalytics(client),
  });
}

export function useSaveUserFoodIfMissingMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: saveUserFoodIfMissing,
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

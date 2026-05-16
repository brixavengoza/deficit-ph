import { AdherenceOverviewCard } from '@/components/progress/adherence-overview-card';
import { StreakCard } from '@/components/progress/streak-card';
import { WeeklyIntakeCard } from '@/components/progress/weekly-intake-card';
import { WeeklySummaryCard } from '@/components/progress/weekly-summary-card';
import { WeightJourneyCard } from '@/components/progress/weight-journey-card';
import { WeightLogModal } from '@/components/progress/weight-log-modal';
import { useAddWeightMutation, useProgressQuery } from '@/hooks/use-trackk-query';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DashboardProgressScreen() {
  const insets = useSafeAreaInsets();
  const progressQuery = useProgressQuery();
  const addWeightMutation = useAddWeightMutation();
  const [weightModalOpen, setWeightModalOpen] = React.useState(false);
  const [weightInput, setWeightInput] = React.useState(
    String(progressQuery.data?.weight.currentKg ?? '85.0')
  );
  const [chartDragging, setChartDragging] = React.useState(false);

  React.useEffect(() => {
    if (progressQuery.data?.weight.currentKg == null) return;
    setWeightInput(String(progressQuery.data.weight.currentKg));
  }, [progressQuery.data?.weight.currentKg]);

  const onSaveWeight = async (weightKg: number) => {
    try {
      await addWeightMutation.mutateAsync(weightKg);
      setWeightModalOpen(false);
    } catch (error) {
      console.error('[DashboardProgressScreen.onSaveWeight]', error);
    }
  };

  if (!progressQuery.data) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Text className="text-muted-foreground text-sm">
          {progressQuery.isLoading ? 'Loading progress...' : 'No progress data yet.'}
        </Text>
      </View>
    );
  }

  const progress = progressQuery.data;

  return (
    <View className="bg-background flex-1">
      <ScrollView
        scrollEnabled={!chartDragging}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 128 }}
        contentContainerClassName="px-4">
        <StreakCard currentStreak={progress.currentStreak} days={progress.streakDays} />
        <WeeklyIntakeCard
          days={progress.weeklyIntake.days.map((day) => ({ label: day.label, kcal: day.kcal }))}
          goalKcal={progress.weeklyIntake.goalKcal}
          avgKcal={progress.weeklyIntake.avgKcal}
        />
        <WeightJourneyCard
          series={progress.weight.series}
          startKg={progress.weight.startKg}
          currentKg={progress.weight.currentKg}
          lostKg={progress.weight.lostKg}
          onOpenLogWeight={() => setWeightModalOpen(true)}
          onChartDragStateChange={setChartDragging}
        />
        <AdherenceOverviewCard
          calorieHitRate={progress.adherence.calorieHitRate}
          hydrationHitRate={progress.adherence.hydrationHitRate}
          weighInConsistency={progress.adherence.weighInConsistency}
        />
        <WeeklySummaryCard
          averageDeficitKcal={progress.weeklySummary.averageDeficitKcal}
          avgWaterLiters={progress.weeklySummary.avgWaterLiters}
          trackedMeals={progress.weeklySummary.trackedMeals}
          lowestWeightKg={progress.weeklySummary.lowestWeightKg}
        />
      </ScrollView>

      <WeightLogModal
        open={weightModalOpen}
        value={weightInput}
        isSaving={addWeightMutation.isPending}
        onChangeValue={setWeightInput}
        onClose={() => setWeightModalOpen(false)}
        onSave={(weightKg) => {
          void onSaveWeight(weightKg);
        }}
      />
    </View>
  );
}

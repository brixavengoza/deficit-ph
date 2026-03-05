import { AdherenceOverviewCard } from '@/components/progress/adherence-overview-card';
import { StreakCard } from '@/components/progress/streak-card';
import { WeeklyIntakeCard } from '@/components/progress/weekly-intake-card';
import { WeeklySummaryCard } from '@/components/progress/weekly-summary-card';
import { WeightJourneyCard } from '@/components/progress/weight-journey-card';
import { WeightLogModal } from '@/components/progress/weight-log-modal';
import React from 'react';
import { ScrollView, View } from 'react-native';

export default function DashboardProgressScreen() {
  const [weightModalOpen, setWeightModalOpen] = React.useState(false);
  const [weightInput, setWeightInput] = React.useState('85.0');
  const [chartDragging, setChartDragging] = React.useState(false);

  const onSaveWeight = () => {
    console.log('[log weight]', { weightKg: weightInput });
    setWeightModalOpen(false);
  };

  return (
    <View className="bg-background flex-1">
      <ScrollView
        scrollEnabled={!chartDragging}
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pt-4 pb-32">
        <StreakCard />
        <WeeklyIntakeCard />
        <WeightJourneyCard
          onOpenLogWeight={() => setWeightModalOpen(true)}
          onChartDragStateChange={setChartDragging}
        />
        <AdherenceOverviewCard />
        <WeeklySummaryCard />
      </ScrollView>

      <WeightLogModal
        open={weightModalOpen}
        value={weightInput}
        onChangeValue={setWeightInput}
        onClose={() => setWeightModalOpen(false)}
        onSave={onSaveWeight}
      />
    </View>
  );
}

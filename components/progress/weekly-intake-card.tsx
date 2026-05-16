import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Target, TrendingDown, TrendingUp } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';

type IntakeDay = { label: string; kcal: number };

type WeeklyIntakeCardProps = {
  days: IntakeDay[];
  goalKcal: number;
  avgKcal: number;
};

type IntakeStatus = 'low' | 'normal' | 'high' | 'veryHigh';

function getIntakeStatus(kcal: number, goal: number): IntakeStatus {
  const ratio = goal > 0 ? kcal / goal : 0;
  if (ratio < 0.85) return 'low';
  if (ratio <= 1.05) return 'normal';
  if (ratio <= 1.2) return 'high';
  return 'veryHigh';
}

function getStatusStyles(status: IntakeStatus) {
  switch (status) {
    case 'low':
      return {
        bar: '#60a5fa',
        barMuted: 'rgba(96,165,250,0.3)',
        textClass: 'text-info',
        badgeClass: 'bg-info/10',
        label: 'Low',
      };
    case 'normal':
      return {
        bar: '#21c45d',
        barMuted: 'rgba(33,196,93,0.3)',
        textClass: 'text-primary',
        badgeClass: 'bg-primary/10',
        label: 'On Target',
      };
    case 'high':
      return {
        bar: '#f59e0b',
        barMuted: 'rgba(245,158,11,0.3)',
        textClass: 'text-warning',
        badgeClass: 'bg-warning/10',
        label: 'High',
      };
    case 'veryHigh':
      return {
        bar: '#ef4444',
        barMuted: 'rgba(239,68,68,0.3)',
        textClass: 'text-destructive',
        badgeClass: 'bg-destructive/10',
        label: 'Very High',
      };
  }
}

function WeeklyBars({
  days,
  goalKcal,
  selectedIndex,
  onSelect,
}: {
  days: IntakeDay[];
  goalKcal: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const max = Math.max(goalKcal * 1.2, ...days.map((d) => d.kcal), 1);
  const selected = days[selectedIndex] ?? days[0]!;
  const selectedStatus = getIntakeStatus(selected.kcal, goalKcal);
  const selectedStatusStyles = getStatusStyles(selectedStatus);

  return (
    <View className="relative h-46">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-foreground text-sm font-semibold">
          {selected.label} • {selected.kcal.toLocaleString()} kcal
        </Text>
        <Text className={`text-xs font-semibold ${selectedStatusStyles.textClass}`}>
          {selectedStatusStyles.label}
        </Text>
      </View>
      <View className="border-border absolute top-[35%] right-0 left-0 border-t border-dashed" />
      <View className="bg-card absolute top-[29%] right-0 pl-1">
        <Text className="text-[10px] font-bold text-slate-400">Goal: {goalKcal}</Text>
      </View>

      <View className="h-full flex-row items-end justify-between gap-2 px-1">
        {days.map((item, index) => {
          const h = Math.max(18, (item.kcal / max) * 150);
          const isSelected = index === selectedIndex;
          const status = getIntakeStatus(item.kcal, goalKcal);
          const statusStyles = getStatusStyles(status);
          const barColor = isSelected ? statusStyles.bar : statusStyles.barMuted;

          return (
            <Pressable
              key={`${item.label}-${item.kcal}-${index}`}
              className="flex-1 items-center gap-2"
              onPress={() => onSelect(index)}>
              <View
                className="w-full rounded-t-lg"
                style={{
                  height: h,
                  backgroundColor: barColor,
                  opacity: isSelected ? 1 : 0.95,
                  transform: [{ scaleY: isSelected ? 1.03 : 1 }],
                }}
              />
              <Text
                className={
                  isSelected
                    ? `${statusStyles.textClass} text-[11px] font-bold`
                    : 'text-muted-foreground text-[11px] font-medium'
                }>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function WeeklyIntakeCard({ days, goalKcal, avgKcal }: WeeklyIntakeCardProps) {
  const [selectedBarIndex, setSelectedBarIndex] = React.useState(() =>
    Math.max(days.length - 1, 0)
  );

  React.useEffect(() => {
    setSelectedBarIndex(Math.max(days.length - 1, 0));
  }, [days.length]);

  if (!days.length) {
    return (
      <View className="border-border bg-card mb-6 h-78 rounded-[22px] border p-5 shadow-sm">
        <Text className="text-foreground text-base font-bold">Weekly Intake</Text>
        <Text className="text-muted-foreground mt-2 text-sm">No intake data yet.</Text>
      </View>
    );
  }

  const avgDeltaPct = goalKcal > 0 ? ((avgKcal - goalKcal) / goalKcal) * 100 : 0;
  const avgStatus = getIntakeStatus(avgKcal, goalKcal);
  const avgStatusStyles = getStatusStyles(avgStatus);
  const TrendIcon = avgDeltaPct > 2 ? TrendingUp : avgDeltaPct < -2 ? TrendingDown : Target;
  const deltaText =
    avgDeltaPct > 2
      ? `+${avgDeltaPct.toFixed(1)}%`
      : avgDeltaPct < -2
        ? `${avgDeltaPct.toFixed(1)}%`
        : 'On target';

  return (
    <View className="border-border bg-card mb-6 h-78 rounded-[22px] border p-5 shadow-sm">
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="text-foreground text-base font-bold">Weekly Intake</Text>
          <Text className="text-muted-foreground text-xs">
            Average: {avgKcal.toLocaleString()} kcal
          </Text>
        </View>
        <View
          className={`${avgStatusStyles.badgeClass} flex-row items-center gap-1 rounded-full px-2 py-1`}>
          <Icon as={TrendIcon} className={`${avgStatusStyles.textClass} size-4`} />
          <Text className={`${avgStatusStyles.textClass} text-xs font-semibold`}>{deltaText}</Text>
        </View>
      </View>

      <WeeklyBars
        days={days}
        goalKcal={goalKcal}
        selectedIndex={selectedBarIndex}
        onSelect={setSelectedBarIndex}
      />
    </View>
  );
}

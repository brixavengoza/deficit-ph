import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Target, TrendingDown, TrendingUp } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';

const WEEKLY_INTAKE: Array<{ day: string; kcal: number; active: boolean; muted: boolean }> = [
  { day: 'Mon', kcal: 1800, active: false, muted: false },
  { day: 'Tue', kcal: 1450, active: false, muted: false },
  { day: 'Wed', kcal: 1650, active: true, muted: false },
  { day: 'Thur', kcal: 1900, active: true, muted: false },
  { day: 'Fri', kcal: 2200, active: false, muted: true },
  { day: 'Sat', kcal: 1750, active: false, muted: false },
  { day: 'Sun', kcal: 1500, active: false, muted: false },
];

const GOAL_KCAL = 2000;
const AVG_KCAL = 1850;

type IntakeStatus = 'low' | 'normal' | 'high' | 'veryHigh';

function getIntakeStatus(kcal: number, goal = GOAL_KCAL): IntakeStatus {
  const ratio = kcal / goal;
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
        barMuted: '#bfdbfe',
        textClass: 'text-blue-600',
        badgeClass: 'bg-blue-50',
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
        barMuted: '#fde68a',
        textClass: 'text-amber-600',
        badgeClass: 'bg-amber-50',
        label: 'High',
      };
    case 'veryHigh':
      return {
        bar: '#ef4444',
        barMuted: '#fecaca',
        textClass: 'text-red-600',
        badgeClass: 'bg-red-50',
        label: 'Very High',
      };
  }
}

function WeeklyBars({
  selectedIndex,
  onSelect,
}: {
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const max = 2400;
  const selected = WEEKLY_INTAKE[selectedIndex] ?? WEEKLY_INTAKE[0]!;
  const selectedStatus = getIntakeStatus(selected.kcal);
  const selectedStatusStyles = getStatusStyles(selectedStatus);

  return (
    <View className="relative h-46">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-slate-700">
          {selected.day} • {selected.kcal.toLocaleString()} kcal
        </Text>
        <Text className={`text-xs font-semibold ${selectedStatusStyles.textClass}`}>
          {selectedStatusStyles.label}
        </Text>
      </View>
      <View className="absolute top-[35%] right-0 left-0 border-t border-dashed border-slate-300" />
      <View className="absolute top-[29%] right-0 bg-white pl-1">
        <Text className="text-[10px] font-bold text-slate-400">Goal: {GOAL_KCAL}</Text>
      </View>

      <View className="h-full flex-row items-end justify-between gap-2 px-1">
        {WEEKLY_INTAKE.map((item, index) => {
          const h = Math.max(18, (item.kcal / max) * 150);
          const isSelected = index === selectedIndex;
          const status = getIntakeStatus(item.kcal);
          const statusStyles = getStatusStyles(status);
          const barColor = item.muted ? '#e2e8f0' : isSelected || item.active ? statusStyles.bar : statusStyles.barMuted;

          return (
            <Pressable
              key={`${item.day}-${item.kcal}`}
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
                  isSelected || item.active
                    ? `${statusStyles.textClass} text-[11px] font-bold`
                    : 'text-muted-foreground text-[11px] font-medium'
                }>
                {item.day}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function WeeklyIntakeCard() {
  const [selectedBarIndex, setSelectedBarIndex] = React.useState(3);
  const avgDeltaPct = ((AVG_KCAL - GOAL_KCAL) / GOAL_KCAL) * 100;
  const avgStatus = getIntakeStatus(AVG_KCAL);
  const avgStatusStyles = getStatusStyles(avgStatus);
  const TrendIcon = avgDeltaPct > 2 ? TrendingUp : avgDeltaPct < -2 ? TrendingDown : Target;
  const deltaText =
    avgDeltaPct > 2
      ? `+${avgDeltaPct.toFixed(1)}%`
      : avgDeltaPct < -2
        ? `${avgDeltaPct.toFixed(1)}%`
        : 'On target';

  return (
    <View className="mb-6 h-78 rounded-[22px] border border-slate-100 bg-white p-5 shadow-sm">
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="text-base font-bold text-slate-900">Weekly Intake</Text>
          <Text className="text-xs text-slate-500">Average: {AVG_KCAL.toLocaleString()} kcal</Text>
        </View>
        <View className={`${avgStatusStyles.badgeClass} flex-row items-center gap-1 rounded-full px-2 py-1`}>
          <Icon as={TrendIcon} className={`${avgStatusStyles.textClass} size-4`} />
          <Text className={`${avgStatusStyles.textClass} text-xs font-semibold`}>{deltaText}</Text>
        </View>
      </View>

      <WeeklyBars selectedIndex={selectedBarIndex} onSelect={setSelectedBarIndex} />
    </View>
  );
}

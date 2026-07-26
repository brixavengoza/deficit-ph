import { Text } from '@/components/ui/text';
import { formatNumberGrouped } from '@/lib/number-format';
import { targetProgressPct } from '@/utils/calorie-targets';
import React from 'react';
import { View } from 'react-native';

type WeeklyMacrosCardProps = {
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
  avgProteinG: number;
  avgCarbsG: number;
  avgFatG: number;
  loggedDayCount: number;
};

type MacroTone = 'protein' | 'carbs' | 'fat';

const TONE_BAR: Record<MacroTone, string> = {
  protein: 'bg-primary',
  carbs: 'bg-info',
  fat: 'bg-warning',
};

function MacroTrendRow({
  label,
  tone,
  avg,
  target,
}: {
  label: string;
  tone: MacroTone;
  avg: number;
  target: number;
}) {
  const hasTarget = target > 0;
  const progress = targetProgressPct(avg, target);

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <View className={`h-2 w-2 rounded-full ${TONE_BAR[tone]}`} />
          <Text className="text-foreground text-sm font-semibold">{label}</Text>
        </View>
        <Text className="text-muted-foreground text-xs font-semibold">
          {formatNumberGrouped(avg)}
          {hasTarget ? ` / ${formatNumberGrouped(target)}g` : 'g'} avg
        </Text>
      </View>
      {hasTarget ? (
        <View className="bg-primary/15 h-2 overflow-hidden rounded-full">
          <View className={`${TONE_BAR[tone]} h-full rounded-full`} style={{ width: `${progress}%` }} />
        </View>
      ) : null}
    </View>
  );
}

export function WeeklyMacrosCard({
  proteinTargetG,
  carbsTargetG,
  fatTargetG,
  avgProteinG,
  avgCarbsG,
  avgFatG,
  loggedDayCount,
}: WeeklyMacrosCardProps) {
  return (
    <View className="bg-card mb-6 rounded-md p-5">
      <View className="mb-4">
        <Text className="text-foreground text-base font-bold">Weekly Macros</Text>
        <Text className="text-muted-foreground text-xs">
          {loggedDayCount > 0
            ? `${loggedDayCount}-day average vs target`
            : 'Log food to see your macro average'}
        </Text>
      </View>

      <View className="gap-4">
        <MacroTrendRow label="Protein" tone="protein" avg={avgProteinG} target={proteinTargetG} />
        <MacroTrendRow label="Carbs" tone="carbs" avg={avgCarbsG} target={carbsTargetG} />
        <MacroTrendRow label="Fat" tone="fat" avg={avgFatG} target={fatTargetG} />
      </View>
    </View>
  );
}

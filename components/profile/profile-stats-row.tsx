import { Text } from '@/components/ui/text';
import { useProfileBundleStore } from '@/stores/use-profile-bundle-store';
import { View } from 'react-native';

function formatStatValue(value: string, options: { allowZero?: boolean } = {}) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) return '--';
  if (!options.allowZero && numericValue === 0) return '--';
  return numericValue.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function StatTile({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <View className="bg-card w-full flex-1 items-center justify-center rounded-md px-3 py-2">
      <Text className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
        {label}
      </Text>
      <View className="flex-row items-baseline gap-1">
        <Text
          className={
            highlight ? 'text-primary text-xl font-bold' : 'text-foreground text-xl font-bold'
          }>
          {value}
        </Text>
        <Text className="text-muted-foreground text-xs font-medium">{unit}</Text>
      </View>
    </View>
  );
}

export function ProfileStatsRow() {
  const { units, weight, calorieGoal, streakDays } = useProfileBundleStore((state) => state.bundle);

  return (
    <View className="mb-8 flex flex-row gap-2 px-4">
      <StatTile
        label="Weight"
        value={formatStatValue(weight)}
        unit={units === 'Metric' ? 'kg' : 'lb'}
      />
      <StatTile label="Goal" value={formatStatValue(calorieGoal)} unit="kcal" />
      <StatTile
        label="Streak"
        value={formatStatValue(streakDays, { allowZero: true })}
        unit="days"
        highlight
      />
    </View>
  );
}

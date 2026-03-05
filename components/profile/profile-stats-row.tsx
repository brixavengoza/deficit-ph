import { Text } from '@/components/ui/text';
import { PROFILE_APP_PREFERENCES_MOCK, PROFILE_STATS_MOCK } from '@/lib/profile-settings-mock';
import { ScrollView, View } from 'react-native';

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
    <View className="bg-card border-border w-full flex-1 items-center justify-center rounded-2xl border px-3 py-2">
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
  const { units, activityLevel } = PROFILE_APP_PREFERENCES_MOCK;
  const { weight, calorieGoal, streakDays } = PROFILE_STATS_MOCK;

  return (
    <View className="mb-8 flex flex-row gap-2 px-4">
      <StatTile label="Weight" value={weight} unit={units === 'Metric' ? 'kg' : 'lb'} />
      <StatTile label="Goal" value={calorieGoal} unit="kcal" />
      <StatTile label="Streak" value={streakDays} unit="days" highlight />
    </View>
  );
}

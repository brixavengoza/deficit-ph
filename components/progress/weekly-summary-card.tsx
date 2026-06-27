import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Target } from 'lucide-react-native';
import { View } from 'react-native';

export function WeeklySummaryCard({
  averageDeficitKcal,
  avgWaterLiters,
  trackedMeals,
  lowestWeightKg,
}: {
  averageDeficitKcal: number;
  avgWaterLiters: number;
  trackedMeals: number;
  lowestWeightKg: number | null;
}) {
  return (
    <View className="bg-card rounded-md p-5">
      <View className="mb-4 flex-row items-center gap-2">
        <Icon as={Target} className="text-primary size-4" />
        <Text className="text-foreground text-base font-bold">This Week Summary</Text>
      </View>
      <View className="flex-row flex-wrap gap-3">
        <View className="bg-background-subtle min-w-[140px] flex-1 rounded-md p-4">
          <Text className="text-muted-foreground text-xs">Average Deficit</Text>
          <Text className="text-foreground mt-1 text-xl font-bold">{averageDeficitKcal} kcal</Text>
        </View>
        <View className="bg-background-subtle min-w-[140px] flex-1 rounded-md p-4">
          <Text className="text-muted-foreground text-xs">Avg Water Intake</Text>
          <Text className="text-foreground mt-1 text-xl font-bold">{avgWaterLiters} L</Text>
        </View>
        <View className="bg-background-subtle min-w-[140px] flex-1 rounded-md p-4">
          <Text className="text-muted-foreground text-xs">Tracked Meals</Text>
          <Text className="text-foreground mt-1 text-xl font-bold">{trackedMeals} meals</Text>
        </View>
        <View className="bg-background-subtle min-w-[140px] flex-1 rounded-md p-4">
          <Text className="text-muted-foreground text-xs">Lowest Weight</Text>
          <Text className="text-foreground mt-1 text-xl font-bold">
            {lowestWeightKg != null ? `${lowestWeightKg} kg` : '--'}
          </Text>
        </View>
      </View>
    </View>
  );
}

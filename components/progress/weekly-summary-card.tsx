import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Target } from 'lucide-react-native';
import { View } from 'react-native';

export function WeeklySummaryCard() {
  return (
    <View className="rounded-[22px] border border-slate-100 bg-white p-5 shadow-sm">
      <View className="mb-4 flex-row items-center gap-2">
        <Icon as={Target} className="text-primary size-4" />
        <Text className="text-base font-bold text-slate-900">This Week Summary</Text>
      </View>
      <View className="flex-row flex-wrap gap-3">
        <View className="min-w-[140px] flex-1 rounded-xl bg-slate-50 p-4">
          <Text className="text-muted-foreground text-xs">Average Deficit</Text>
          <Text className="text-foreground mt-1 text-xl font-bold">-420 kcal</Text>
        </View>
        <View className="min-w-[140px] flex-1 rounded-xl bg-slate-50 p-4">
          <Text className="text-muted-foreground text-xs">Avg Water Intake</Text>
          <Text className="text-foreground mt-1 text-xl font-bold">2.1 L</Text>
        </View>
        <View className="min-w-[140px] flex-1 rounded-xl bg-slate-50 p-4">
          <Text className="text-muted-foreground text-xs">Tracked Meals</Text>
          <Text className="text-foreground mt-1 text-xl font-bold">26 meals</Text>
        </View>
        <View className="min-w-[140px] flex-1 rounded-xl bg-slate-50 p-4">
          <Text className="text-muted-foreground text-xs">Lowest Weight</Text>
          <Text className="text-foreground mt-1 text-xl font-bold">84.9 kg</Text>
        </View>
      </View>
    </View>
  );
}


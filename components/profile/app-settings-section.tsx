import CalorieGoalRow from '@/components/profile/app-section/CalorieGoalRow';
import MacroTargetsRow from '@/components/profile/app-section/MacroTargetsRow';
import TdeeCalculatorRow from '@/components/profile/app-section/TdeeCalculatorRow';
import ThemeRow from '@/components/profile/app-section/ThemeRow';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';

export function AppSettingsSection() {
  return (
    <View className="bg-card overflow-hidden rounded-md">
      <View className="bg-background-subtle px-5 py-3">
        <Text className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
          App
        </Text>
      </View>

      <View className="divide-border divide-y">
        <ThemeRow />
        <CalorieGoalRow />
        <MacroTargetsRow />
        <TdeeCalculatorRow />
      </View>
    </View>
  );
}

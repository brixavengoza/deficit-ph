import NotificationsRow from '@/components/profile/app-section/NotificationsRow';
import TdeeCalculatorRow from '@/components/profile/app-section/TdeeCalculatorRow';
import ThemeRow from '@/components/profile/app-section/ThemeRow';
import UnitsRow from '@/components/profile/app-section/UnitsRow';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';

export function AppSettingsSection() {
  return (
    <View className="bg-card border-border overflow-hidden rounded-[22px] border">
      <View className="border-border bg-background-subtle border-b px-5 py-3">
        <Text className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
          App
        </Text>
      </View>

      <View className="divide-border divide-y">
        <NotificationsRow />
        <UnitsRow />
        <ThemeRow />
        <TdeeCalculatorRow />
      </View>
    </View>
  );
}

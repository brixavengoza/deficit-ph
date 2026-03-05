import LogoutRow from '@/components/profile/account-section/LogoutRow';
import PrivacyPolicyRow from '@/components/profile/account-section/PrivacyPolicyRow';
import ProRow from '@/components/profile/account-section/ProRow';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';

export function AccountSection() {
  return (
    <View className="bg-card border-border overflow-hidden rounded-[22px] border">
      <View className="border-border bg-background-subtle border-b px-5 py-3">
        <Text className="text-muted-foreground text-xs font-bold tracking-wider uppercase">Account</Text>
      </View>

      <View className="divide-y divide-slate-100">
        <ProRow />
        <PrivacyPolicyRow />
        <LogoutRow />
      </View>
    </View>
  );
}

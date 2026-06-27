import PrivacyPolicyRow from '@/components/profile/account-section/PrivacyPolicyRow';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';

export function AccountSection() {
  return (
    <View className="bg-card overflow-hidden rounded-md">
      <View className="bg-background-subtle px-5 py-3">
        <Text className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
          Account
        </Text>
      </View>

      <View>
        <PrivacyPolicyRow />
      </View>
    </View>
  );
}

import { AccountSection } from '@/components/profile/account-section';
import { AppSettingsSection } from '@/components/profile/app-settings-section';
import { MyDetailsSection } from '@/components/profile/my-details-section';
import { ProfileHeaderSection } from '@/components/profile/profile-header-section';
import { ProfileStatsRow } from '@/components/profile/profile-stats-row';
import { Text } from '@/components/ui/text';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useProfileBundleStore } from '@/stores/use-profile-bundle-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DashboardProfileScreen() {
  const insets = useSafeAreaInsets();
  const ensureLoaded = useProfileBundleStore((state) => state.ensureLoaded);

  React.useEffect(() => {
    void ensureLoaded();
  }, [ensureLoaded]);

  return (
    <View className="bg-background flex-1">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 128 }}>
        <ProfileHeaderSection />
        <ProfileStatsRow />

        <View className="gap-6 px-4">
          <MyDetailsSection />
          <AppSettingsSection />
          <AccountSection />

          <View className="items-center pb-8">
            <Text className="text-[10px] text-slate-400">DeficitPH Version 1.0.4 (Build 202)</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

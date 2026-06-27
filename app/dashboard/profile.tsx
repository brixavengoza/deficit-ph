import { AccountSection } from '@/components/profile/account-section';
import LogoutRow from '@/components/profile/account-section/LogoutRow';
import { AppSettingsSection } from '@/components/profile/app-settings-section';
import { MyDetailsSection } from '@/components/profile/my-details-section';
import { ProfileHeaderSection } from '@/components/profile/profile-header-section';
import { ProfileStatsRow } from '@/components/profile/profile-stats-row';
import { Text } from '@/components/ui/text';
import { useFocusEffect } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useProfileBundleStore } from '@/stores/use-profile-bundle-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DashboardProfileScreen() {
  const insets = useSafeAreaInsets();
  const refreshProfile = useProfileBundleStore((state) => state.refresh);

  useFocusEffect(
    React.useCallback(() => {
      void refreshProfile();
    }, [refreshProfile])
  );

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
          <View className="pt-2">
            <Text className="text-muted-foreground mb-2 px-1 text-xs font-bold tracking-wider uppercase">
              Session
            </Text>
            <LogoutRow />
          </View>

          <View className="items-center pb-8">
            <Text className="text-[10px] text-slate-400">DeficitPH Version 1.0.4 (Build 202)</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

import { AccountSection } from '@/components/profile/account-section';
import { AppSettingsSection } from '@/components/profile/app-settings-section';
import { MyDetailsSection } from '@/components/profile/my-details-section';
import { ProfileHeaderSection } from '@/components/profile/profile-header-section';
import { ProfileStatsRow } from '@/components/profile/profile-stats-row';
import { Text } from '@/components/ui/text';
import React from 'react';
import { ScrollView, View } from 'react-native';

export default function DashboardProfileScreen() {
  return (
    <View className="bg-background flex-1">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-32">
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

import { Text } from '@/components/ui/text';
import React from 'react';
import { View } from 'react-native';
import PersonalInfoCollapsibleRow from './details-section/PersonalInfoCollapsibleRow';
import ActivityLevelRow from './details-section/ActivityLevelRow';
import BodyMeasurementsCollapsibleRow from './details-section/BodyMeasurementsCollapsibleRow';

export default function MyDetailsSection() {
  return (
    <View className="bg-card border-border overflow-hidden rounded-[22px] border">
      <View className="border-border bg-background-subtle border-b px-5 py-3">
        <Text className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
          My Details
        </Text>
      </View>
      <View className="divide-y divide-slate-100">
        <PersonalInfoCollapsibleRow />
        <BodyMeasurementsCollapsibleRow />
        <ActivityLevelRow />
      </View>
    </View>
  );
}

export { MyDetailsSection };

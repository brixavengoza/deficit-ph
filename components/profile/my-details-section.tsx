import { Text } from '@/components/ui/text';
import React from 'react';
import { View } from 'react-native';
import PersonalInfoCollapsibleRow from './details-section/PersonalInfoCollapsibleRow';
import ActivityLevelRow from './details-section/ActivityLevelRow';
import BodyMeasurementsCollapsibleRow from './details-section/BodyMeasurementsCollapsibleRow';
import GoalRow from './details-section/GoalRow';

export default function MyDetailsSection() {
  return (
    <View className="bg-card overflow-hidden rounded-md">
      <View className="bg-background-subtle px-5 py-3">
        <Text className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
          My Details
        </Text>
      </View>
      <View className="divide-border divide-y">
        <PersonalInfoCollapsibleRow />
        <BodyMeasurementsCollapsibleRow />
        <ActivityLevelRow />
        <GoalRow />
      </View>
    </View>
  );
}

export { MyDetailsSection };

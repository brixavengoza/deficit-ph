import { Text } from '@/components/ui/text';
import { format } from 'date-fns';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

type StreakCardProps = {
  currentStreak: number;
  days: Array<{ localDay: string; completed: boolean }>;
};

export function StreakCard({ currentStreak, days }: StreakCardProps) {
  const today = new Date();

  return (
    <View className="mb-6 overflow-hidden rounded-[22px] bg-orange-500 p-6">
      <View className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/10" />
      <View className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-orange-300/20" />

      <View className="relative z-10 gap-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-sm font-medium tracking-wider text-orange-100 uppercase">
              Current Streak
            </Text>
            <View className="mt-1 flex-row items-center gap-2">
              <Text className="text-4xl font-bold tracking-tight text-white">{currentStreak} Days</Text>
              <Text className="text-3xl">🔥</Text>
            </View>
            <Text className="mt-2 text-sm leading-snug font-medium text-orange-50">
              {currentStreak > 0
                ? `Great consistency. Keep the streak alive today.`
                : 'Start logging today to begin your streak.'}
            </Text>
          </View>

          <View className="rounded-full bg-white/10 px-3 py-1">
            <Text className="text-xs font-semibold tracking-wide text-white/90 uppercase">
              {format(today, 'MMMM')}
            </Text>
          </View>
        </View>

        <View className="overflow-hidden rounded-xl bg-white/10 py-3">
          <View className="mb-2 flex-row items-center justify-between px-3">
            <Text className="text-xs font-semibold text-orange-100">{format(today, 'EEE, MMM d')}</Text>
            <Text className="text-[10px] font-medium text-orange-100/90">recent 21 days</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 8 }}
            className="overflow-hidden">
            <View className="flex-row items-end gap-4 px-3">
              {days.map((day) => {
                const date = new Date(`${day.localDay}T00:00:00`);
                const barFillColor = day.completed ? 'bg-white' : 'bg-white/35';

                return (
                  <Pressable key={day.localDay} className="items-center">
                    <View className={`mb-1 h-8 w-3 rounded-full ${barFillColor}`} />
                    <Text className={'text-[11px] font-medium text-orange-100'}>{format(date, 'd')}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

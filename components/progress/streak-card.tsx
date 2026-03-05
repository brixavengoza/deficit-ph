import { Text } from '@/components/ui/text';
import { format, subDays } from 'date-fns';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

type StreakDay = {
  date: Date;
  completed: boolean;
};

const TODAY = new Date();
const DAYS: StreakDay[] = Array.from({ length: 21 }, (_, index) => {
  const reverseIndex = 20 - index;
  const date = subDays(TODAY, reverseIndex);
  const completed = reverseIndex <= 11 || [13, 15].includes(reverseIndex);
  return { date, completed };
});

export function StreakCard() {
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
              <Text className="text-4xl font-bold tracking-tight text-white">12 Days</Text>
              <Text className="text-3xl">🔥</Text>
            </View>
            <Text className="mt-2 text-sm leading-snug font-medium text-orange-50">
              You&apos;re on fire! That&apos;s 12 days of consistent tracking.
            </Text>
          </View>

          <View className="rounded-full bg-white/10 px-3 py-1">
            <Text className="text-xs font-semibold tracking-wide text-white/90 uppercase">
              {format(TODAY, 'MMMM')}
            </Text>
          </View>
        </View>

        <View className="overflow-hidden rounded-xl bg-white/10 py-3">
          <View className="mb-2 flex-row items-center justify-between px-3">
            <Text className="text-xs font-semibold text-orange-100">
              {format(TODAY, 'EEE, MMM d')}
            </Text>
            <Text className="text-[10px] font-medium text-orange-100/90">swipe days</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 8 }}
            className="overflow-hidden">
            <View className="flex-row items-end gap-4 px-3">
              {DAYS.map((day, index) => {
                const barFilled = day.completed;
                const barFillColor = barFilled ? 'bg-white' : 'bg-white/35';

                return (
                  <Pressable key={day.date.toISOString()} className="items-center">
                    <View
                      className={
                        barFilled
                          ? `mb-1 h-8 w-3 rounded-full ${barFillColor}`
                          : `mb-1 h-8 w-3 rounded-full ${barFillColor}`
                      }
                    />
                    <Text className={'text-[11px] font-medium text-orange-100'}>
                      {format(day.date, 'd')}
                    </Text>
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

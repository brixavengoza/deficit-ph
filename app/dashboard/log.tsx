import { getFoodEmoji } from '@/lib/food-emoji';
import { Text } from '@/components/ui/text';
import { useFoodLogsQuery } from '@/hooks/use-trackk-query';
import React from 'react';
import { Pressable, SectionList, View } from 'react-native';

type FoodItem = {
  id: string;
  name: string;
  portion: string;
  kcal: number;
};

type FoodSection = {
  title: string;
  totalKcal: number;
  data: FoodItem[];
};

function formatKcal(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

export default function DashboardLogScreen() {
  const logsQuery = useFoodLogsQuery();
  const loggedFoods = logsQuery.data ?? [];

  const sections = React.useMemo<FoodSection[]>(() => {
    if (!loggedFoods.length) return [];

    const grouped = new Map<string, FoodSection>();

    for (const item of loggedFoods) {
      const key = item.consumedAtIso.slice(0, 10);
      const dateLabel = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(new Date(item.consumedAtIso));
      const title = key === new Date().toISOString().slice(0, 10) ? `Today, ${dateLabel}` : dateLabel;

      if (!grouped.has(key)) {
        grouped.set(key, { title, totalKcal: 0, data: [] });
      }

      const section = grouped.get(key)!;
      section.totalKcal += item.totalKcal;
      section.data.push({
        id: item.id,
        name: item.foodName,
        portion: `${item.quantity} ${item.unit} • ${item.meal} • ${item.logTime}`,
        kcal: item.totalKcal,
      });
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([, section]) => section);
  }, [loggedFoods]);

  return (
    <View className="bg-surface">
      <View className="bg-surface border-border flex-row items-center justify-between border-b px-4 pt-2 pb-4">
        <Text className="text-foreground flex-1 text-center text-lg font-bold tracking-tight">
          Food History
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
        renderSectionHeader={({ section }) => (
          <View className="border-border flex-row items-center justify-between bg-gray-100 px-6 py-3">
            <Text className="text-foreground text-base font-bold">{section.title}</Text>
            <Text className="text-muted-foreground text-sm font-semibold">
              {formatKcal(section.totalKcal)} kcal
            </Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <Pressable
            className="bg-surface px-6 py-4"
            style={{
              borderBottomWidth: index === section.data.length - 1 ? 0 : 1,
              borderBottomColor: '#f1f5f9',
            }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 flex-row items-center pr-4">
                <View className="bg-background-subtle mr-3 h-11 w-11 items-center justify-center rounded-xl">
                  <Text className="text-2xl">{getFoodEmoji(item.name)}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-foreground text-base font-medium">{item.name}</Text>
                  <Text className="text-muted-foreground mt-0.5 text-sm">{item.portion}</Text>
                </View>
              </View>
              <Text className="text-primary text-base font-bold">{item.kcal}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="px-6 py-10">
            <Text className="text-foreground text-base font-semibold">
              {logsQuery.isLoading ? 'Loading food logs...' : 'No food logs yet'}
            </Text>
            <Text className="text-muted-foreground mt-1 text-sm">
              {logsQuery.isLoading
                ? 'Fetching from database.'
                : 'Start logging meals and your history will show up here.'}
            </Text>
          </View>
        }
        ListFooterComponent={<View className="h-8" />}
      />
    </View>
  );
}

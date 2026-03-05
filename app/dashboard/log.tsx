import { useFoodLogStore } from '@/stores/use-food-log-store';
import { getFoodEmoji } from '@/lib/food-emoji';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
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

const SECTIONS: FoodSection[] = [
  {
    title: 'Today, Oct 24',
    totalKcal: 1850,
    data: [
      { id: 't1', name: 'Oatmeal with Berries', portion: '1 bowl (250g)', kcal: 320 },
      { id: 't2', name: 'Grilled Chicken Breast', portion: '150g', kcal: 248 },
      { id: 't3', name: 'White Rice', portion: '1 cup (cooked)', kcal: 205 },
      { id: 't4', name: 'Protein Shake', portion: '1 scoop + water', kcal: 120 },
    ],
  },
  {
    title: 'Yesterday, Oct 23',
    totalKcal: 2100,
    data: [
      { id: 'y1', name: 'Scrambled Eggs', portion: '3 large eggs', kcal: 270 },
      { id: 'y2', name: 'Whole Wheat Toast', portion: '2 slices', kcal: 180 },
      { id: 'y3', name: 'Beef Stir Fry', portion: '1 serving (300g)', kcal: 550 },
    ],
  },
  {
    title: 'Tue, Oct 22',
    totalKcal: 1940,
    data: [
      { id: 'd1', name: 'Greek Yogurt Bowl', portion: '200g yogurt + honey', kcal: 220 },
      { id: 'd2', name: 'Salmon Fillet', portion: '180g', kcal: 370 },
    ],
  },
  {
    title: 'Mon, Oct 21',
    totalKcal: 2050,
    data: [{ id: 'm1', name: 'Tuna Sandwich', portion: 'Whole wheat bread', kcal: 420 }],
  },
];

function formatKcal(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

export default function DashboardLogScreen() {
  const router = useRouter();
  const loggedFoods = useFoodLogStore((state) => state.loggedFoods);

  const sections = React.useMemo<FoodSection[]>(() => {
    if (!loggedFoods.length) return SECTIONS;

    const recentAddedSection: FoodSection = {
      title: 'Recent Added',
      totalKcal: loggedFoods.reduce((sum, item) => sum + item.totalKcal, 0),
      data: loggedFoods.map((item) => ({
        id: item.id,
        name: item.foodName,
        portion: `${item.quantity} ${item.unit} • ${item.meal} • ${item.logTime}`,
        kcal: item.totalKcal,
      })),
    };

    return [recentAddedSection, ...SECTIONS];
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
        ListFooterComponent={<View className="h-8" />}
      />
    </View>
  );
}

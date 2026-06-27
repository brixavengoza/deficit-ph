import { FlashList } from '@shopify/flash-list';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { getFoodEmoji } from '@/lib/food-emoji';
import { formatNumberGrouped } from '@/lib/number-format';
import { useFoodsQuery } from '@/hooks/use-trackk-query';
import { router } from 'expo-router';
import { ArrowLeft, Search } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SavedFoodListItem = {
  id: string;
  name: string;
  kcalPer100g: number;
};

function SavedFoodRow({
  item,
  onPress,
}: {
  item: SavedFoodListItem;
  onPress: (item: SavedFoodListItem) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(item)}
      android_ripple={{ color: 'rgba(15, 23, 42, 0.06)' }}
      style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
      className="bg-card flex-row items-center justify-between px-4 py-3">
      <View className="bg-background-subtle mr-3 h-11 w-11 items-center justify-center rounded-md">
        <Text className="text-xl">{getFoodEmoji(item.name)}</Text>
      </View>

      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-foreground text-base font-medium">
          {item.name}
        </Text>
        <Text className="text-muted-foreground mt-0.5 text-sm">
          {formatNumberGrouped(item.kcalPer100g)} kcal / 100g
        </Text>
      </View>
    </Pressable>
  );
}

export default function SavedFoodsScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = React.useState('');
  const foodsQuery = useFoodsQuery();
  const savedFoods = foodsQuery.data ?? [];
  const userSavedFoods = React.useMemo(
    () => savedFoods.filter((food) => food.source === 'user'),
    [savedFoods]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const rows = React.useMemo(() => {
    const mapped = userSavedFoods.map<SavedFoodListItem>((item) => ({
      id: item.id,
      name: item.name,
      kcalPer100g: item.kcalPer100g,
    }));

    if (!normalizedQuery) return mapped;
    return mapped.filter((item) => item.name.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, userSavedFoods]);

  const handleSelectFood = React.useCallback((food: SavedFoodListItem) => {
    router.push({
      pathname: '/dashboard/add-food',
      params: {
        foodName: food.name,
        kcalPer100g: String(food.kcalPer100g),
      },
    });
  }, []);

  return (
    <View className="bg-background flex-1">
      <View
        className="bg-background flex-row items-center justify-between px-4"
        style={{ paddingTop: insets.top + 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="h-10 w-10 items-center justify-center rounded-md"
          onPress={() => router.back()}>
          <Icon as={ArrowLeft} className="text-foreground size-5" />
        </Pressable>

        <Text className="text-foreground flex-1 pr-10 text-center text-lg font-bold tracking-tight">
          Saved Foods
        </Text>
      </View>

      <View className="px-4 pt-2 pb-3">
        <View className="bg-input-bg flex-row items-center overflow-hidden rounded-md">
          <View className="px-4 pr-2">
            <Icon as={Search} className="text-muted-foreground size-5" />
          </View>
          <Input
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search saved foods"
            autoCapitalize="none"
            className="h-12 flex-1 border-0 bg-transparent px-0 font-medium"
            returnKeyType="search"
          />
        </View>

        <View className="mt-2 flex-row items-center justify-between px-1">
          <Text className="text-muted-foreground text-xs">
            {userSavedFoods.length} saved food{userSavedFoods.length === 1 ? '' : 's'}
          </Text>
          <Text className="text-muted-foreground text-xs">Unlimited</Text>
        </View>
      </View>

      <FlashList
        data={rows}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <SavedFoodRow item={item} onPress={handleSelectFood} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={
          <View className="px-4 py-10">
            <Text className="text-foreground text-base font-semibold">
              {foodsQuery.isLoading
                ? 'Loading saved foods...'
                : normalizedQuery
                  ? 'No saved foods found'
                  : 'No saved foods yet'}
            </Text>
            <Text className="text-muted-foreground mt-1 text-sm">
              {foodsQuery.isLoading
                ? 'Fetching from database.'
                : normalizedQuery
                  ? 'Try another keyword.'
                  : 'Create a custom food and it will appear here.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

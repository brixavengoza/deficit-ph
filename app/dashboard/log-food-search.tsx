import { LoggedFoodsCartModal } from '@/components/log/LoggedFoodsCartModal';
import { FlashList } from '@shopify/flash-list';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { getFoodEmoji } from '@/lib/food-emoji';
import { formatNumberGrouped } from '@/lib/number-format';
import {
  useCommonFoodsQuery,
  useFoodLogsQuery,
  useFoodSearchQuery,
  useFoodsQuery,
} from '@/hooks/use-trackk-query';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, PencilLine, Plus, Search } from 'lucide-react-native';
import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SearchFood = {
  id: string;
  name: string;
  kcalPer100g: number;
};

type SearchRow =
  | {
      type: 'section';
      id: string;
      title: string;
      mt?: number;
      actionLabel?: string;
      onPressAction?: () => void;
    }
  | { type: 'food'; id: string; food: SearchFood }
  | { type: 'empty'; id: string };

function FoodRow({ item, onPress }: { item: SearchFood; onPress: (item: SearchFood) => void }) {
  return (
    <Pressable
      onPress={() => onPress(item)}
      android_ripple={{ color: 'rgba(15, 23, 42, 0.06)' }}
      style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
      className="border-border bg-surface flex-row items-center justify-between border-b px-4 py-3">
      <View className="bg-background-subtle mr-3 h-11 w-11 items-center justify-center rounded-xl">
        <Text className="text-xl">{getFoodEmoji(item.name)}</Text>
      </View>

      <View className="flex-1">
        <Text className="text-foreground text-base font-medium">{item.name}</Text>
        <Text className="text-muted-foreground mt-0.5 text-sm">
          {formatNumberGrouped(item.kcalPer100g)} kcal / 100g
        </Text>
      </View>
    </Pressable>
  );
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(id);
  }, [delayMs, value]);

  return debouncedValue;
}

export default function LogFoodSearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const inputRef = React.useRef<TextInput>(null);
  const navigateTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = React.useState('');
  const [cartModalOpen, setCartModalOpen] = React.useState(false);
  const debouncedQuery = useDebouncedValue(query, 250);
  const foodsQuery = useFoodsQuery();
  const commonFoodsQuery = useCommonFoodsQuery();
  const foodSearchQuery = useFoodSearchQuery(debouncedQuery);
  const logsQuery = useFoodLogsQuery();
  const savedFoods = foodsQuery.data ?? [];
  const seedFoods = commonFoodsQuery.data ?? [];
  const searchResults = foodSearchQuery.data ?? [];
  const allLoggedFoods = logsQuery.data ?? [];
  const todayKey = new Date().toISOString().slice(0, 10);
  const loggedFoods = React.useMemo(
    () => allLoggedFoods.filter((item) => item.consumedAtIso.slice(0, 10) === todayKey),
    [allLoggedFoods, todayKey]
  );
  const loggedFoodsCount = loggedFoods.length;
  const latestLoggedFood = loggedFoods[0];
  const indicatorEmoji = latestLoggedFood ? getFoodEmoji(latestLoggedFood.foodName) : '🍽️';

  React.useEffect(() => {
    const id = setTimeout(() => {
      inputRef.current?.focus();
    }, 120);
    return () => {
      clearTimeout(id);
      if (navigateTimeoutRef.current) clearTimeout(navigateTimeoutRef.current);
    };
  }, []);

  const recentFoods = React.useMemo<SearchFood[]>(() => {
    const byName = new Map<string, SearchFood>();
    for (const item of loggedFoods) {
      const key = item.foodName.trim().toLowerCase();
      if (byName.has(key)) continue;
      byName.set(key, { id: item.id, name: item.foodName, kcalPer100g: item.kcalPer100g });
    }
    return Array.from(byName.values()).slice(0, 8);
  }, [loggedFoods]);

  const commonFoods = React.useMemo<SearchFood[]>(
    () =>
      seedFoods.map((food) => ({ id: food.id, name: food.name, kcalPer100g: food.kcalPer100g })),
    [seedFoods]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const debouncedNormalizedQuery = debouncedQuery.trim().toLowerCase();
  const searchedFoods = React.useMemo<SearchFood[]>(
    () =>
      searchResults.map((food) => ({
        id: food.id,
        name: food.name,
        kcalPer100g: food.kcalPer100g,
      })),
    [searchResults]
  );

  const rows = React.useMemo<SearchRow[]>(() => {
    if (normalizedQuery) {
      if (
        normalizedQuery.length < 2 ||
        normalizedQuery !== debouncedNormalizedQuery ||
        foodSearchQuery.isFetching
      ) {
        return [{ type: 'section', id: 'search-header', title: 'Search Results', mt: 8 }];
      }

      if (!searchedFoods.length) {
        return [
          { type: 'section', id: 'search-header', title: 'Search Results', mt: 8 },
          { type: 'empty', id: 'empty' },
        ];
      }

      return [
        { type: 'section', id: 'search-header', title: 'Search Results', mt: 8 },
        ...searchedFoods.map((item) => ({
          type: 'food' as const,
          id: `search-${item.id}`,
          food: item,
        })),
      ];
    }

    return [
      ...(savedFoods.length
        ? [
            {
              type: 'section' as const,
              id: 'saved-header',
              title: 'Saved Foods',
              mt: 8,
              actionLabel: 'See all',
              onPressAction: () => router.push('/dashboard/saved-foods'),
            },
            ...savedFoods.map((food) => ({
              type: 'food' as const,
              id: `saved-${food.id}`,
              food: { id: food.id, name: food.name, kcalPer100g: food.kcalPer100g },
            })),
          ]
        : []),
      ...(recentFoods.length
        ? [
            { type: 'section' as const, id: 'recent-header', title: 'Recent Foods', mt: 8 },
            ...recentFoods.map((food) => ({
              type: 'food' as const,
              id: `recent-${food.id}`,
              food,
            })),
          ]
        : []),
      ...(commonFoods.length
        ? [
            {
              type: 'section' as const,
              id: 'common-header',
              title: 'Common Foods',
              mt: 24,
            },
            ...commonFoods.map((food) => ({
              type: 'food' as const,
              id: `common-${food.id}`,
              food,
            })),
          ]
        : []),
    ];
  }, [
    commonFoods,
    debouncedNormalizedQuery,
    foodSearchQuery.isFetching,
    normalizedQuery,
    recentFoods,
    router,
    savedFoods,
    searchedFoods,
  ]);

  const handleSelectFood = React.useCallback(
    (food: SearchFood) => {
      if (navigateTimeoutRef.current) clearTimeout(navigateTimeoutRef.current);
      navigateTimeoutRef.current = setTimeout(() => {
        router.push({
          pathname: '/dashboard/add-food',
          params: {
            foodName: food.name,
            kcalPer100g: String(food.kcalPer100g),
          },
        });
      }, 110);
    },
    [router]
  );

  const renderRow = ({ item }: { item: SearchRow }) => {
    if (item.type === 'section') {
      return (
        <View
          className={item.mt ? undefined : ''}
          style={item.mt ? { marginTop: item.mt } : undefined}>
          <View className="flex-row items-center justify-between px-4 py-2">
            <Text className="text-lg font-bold">{item.title}</Text>
            {item.actionLabel && item.onPressAction ? (
              <Pressable
                onPress={item.onPressAction}
                android_ripple={{ color: 'rgba(15, 23, 42, 0.06)', borderless: true }}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                className="flex-row items-center gap-0.5">
                <Text className="text-primary text-sm font-semibold">{item.actionLabel}</Text>
                <Icon as={ChevronRight} className="text-primary size-4" />
              </Pressable>
            ) : null}
          </View>
        </View>
      );
    }

    if (item.type === 'empty') {
      return (
        <View className="px-4 py-8">
          <Text className="text-foreground text-base font-semibold">No foods found</Text>
          <Text className="text-muted-foreground mt-1 text-sm">
            Try another keyword like `rice`, `oats`, or `chicken`.
          </Text>
        </View>
      );
    }

    return <FoodRow item={item.food} onPress={handleSelectFood} />;
  };

  return (
    <View className="bg-surface flex-1">
      <View
        className="bg-surface flex-row items-center px-4"
        style={{ paddingTop: insets.top + 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="h-10 w-14 items-center justify-center rounded-full"
          onPress={() => router.back()}>
          <Icon as={ArrowLeft} className="text-foreground size-5" />
        </Pressable>

        <View className="flex-1 items-center justify-center">
          <Text className="text-foreground text-center text-lg font-bold tracking-tight">
            Log Food
          </Text>
        </View>

        <View className="w-14 items-center justify-center overflow-visible">
          {loggedFoodsCount > 0 ? (
            <Animated.View
              key={`cart-indicator-${loggedFoodsCount}`}
              entering={FadeIn.duration(180)}
              className="overflow-visible">
              <Pressable
                onPress={() => setCartModalOpen(true)}
                className="bg-primary/10 border-primary/20 relative h-10 w-10 items-center justify-center rounded-full border">
                <Text className="text-lg">{indicatorEmoji}</Text>
                <View className="bg-primary absolute -top-1 -right-1 min-w-5 items-center justify-center rounded-full py-0.5">
                  <Animated.View entering={ZoomIn.springify().damping(15).stiffness(280)}>
                    <Text className="text-[10px] font-bold text-white">{loggedFoodsCount}</Text>
                  </Animated.View>
                </View>
              </Pressable>
            </Animated.View>
          ) : (
            <View className="h-10 w-10" />
          )}
        </View>
      </View>

      <View className="bg-surface px-4 pt-2 pb-2">
        <View className="bg-input-bg border-input flex-row items-center overflow-hidden rounded-full border">
          <View className="px-4 pr-2">
            <Icon as={Search} className="text-muted-foreground size-5" />
          </View>

          <Input
            ref={inputRef}
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search for food (e.g., Chicken Breast)"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            className="h-12 flex-1 border-0 bg-transparent px-0 font-medium"
            returnKeyType="search"
          />
        </View>
      </View>

      <FlashList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={renderRow}
        getItemType={(item) => item.type}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 112 }}
        ListFooterComponent={<View className="h-6" />}
      />

      <View pointerEvents="box-none" className="absolute right-0 bottom-6 left-0 px-6">
        <Button onPress={() => router.push('/dashboard/add-custom-food')}>
          <Icon as={PencilLine} className="text-primary-foreground mr-2 size-4" />
          <Text>Add Custom Food</Text>
        </Button>
      </View>

      <LoggedFoodsCartModal
        open={cartModalOpen}
        onClose={() => setCartModalOpen(false)}
        dayKey={todayKey}
      />
    </View>
  );
}

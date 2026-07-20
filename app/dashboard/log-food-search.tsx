import { FlashList } from '@shopify/flash-list';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { getNutritionScanCapability } from '@/lib/ai-capability';
import { getFoodEmoji } from '@/lib/food-emoji';
import { formatNumberGrouped } from '@/lib/number-format';
import {
  useCommonFoodsQuery,
  useFoodLogsForDayQuery,
  useFoodSearchQuery,
  useFoodsQuery,
} from '@/hooks/use-trackk-query';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, PencilLine, Plus, ScanLine, Search } from 'lucide-react-native';
import React from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SearchFood = {
  id: string;
  name: string;
  kcalPer100g: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatsPer100g?: number;
  fiberPer100g?: number;
  sugarPer100g?: number;
  sodiumMgPer100g?: number;
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
  | { type: 'empty'; id: string; query: string };

function FoodRow({ item, onPress }: { item: SearchFood; onPress: (item: SearchFood) => void }) {
  return (
    <Pressable
      onPress={() => onPress(item)}
      android_ripple={{ color: 'rgba(15, 23, 42, 0.06)' }}
      style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
      className="bg-card flex-row items-center justify-between px-4 py-3">
      <View className="bg-primary/10 mr-3 h-10 w-10 items-center justify-center rounded-md">
        <Text className="text-xl">{getFoodEmoji(item.name)}</Text>
      </View>

      <View className="flex-1">
        <Text className="text-foreground text-base font-bold">{item.name}</Text>
        <Text className="text-muted-foreground mt-0.5 text-sm">
          {formatNumberGrouped(item.kcalPer100g)} kcal / 100g
        </Text>
      </View>
      <View className="bg-background-subtle ml-3 h-9 w-9 items-center justify-center rounded-md">
        <Icon as={Plus} className="text-primary size-4" />
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

function getLocalDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return keyboardHeight;
}

export default function LogFoodSearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Sync capability gate: only offer the scanner where the native module can actually run,
  // so Android/web users never see an entry point that dead-ends.
  const scannerAvailable = React.useMemo(() => getNutritionScanCapability().tier !== 'unavailable', []);
  const inputRef = React.useRef<TextInput>(null);
  const navigateTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = React.useState('');
  const keyboardHeight = useKeyboardHeight();
  const debouncedQuery = useDebouncedValue(query, 250);
  const foodsQuery = useFoodsQuery();
  const commonFoodsQuery = useCommonFoodsQuery();
  const foodSearchQuery = useFoodSearchQuery(debouncedQuery);
  const todayKey = getLocalDayKey();
  const logsQuery = useFoodLogsForDayQuery(todayKey);
  const savedFoods = foodsQuery.data ?? [];
  const seedFoods = commonFoodsQuery.data ?? [];
  const searchResults = foodSearchQuery.data ?? [];
  const loggedFoods = logsQuery.data ?? [];
  const listBottomPadding = keyboardHeight > 0 ? 20 : 12;

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
      // Carry the real per-100g macros from the log snapshot — building recents with only
      // name + kcal made handleSelectFood pass "0" for every macro, silently zeroing them.
      byName.set(key, {
        id: item.id,
        name: item.foodName,
        kcalPer100g: item.kcalPer100g,
        proteinPer100g: item.proteinPer100g,
        carbsPer100g: item.carbsPer100g,
        fatsPer100g: item.fatsPer100g,
        fiberPer100g: item.fiberPer100g,
        sugarPer100g: item.sugarPer100g,
        sodiumMgPer100g: item.sodiumMgPer100g,
      });
    }
    return Array.from(byName.values()).slice(0, 8);
  }, [loggedFoods]);

  const commonFoods = React.useMemo<SearchFood[]>(
    () =>
      seedFoods.map((food) => ({
        id: food.id,
        name: food.name,
        kcalPer100g: food.kcalPer100g,
        proteinPer100g: food.proteinPer100g,
        carbsPer100g: food.carbsPer100g,
        fatsPer100g: food.fatsPer100g,
        fiberPer100g: food.fiberPer100g,
        sugarPer100g: food.sugarPer100g,
        sodiumMgPer100g: food.sodiumMgPer100g,
      })),
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
        proteinPer100g: food.proteinPer100g,
        carbsPer100g: food.carbsPer100g,
        fatsPer100g: food.fatsPer100g,
        fiberPer100g: food.fiberPer100g,
        sugarPer100g: food.sugarPer100g,
        sodiumMgPer100g: food.sodiumMgPer100g,
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
        return [{ type: 'section', id: 'search-header', title: 'Matching Foods', mt: 8 }];
      }

      if (!searchedFoods.length) {
        return [
          { type: 'section', id: 'search-header', title: 'Matching Foods', mt: 8 },
          { type: 'empty', id: 'empty', query: query.trim() },
        ];
      }

      return [
        { type: 'section', id: 'search-header', title: 'Matching Foods', mt: 8 },
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
              title: 'Saved',
              mt: 8,
              actionLabel: 'See all',
              onPressAction: () => router.push('/dashboard/saved-foods'),
            },
            ...savedFoods.map((food) => ({
              type: 'food' as const,
              id: `saved-${food.id}`,
              food: {
                id: food.id,
                name: food.name,
                kcalPer100g: food.kcalPer100g,
                proteinPer100g: food.proteinPer100g,
                carbsPer100g: food.carbsPer100g,
                fatsPer100g: food.fatsPer100g,
                fiberPer100g: food.fiberPer100g,
                sugarPer100g: food.sugarPer100g,
                sodiumMgPer100g: food.sodiumMgPer100g,
              },
            })),
          ]
        : []),
      ...(recentFoods.length
        ? [
            { type: 'section' as const, id: 'recent-header', title: 'Recent', mt: 8 },
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
    query,
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
            proteinPer100g: String(food.proteinPer100g ?? 0),
            carbsPer100g: String(food.carbsPer100g ?? 0),
            fatsPer100g: String(food.fatsPer100g ?? 0),
            fiberPer100g: String(food.fiberPer100g ?? 0),
            sugarPer100g: String(food.sugarPer100g ?? 0),
            sodiumMgPer100g: String(food.sodiumMgPer100g ?? 0),
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
        <View className="bg-primary/10 mx-4 my-3 rounded-md p-4">
          <Text className="text-foreground text-base font-bold">No foods found</Text>
          <Text className="text-muted-foreground mt-1 text-sm">
            Create it once, then log it right away.
          </Text>
          <Button
            className="mt-4 h-11 rounded-md"
            onPress={() =>
              router.push({
                pathname: '/dashboard/add-custom-food',
                params: { foodName: item.query },
              })
            }>
            <Icon as={PencilLine} className="text-primary-foreground size-4" />
            <Text className="text-primary-foreground">Create & Log Food</Text>
          </Button>
        </View>
      );
    }

    return <FoodRow item={item.food} onPress={handleSelectFood} />;
  };

  return (
    <KeyboardAvoidingView
      className="bg-background flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="flex-1">
        <View
          className="bg-background flex-row items-center px-4"
          style={{ paddingTop: insets.top + 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-10 w-14 items-center justify-center rounded-md"
            onPress={() => router.back()}>
            <Icon as={ArrowLeft} className="text-foreground size-5" />
          </Pressable>

          <View className="flex-1 items-center justify-center">
            <Text className="text-foreground text-center text-lg font-bold tracking-tight">
              What did you eat?
            </Text>
          </View>

          <View className="h-10 w-14" />
        </View>

        <View className="bg-background px-4 pt-2 pb-2">
          <View className="bg-input-bg flex-row items-center overflow-hidden rounded-md">
            <View className="px-4 pr-2">
              <Icon as={Search} className="text-muted-foreground size-5" />
            </View>

            <Input
              ref={inputRef}
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Search food"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              className="h-12 flex-1 border-0 bg-transparent px-0 font-medium"
              returnKeyType="search"
            />
          </View>

          <View className="mt-3 flex-row gap-2">
            <Button
              size="sm"
              className="h-10 flex-1 rounded-md"
              onPress={() =>
                router.push({
                  pathname: '/dashboard/add-custom-food',
                  params: query.trim() ? { foodName: query.trim() } : undefined,
                })
              }>
              <Icon as={PencilLine} className="text-primary-foreground size-4" />
              <Text>Create Food</Text>
            </Button>
            {scannerAvailable ? (
              <Button
                size="sm"
                variant="outline"
                className="h-10 flex-1 rounded-md"
                onPress={() => router.push('/dashboard/scan-label')}>
                <Icon as={ScanLine} className="text-foreground size-4" />
                <Text>Scan Label</Text>
              </Button>
            ) : null}
          </View>
        </View>

        <FlashList
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          getItemType={(item) => item.type}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: listBottomPadding }}
          ListFooterComponent={<View className="h-6" />}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

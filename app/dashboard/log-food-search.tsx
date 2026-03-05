import { LoggedFoodsCartModal } from '@/components/log/LoggedFoodsCartModal';
import { FlashList } from '@shopify/flash-list';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { getFoodEmoji } from '@/lib/food-emoji';
import { formatNumberGrouped } from '@/lib/number-format';
import { useFoodLogStore } from '@/stores/use-food-log-store';
import { useSavedFoodStore } from '@/stores/use-saved-food-store';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, PencilLine, Plus, Search } from 'lucide-react-native';
import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

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

const RECENT_FOODS: SearchFood[] = [
  { id: 'r1', name: 'Oatmeal', kcalPer100g: 68 },
  { id: 'r2', name: 'Banana', kcalPer100g: 89 },
  { id: 'r3', name: 'Greek Yogurt (Plain)', kcalPer100g: 59 },
  { id: 'r4', name: 'Rolled Oats', kcalPer100g: 389 },
  { id: 'r5', name: 'Protein Shake', kcalPer100g: 120 },
];

const COMMON_FOODS: SearchFood[] = [
  { id: 'c1', name: 'White Rice (Cooked)', kcalPer100g: 130 },
  { id: 'c2', name: 'Chicken Breast (Grilled)', kcalPer100g: 165 },
  { id: 'c3', name: 'Egg (Large, Boiled)', kcalPer100g: 155 },
  { id: 'c4', name: 'Salmon Fillet', kcalPer100g: 208 },
  { id: 'c5', name: 'Tuna Sandwich', kcalPer100g: 242 },
  { id: 'c6', name: 'Caesar Salad', kcalPer100g: 190 },
  { id: 'c7', name: 'Pasta (Spaghetti)', kcalPer100g: 158 },
  { id: 'c8', name: 'Beef Stir Fry', kcalPer100g: 180 },
  { id: 'c9', name: 'Avocado', kcalPer100g: 160 },
];

function FoodRow({ item, onPress }: { item: SearchFood; onPress: (item: SearchFood) => void }) {
  return (
    <Pressable
      onPress={() => onPress(item)}
      android_ripple={{ color: 'rgba(15, 23, 42, 0.06)' }}
      style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
      className="border-border bg-surface flex-row items-center justify-between border-b border-b-gray-100 px-4 py-3">
      <View className="mr-3 h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
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

export default function LogFoodSearchScreen() {
  const router = useRouter();
  const inputRef = React.useRef<TextInput>(null);
  const navigateTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = React.useState('');
  const [cartModalOpen, setCartModalOpen] = React.useState(false);
  const loggedFoods = useFoodLogStore((state) => state.loggedFoods);
  const savedFoods = useSavedFoodStore((state) => state.savedFoods);
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

  const normalizedQuery = query.trim().toLowerCase();
  const allFoods = React.useMemo(
    () => [
      ...savedFoods.map((item) => ({
        id: item.id,
        name: item.name,
        kcalPer100g: item.kcalPer100g,
        section: 'Saved Foods' as const,
      })),
      ...RECENT_FOODS.map((item) => ({ ...item, section: 'Recent Foods' as const })),
      ...COMMON_FOODS.map((item) => ({ ...item, section: 'Common Foods' as const })),
    ],
    [savedFoods]
  );

  const filteredFoods = React.useMemo(() => {
    if (!normalizedQuery) return [];
    return allFoods.filter((item) => item.name.toLowerCase().includes(normalizedQuery));
  }, [allFoods, normalizedQuery]);

  const rows = React.useMemo<SearchRow[]>(() => {
    if (normalizedQuery) {
      if (!filteredFoods.length) {
        return [
          { type: 'section', id: 'search-header', title: 'Search Results', mt: 8 },
          { type: 'empty', id: 'empty' },
        ];
      }

      return [
        { type: 'section', id: 'search-header', title: 'Search Results', mt: 8 },
        ...filteredFoods.map((item) => ({
          type: 'food' as const,
          id: `${item.section}-${item.id}`,
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
      { type: 'section', id: 'recent-header', title: 'Recent Foods', mt: 8 },
      ...RECENT_FOODS.map((food) => ({ type: 'food' as const, id: `recent-${food.id}`, food })),
      {
        type: 'section',
        id: 'common-header',
        title: 'Common Foods',
        mt: savedFoods.length ? 24 : 24,
      },
      ...COMMON_FOODS.map((food) => ({ type: 'food' as const, id: `common-${food.id}`, food })),
    ];
  }, [filteredFoods, normalizedQuery, router, savedFoods]);

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
      <View className="bg-surface flex-row items-center px-4 pt-2">
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
        <View className="bg-background-subtle flex-row items-center overflow-hidden rounded-full">
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

          {/* <Input
              ref={inputRef}
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Search for food (e.g., Chicken Breast)"
              placeholderTextColor="#94a3b8"
              className="h-12 flex-1 border-0 bg-transparent px-0 text-base font-medium"
              returnKeyType="search"
            /> */}

          {/* <Pressable className="border-l border-slate-200 py-3 pr-5 pl-4">
              <Icon as={Barcode} className="text-muted-foreground size-5" />
            </Pressable> */}
        </View>

        {/* <Pressable className="mt-3 flex-row items-center justify-center gap-1">
            <Text className="text-primary text-sm font-semibold">
              Can&apos;t find it? Add custom food instead
            </Text>
            <Icon as={ArrowRight} className="text-primary size-4" />
          </Pressable> */}
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
          <Icon as={PencilLine} className="text-primary mr-2 size-4" />
          <Text>Add Custom Food</Text>
        </Button>
      </View>

      <LoggedFoodsCartModal open={cartModalOpen} onClose={() => setCartModalOpen(false)} />
    </View>
  );
}

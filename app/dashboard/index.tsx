import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { WeightLogModal } from '@/components/progress/weight-log-modal';
import { Text } from '@/components/ui/text';
import { getFoodEmoji } from '@/lib/food-emoji';
import { formatCompactNumber, formatNumberGrouped } from '@/lib/number-format';
import {
  useAddHydrationMutation,
  useAddWeightMutation,
  useFoodLogsQuery,
  useHomeDashboardQuery,
} from '@/hooks/use-trackk-query';
import { router, Stack } from 'expo-router';
import {
  Bell,
  Bookmark,
  Clock3,
  Droplets,
  Edit3,
  Plus,
  QrCode,
  TriangleAlert,
  TrendingDown,
  X,
} from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';

type DayPill = {
  key: string;
  isoDate: string;
  label: string;
  date: number;
  pending?: boolean;
};

const DASHBOARD_HISTORY_DAYS = 30;

function formatShortDayLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
}

function getIsoDateKey(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function buildDayStrip(dayCount: number, hasPendingLogs: boolean): DayPill[] {
  const today = new Date();
  return Array.from({ length: dayCount }).map((_, index) => {
    const next = new Date(today);
    const daysBack = dayCount - 1 - index;
    next.setDate(today.getDate() - daysBack);
    return {
      key: `${next.toDateString()}-${index}`,
      isoDate: getIsoDateKey(next),
      label: formatShortDayLabel(next),
      date: next.getDate(),
      pending: index === dayCount - 1 ? hasPendingLogs : false,
    };
  });
}

function CaloriesGauge({
  progress,
  goal,
  consumed,
  remaining,
}: {
  progress: number;
  goal: number;
  consumed: number;
  remaining: number;
}) {
  const size = 164;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(1, progress)));

  return (
    <View className="items-center">
      <View className="mb-2 w-full flex-row items-center justify-between">
        <View className="items-center">
          <Text className="text-[11px] text-slate-400">Goal</Text>
          <Text className="text-sm font-bold text-white">{formatNumberGrouped(goal)}</Text>
        </View>

        <View style={{ width: size, height: size }} className="items-center justify-center">
          <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#334155"
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#22C55E"
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={dashOffset}
            />
          </Svg>
          <View className="absolute inset-0 items-center justify-center">
            <Text className="text-[10px] tracking-wider text-slate-400 uppercase">Remaining</Text>
            <Text className="text-3xl font-black tracking-tight text-white">
              {formatCompactNumber(remaining, { maximumFractionDigits: 0 })}
            </Text>
            <Text className="text-xs text-slate-400">kcal</Text>
          </View>
        </View>

        <View className="items-center">
          <Text className="text-[11px] text-slate-400">Consumed</Text>
          <Text className="text-sm font-bold text-white">{formatNumberGrouped(consumed)}</Text>
        </View>
      </View>
    </View>
  );
}

function Sparkline({
  values,
  width = 120,
  height = 34,
}: {
  values: readonly number[];
  width?: number;
  height?: number;
}) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;

  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return { x, y };
  });

  const line = points.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `M ${points[0]?.x ?? 0} ${height} L ${points.map((p) => `${p.x} ${p.y}`).join(' L ')} L ${points[points.length - 1]?.x ?? width} ${height} Z`;
  const last = points[points.length - 1] ?? { x: 0, y: height / 2 };

  return (
    <Svg width={width} height={height}>
      <Path d={area} fill="rgba(34,197,94,0.08)" />
      <Polyline
        points={line}
        fill="none"
        stroke="#22C55E"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={last.x} cy={last.y} r={3} fill="#22C55E" />
    </Svg>
  );
}

function QuickAction({
  label,
  icon,
  iconWrapClass,
  iconClassName,
  onPress,
  disabled,
}: {
  label: string;
  icon: any;
  iconWrapClass: string;
  iconClassName: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [{ opacity: disabled ? 0.5 : pressed ? 0.75 : 1 }]}
      className="items-center gap-2">
      <View
        className={`${iconWrapClass} h-14 w-14 items-center justify-center rounded-2xl shadow-xs`}>
        <Icon as={icon} className={`${iconClassName} size-7`} />
      </View>
      <Text className="text-muted-foreground text-[10px] font-bold">{label}</Text>
    </Pressable>
  );
}

type GroupedMeals = Record<
  'Breakfast' | 'Lunch' | 'Dinner' | 'Snack',
  Array<{
    id: string;
    meal: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
    foodName: string;
    logTime: string;
    totalKcal: number;
  }>
>;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const loggedFoods = useFoodLogsQuery();
  const homeDashboard = useHomeDashboardQuery(DASHBOARD_HISTORY_DAYS);
  const hydrationMutation = useAddHydrationMutation();
  const addWeightMutation = useAddWeightMutation();
  const dateStripRef = React.useRef<ScrollView>(null);
  const [hydrationTodayMl, setHydrationTodayMl] = React.useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [hydrationModalOpen, setHydrationModalOpen] = React.useState(false);
  const [hydrationInput, setHydrationInput] = React.useState('250');
  const [hydrationUnit, setHydrationUnit] = React.useState<'ml' | 'liters'>('ml');
  const [hydrationError, setHydrationError] = React.useState<string | null>(null);
  const [weightModalOpen, setWeightModalOpen] = React.useState(false);
  const [weightInput, setWeightInput] = React.useState('');
  const loggedFoodsData = loggedFoods.data ?? [];

  const dayStrip = React.useMemo(
    () => buildDayStrip(DASHBOARD_HISTORY_DAYS, loggedFoodsData.length > 0),
    [loggedFoodsData.length]
  );
  const [selectedDayIsoDate, setSelectedDayIsoDate] = React.useState<string | null>(null);
  const [isDayDataLoading, setIsDayDataLoading] = React.useState(false);
  const latestDayIsoDate = dayStrip[dayStrip.length - 1]?.isoDate ?? getIsoDateKey(new Date());

  React.useEffect(() => {
    setSelectedDayIsoDate((prev) => prev ?? latestDayIsoDate);
  }, [latestDayIsoDate]);

  React.useEffect(() => {
    const today = homeDashboard.data?.days[homeDashboard.data.days.length - 1];
    if (!today) return;
    setHydrationTodayMl(today.hydrationMl);
  }, [homeDashboard.data]);

  React.useEffect(() => {
    const currentWeight = homeDashboard.data?.currentWeightKg;
    if (currentWeight == null || currentWeight <= 0) return;
    setWeightInput(String(currentWeight));
  }, [homeDashboard.data?.currentWeightKg]);
  const selectedDaySummary = React.useMemo(() => {
    if (!homeDashboard.data) return null;
    return (
      homeDashboard.data.days.find(
        (day) => day.localDay === (selectedDayIsoDate ?? latestDayIsoDate)
      ) ?? null
    );
  }, [homeDashboard.data, latestDayIsoDate, selectedDayIsoDate]);

  const handleSelectDay = React.useCallback((day: DayPill) => {
    setIsDayDataLoading(true);
    setSelectedDayIsoDate(day.isoDate);
    setTimeout(() => setIsDayDataLoading(false), 120);
  }, []);
  const groupedMeals = React.useMemo<GroupedMeals>(() => {
    return {
      Breakfast: loggedFoodsData.filter((f) => f.meal === 'Breakfast'),
      Lunch: loggedFoodsData.filter((f) => f.meal === 'Lunch'),
      Dinner: loggedFoodsData.filter((f) => f.meal === 'Dinner'),
      Snack: loggedFoodsData.filter((f) => f.meal === 'Snack'),
    };
  }, [loggedFoodsData]);

  const savedFoodLimitLabel = 'Unlimited';

  const goalKcal = homeDashboard.data?.goalKcal ?? 2000;
  const consumedKcal = selectedDaySummary?.totalKcal ?? 0;
  const remainingKcal = Math.max(0, goalKcal - consumedKcal);
  const macroProgress = [
    {
      label: 'Protein' as const,
      value: selectedDaySummary?.proteinG ?? 0,
      target: homeDashboard.data?.proteinTargetG ?? 120,
      color: '#60a5fa',
    },
    {
      label: 'Carbs' as const,
      value: selectedDaySummary?.carbsG ?? 0,
      target: homeDashboard.data?.carbsTargetG ?? 220,
      color: '#fb923c',
    },
    {
      label: 'Fat' as const,
      value: selectedDaySummary?.fatG ?? 0,
      target: homeDashboard.data?.fatTargetG ?? 70,
      color: '#facc15',
    },
  ].map((macro) => ({
    ...macro,
    progress: macro.target > 0 ? macro.value / macro.target : 0,
  }));
  const hydrationCurrentMl =
    selectedDayIsoDate === latestDayIsoDate && hydrationTodayMl != null
      ? hydrationTodayMl
      : (selectedDaySummary?.hydrationMl ?? 0);
  const hydrationTargetMl = homeDashboard.data?.hydrationTargetMl ?? 2500;
  const hydrationRatio = hydrationCurrentMl / hydrationTargetMl;
  const hydrationFilled = Math.max(1, Math.round(hydrationRatio * 5));

  const onAddWater = React.useCallback(
    async (volumeMl: number) => {
      if (hydrationMutation.isPending) return;
      if (!Number.isFinite(volumeMl) || volumeMl <= 0) return;

      try {
        setHydrationError(null);
        const roundedVolume = Math.round(volumeMl);
        await hydrationMutation.mutateAsync(roundedVolume);
        setHydrationTodayMl((previous) => (previous ?? 0) + roundedVolume);
        setHydrationModalOpen(false);
      } catch (error) {
        console.error('[DashboardScreen.addHydrationLog]', error);
      }
    },
    [hydrationMutation]
  );

  const onSaveCustomHydration = React.useCallback(async () => {
    const parsed = Number(hydrationInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setHydrationError('Enter a valid amount.');
      return;
    }
    const volumeMl = hydrationUnit === 'liters' ? parsed * 1000 : parsed;
    await onAddWater(volumeMl);
  }, [hydrationInput, hydrationUnit, onAddWater]);

  const onSaveWeight = React.useCallback(
    async (weightKg: number) => {
      try {
        await addWeightMutation.mutateAsync(weightKg);
        setWeightModalOpen(false);
        await homeDashboard.refetch();
      } catch (error) {
        console.error('[DashboardScreen.onSaveWeight]', error);
      }
    },
    [addWeightMutation, homeDashboard]
  );

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loggedFoods.refetch(), homeDashboard.refetch()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [homeDashboard, loggedFoods]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="bg-background flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 144 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#21c45d"
              colors={['#21c45d']}
            />
          }>
          <View className="bg-background/80 px-6 pt-3 pb-2">
            <View className="mb-5 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="border-primary bg-muted h-12 w-12 items-center justify-center rounded-full border-2">
                  <Text className="text-muted-foreground text-sm font-bold">AM</Text>
                </View>
                <View>
                  <Text className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                    {getGreeting()}
                  </Text>
                  <Text className="text-lg font-bold">
                    {homeDashboard.data?.userName ?? 'Trackk User'}
                  </Text>
                </View>
              </View>
              <Pressable className="border-border bg-card relative h-10 w-10 items-center justify-center rounded-full border">
                <Icon as={Bell} className="text-foreground size-5" />
                <View className="bg-destructive absolute top-2 right-2 h-2 w-2 rounded-full" />
              </Pressable>
            </View>

            <ScrollView
              ref={dateStripRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              contentContainerClassName="gap-2 pb-1">
              {dayStrip.map((day) => (
                <Pressable
                  key={day.key}
                  onPress={() => handleSelectDay(day)}
                  className={
                    day.isoDate === (selectedDayIsoDate ?? latestDayIsoDate)
                      ? 'bg-primary h-16 w-12 items-center justify-center rounded-2xl'
                      : 'bg-card border-border h-16 w-12 items-center justify-center rounded-2xl border'
                  }>
                  <Text
                    className={
                      day.isoDate === (selectedDayIsoDate ?? latestDayIsoDate)
                        ? 'text-xs font-medium text-white/80'
                        : 'text-muted-foreground text-xs font-medium'
                    }>
                    {day.label}
                  </Text>
                  <Text
                    className={
                      day.isoDate === (selectedDayIsoDate ?? latestDayIsoDate)
                        ? 'text-lg font-bold text-white'
                        : 'text-foreground text-lg font-bold'
                    }>
                    {day.date}
                  </Text>
                  {day.pending ? (
                    <View
                      className={
                        day.isoDate === (selectedDayIsoDate ?? latestDayIsoDate)
                          ? 'mt-1 h-1 w-1 rounded-full bg-white'
                          : 'bg-primary mt-1 h-1 w-1 rounded-full'
                      }
                    />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {loggedFoodsData.length > 0 ? (
            <View className="px-6 pt-2 pb-1">
              <View className="flex-row items-center justify-between rounded-xl border border-orange-100 bg-orange-50 px-3 py-3">
                <View className="flex-row items-center gap-2">
                  <Icon as={TriangleAlert} className="size-4 text-orange-500" />
                  <Text className="text-xs font-semibold text-orange-700">
                    Complete Logging ({loggedFoodsData.length} item
                    {loggedFoodsData.length === 1 ? '' : 's'})
                  </Text>
                </View>
                <Pressable onPress={() => router.push('/dashboard/log-food-search')}>
                  <Text className="text-xs font-bold text-orange-600">Review</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View className="px-6 pt-4">
            <View className="relative overflow-hidden rounded-[24px] bg-slate-900 p-5">
              <View className="bg-primary/20 absolute -top-10 -right-10 h-40 w-40 rounded-full" />
              <View className="bg-info/10 absolute -bottom-10 -left-10 h-28 w-28 rounded-full" />
              <View className="relative z-10">
                <CaloriesGauge
                  progress={consumedKcal / goalKcal}
                  goal={goalKcal}
                  consumed={consumedKcal}
                  remaining={remainingKcal}
                />
                {isDayDataLoading ? (
                  <Text className="mt-2 text-center text-[10px] font-medium text-white/60">
                    Loading day summary...
                  </Text>
                ) : null}

                <View className="mt-4 flex w-full flex-row gap-7 border-t border-white/10 pt-4">
                  {macroProgress.map((macro) => (
                    <View key={macro.label} className="flex-1 gap-1">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[10px] font-medium text-slate-300">
                          {macro.label}
                        </Text>
                        <Text className="text-[10px] font-medium text-slate-300">
                          {macro.value}g
                        </Text>
                      </View>
                      <View className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(6, Math.min(100, macro.progress * 100))}%`,
                            backgroundColor: macro.color,
                          }}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View className="px-6 pt-6">
            <Text className="mb-3 text-sm font-bold">Quick Actions</Text>
            <View className="flex flex-row justify-around gap-2">
              <QuickAction
                label="Log Food"
                icon={Plus}
                iconWrapClass="bg-primary/10"
                iconClassName="text-primary"
                onPress={() => router.push('/dashboard/log-food-search')}
              />
              <QuickAction
                label="Saved"
                icon={Bookmark}
                iconWrapClass="bg-warning/10"
                iconClassName="text-warning"
                onPress={() => router.push('/dashboard/saved-foods')}
              />
              <QuickAction
                label="Custom"
                icon={Edit3}
                iconWrapClass="bg-info/10"
                iconClassName="text-info"
                onPress={() => router.push('/dashboard/add-custom-food')}
              />
              <QuickAction
                label="Scan"
                icon={QrCode}
                iconWrapClass="bg-accent"
                iconClassName="text-accent-foreground"
                onPress={() => router.push('/dashboard/scan-label')}
              />
            </View>
            <View className="bg-background-subtle border-border mt-5 self-center rounded-full border px-3 py-1.5">
              <View className="flex-row items-center gap-2">
                <Text className="text-muted-foreground text-[10px] font-medium">
                  Saved Foods: {savedFoodLimitLabel}
                </Text>
              </View>
            </View>
          </View>

          <View className="px-6 pt-7">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold">Today&apos;s Meals</Text>
              <Pressable onPress={() => router.push('/dashboard/log')}>
                <Text className="text-primary text-xs font-semibold">View All</Text>
              </Pressable>
            </View>

            {loggedFoodsData.length === 0 ? (
              <View className="bg-card border-border rounded-xl border p-4">
                <Text className="text-foreground text-sm font-semibold">No meals logged yet</Text>
                <Text className="text-muted-foreground mt-1 text-xs">
                  Start with breakfast, lunch, dinner, or snack to see today&apos;s timeline here.
                </Text>
                <Button
                  className="mt-3 h-10 rounded-full"
                  onPress={() => router.push('/dashboard/log-food-search')}>
                  <Text>Log First Food</Text>
                </Button>
              </View>
            ) : (
              <View className="gap-4">
                {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map((mealGroup) => {
                  const items = groupedMeals[mealGroup];
                  if (!items.length) return null;
                  return (
                    <View key={mealGroup}>
                      <Text className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                        {mealGroup}
                      </Text>
                      <View className="bg-card overflow-hidden rounded-xl shadow-sm">
                        {items.slice(0, 3).map((item, index) => (
                          <View
                            key={item.id}
                            className={`flex-row items-center px-3 py-3 ${index < items.length - 1 ? 'border-border border-b' : ''}`}>
                            <View className="bg-background-subtle mr-3 h-10 w-10 items-center justify-center rounded-lg">
                              <Text className="text-xl">{getFoodEmoji(item.foodName)}</Text>
                            </View>
                            <View className="min-w-0 flex-1">
                              <Text numberOfLines={1} className="text-foreground text-sm font-bold">
                                {item.foodName}
                              </Text>
                              <View className="mt-0.5 flex-row items-center gap-1">
                                <Icon as={Clock3} className="size-3 text-slate-400" />
                                <Text className="text-[10px] text-slate-400">{item.logTime}</Text>
                              </View>
                            </View>
                            <View className="items-end pr-2">
                              <Text className="text-foreground text-sm font-bold">
                                {formatNumberGrouped(item.totalKcal)}
                              </Text>
                              <Text className="text-[10px] text-slate-400">kcal</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View className="px-6 pt-7">
            <View className="flex-row gap-4">
              <View className="border-info/20 bg-info/10 flex-1 rounded-2xl border p-4 shadow-sm">
                <View className="mb-3 flex-row items-center gap-2">
                  <Icon as={Droplets} className="text-info size-4" />
                  <Text className="text-info text-sm font-bold">Hydration</Text>
                </View>
                <View className="mb-3 flex-row items-baseline gap-1">
                  <Text className="text-foreground text-2xl font-black">
                    {formatNumberGrouped(hydrationCurrentMl)}
                  </Text>
                  <Text className="text-muted-foreground text-xs">
                    / {formatNumberGrouped(hydrationTargetMl)}ml
                  </Text>
                </View>
                <View className="mb-3 flex-row justify-between px-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <View
                      key={index}
                      className={
                        index < hydrationFilled
                          ? 'bg-info h-8 w-2 rounded-full'
                          : 'bg-info/25 h-8 w-2 rounded-full'
                      }
                    />
                  ))}
                </View>
                <View className="items-end">
                  <Pressable
                    disabled={hydrationMutation.isPending}
                    onPress={() => setHydrationModalOpen(true)}
                    className="bg-info h-8 w-8 items-center justify-center rounded-full">
                    <Icon as={Plus} className="size-4 text-white" />
                  </Pressable>
                </View>
              </View>

              <View className="bg-card flex-1 rounded-2xl p-4 shadow-sm">
                <View className="mb-3 flex-row items-center gap-2">
                  <Icon as={TrendingDown} className="text-muted-foreground size-4" />
                  <Text className="text-muted-foreground text-sm font-bold">Weight</Text>
                </View>
                <View className="mb-2 flex-row items-baseline gap-1">
                  <Text className="text-foreground text-2xl font-black">
                    {selectedDaySummary?.weightKg ?? homeDashboard.data?.currentWeightKg ?? 0}
                  </Text>
                  <Text className="text-muted-foreground text-xs">kg</Text>
                </View>
                <View className="mb-2 flex-row items-center gap-1">
                  <Icon as={TrendingDown} className="text-success size-3" />
                  <Text className="text-success text-xs font-medium">
                    {homeDashboard.data?.weightDeltaKg ?? 0}kg
                  </Text>
                </View>
                <View className="flex-row items-end justify-between gap-2">
                  <Sparkline values={homeDashboard.data?.weightTrend ?? [0]} width={92} />
                  <Pressable
                    disabled={addWeightMutation.isPending}
                    onPress={() => setWeightModalOpen(true)}
                    className="bg-primary h-8 w-8 items-center justify-center rounded-full">
                    <Icon as={Plus} className="size-4 text-white" />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      <HydrationLogModal
        open={hydrationModalOpen}
        value={hydrationInput}
        unit={hydrationUnit}
        error={hydrationError}
        isSaving={hydrationMutation.isPending}
        onChangeUnit={(unit) => {
          setHydrationUnit(unit);
          setHydrationError(null);
        }}
        onChangeValue={(value) => {
          setHydrationInput(value);
          setHydrationError(null);
        }}
        onClose={() => {
          setHydrationModalOpen(false);
          setHydrationError(null);
        }}
        onSave={() => {
          void onSaveCustomHydration();
        }}
      />

      <WeightLogModal
        open={weightModalOpen}
        value={weightInput}
        isSaving={addWeightMutation.isPending}
        onChangeValue={setWeightInput}
        onClose={() => setWeightModalOpen(false)}
        onSave={(weightKg) => {
          void onSaveWeight(weightKg);
        }}
      />
    </>
  );
}

function HydrationLogModal({
  open,
  value,
  unit,
  error,
  isSaving,
  onChangeValue,
  onChangeUnit,
  onClose,
  onSave,
}: {
  open: boolean;
  value: string;
  unit: 'ml' | 'liters';
  error: string | null;
  isSaving: boolean;
  onChangeValue: (value: string) => void;
  onChangeUnit: (unit: 'ml' | 'liters') => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/35 px-5" onPress={onClose}>
        <Pressable
          className="bg-card w-full max-w-md rounded-[22px] p-5"
          onPress={(event) => event.stopPropagation()}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-foreground text-lg font-bold">Add Water</Text>
            <Pressable
              className="bg-muted h-9 w-9 items-center justify-center rounded-full"
              onPress={onClose}>
              <Icon as={X} className="text-foreground size-4" />
            </Pressable>
          </View>

          <View className="mb-4">
            <Text className="text-foreground mb-2 text-sm font-semibold">Amount</Text>
            <View className="relative justify-center">
              <Input
                value={value}
                onChangeText={onChangeValue}
                keyboardType="decimal-pad"
                placeholder={unit === 'liters' ? '0.5' : '350'}
                className="bg-input-bg h-12 rounded-xl pr-20"
              />
              <Text className="text-muted-foreground absolute right-4 text-sm font-medium">
                {unit === 'liters' ? 'L' : 'ml'}
              </Text>
            </View>
            {error ? <Text className="text-destructive mt-1 text-xs">{error}</Text> : null}
          </View>

          <View className="mb-5">
            <Text className="text-foreground mb-2 text-sm font-semibold">Measurement</Text>
            <View className="bg-background-subtle flex-row rounded-full p-1">
              {(['ml', 'liters'] as const).map((nextUnit) => (
                <Button
                  key={nextUnit}
                  variant={unit === nextUnit ? 'default' : 'ghost'}
                  className="h-10 flex-1 rounded-full"
                  onPress={() => onChangeUnit(nextUnit)}>
                  <Text
                    className={
                      unit === nextUnit
                        ? 'text-primary-foreground font-semibold'
                        : 'text-muted-foreground font-semibold'
                    }>
                    {nextUnit === 'liters' ? 'Liters' : 'ml'}
                  </Text>
                </Button>
              ))}
            </View>
          </View>

          <View className="flex-row gap-3">
            <Button variant="outline" className="h-12 flex-1 rounded-full" onPress={onClose}>
              <Text className="font-semibold">Cancel</Text>
            </Button>
            <Button
              variant="default"
              className="h-12 flex-1 rounded-full"
              disabled={isSaving}
              onPress={onSave}>
              <Text className="text-primary-foreground font-semibold">
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

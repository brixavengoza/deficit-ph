import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { getFoodEmoji } from '@/lib/food-emoji';
import { formatCompactNumber, formatNumberGrouped } from '@/lib/number-format';
import { useAddHydrationMutation, useFoodLogsQuery, useFoodsQuery, useHomeDashboardQuery } from '@/hooks/use-trackk-query';
import { FREE_SAVED_FOODS_LIMIT, useSavedFoodStore } from '@/stores/use-saved-food-store';
import { router, Stack } from 'expo-router';
import {
  Bell,
  Bookmark,
  Clock3,
  Droplets,
  Edit3,
  Lock,
  Plus,
  QrCode,
  TriangleAlert,
  TrendingDown,
} from 'lucide-react-native';
import React from 'react';
import {
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';

type DayPill = {
  key: string;
  isoDate: string;
  label: string;
  date: number;
  pending?: boolean;
};

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
      <Text className="text-[10px] font-bold text-slate-600">{label}</Text>
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
  const loggedFoods = useFoodLogsQuery();
  const savedFoods = useFoodsQuery();
  const isPremiumUser = useSavedFoodStore((state) => state.isPremiumUser);
  const homeDashboard = useHomeDashboardQuery(isPremiumUser ? 30 : 7);
  const hydrationMutation = useAddHydrationMutation();
  const dateStripRef = React.useRef<ScrollView>(null);
  const dayHistoryCount = isPremiumUser ? 30 : 7;
  const [hydrationTodayMl, setHydrationTodayMl] = React.useState<number | null>(null);
  const loggedFoodsData = loggedFoods.data ?? [];

  const dayStrip = React.useMemo(
    () => buildDayStrip(dayHistoryCount, loggedFoodsData.length > 0),
    [dayHistoryCount, loggedFoodsData.length]
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
  const selectedDaySummary = React.useMemo(() => {
    if (!homeDashboard.data) return null;
    return (
      homeDashboard.data.days.find((day) => day.localDay === (selectedDayIsoDate ?? latestDayIsoDate)) ??
      null
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

  const savedFoodLimitLabel = isPremiumUser
    ? 'Unlimited'
    : `${savedFoods.data?.length ?? 0}/${FREE_SAVED_FOODS_LIMIT}`;

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
      : selectedDaySummary?.hydrationMl ?? 0;
  const hydrationTargetMl = homeDashboard.data?.hydrationTargetMl ?? 2500;
  const hydrationRatio = hydrationCurrentMl / hydrationTargetMl;
  const hydrationFilled = Math.max(1, Math.round(hydrationRatio * 5));

  const onQuickAddWater = React.useCallback(async () => {
    if (hydrationMutation.isPending) return;
    try {
      await hydrationMutation.mutateAsync(250);
      setHydrationTodayMl((previous) => (previous ?? 0) + 250);
    } catch (error) {
      console.error('[DashboardScreen.addHydrationLog]', error);
    }
  }, [hydrationMutation]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="bg-background flex-1">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-36">
          <View className="bg-background/80 px-6 pt-3 pb-2">
            <View className="mb-5 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="border-primary h-12 w-12 items-center justify-center rounded-full border-2 bg-slate-200">
                  <Text className="text-sm font-bold">AM</Text>
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
              <Pressable className="bg-card relative h-10 w-10 items-center justify-center rounded-full border border-slate-100">
                <Icon as={Bell} className="size-5 text-slate-700" />
                <View className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
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
                        : 'text-xs font-medium text-slate-400'
                    }>
                    {day.label}
                  </Text>
                  <Text
                    className={
                      day.isoDate === (selectedDayIsoDate ?? latestDayIsoDate)
                        ? 'text-lg font-bold text-white'
                        : 'text-lg font-bold text-slate-700'
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
            {!isPremiumUser ? (
              <View className="mt-2 flex-row items-center justify-center gap-1">
                <Icon as={Lock} className="size-3.5 text-slate-500" />
                <Text className="text-muted-foreground text-[10px]">
                  Upgrade to Premium to view 30-day history
                </Text>
              </View>
            ) : null}
          </View>

          {loggedFoodsData.length > 0 ? (
            <View className="px-6 pt-2 pb-1">
              <View className="flex-row items-center justify-between rounded-xl border border-orange-100 bg-orange-50 px-3 py-3">
                <View className="flex-row items-center gap-2">
                  <Icon as={TriangleAlert} className="size-4 text-orange-500" />
                  <Text className="text-xs font-semibold text-orange-700">
                    Complete Logging ({loggedFoodsData.length} item{loggedFoodsData.length === 1 ? '' : 's'}
                    )
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
              <View className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-blue-500/10" />
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
                iconWrapClass="bg-orange-50"
                iconClassName="text-orange-500"
                onPress={() => router.push('/dashboard/saved-foods')}
              />
              <QuickAction
                label="Custom"
                icon={Edit3}
                iconWrapClass="bg-blue-50"
                iconClassName="text-blue-500"
                onPress={() => router.push('/dashboard/add-custom-food')}
              />
              <QuickAction
                label="Scan"
                icon={QrCode}
                iconWrapClass="bg-purple-50"
                iconClassName="text-purple-500"
                disabled
              />
            </View>
            <View className="bg-background-subtle border-border mt-5 self-center rounded-full border px-3 py-1.5">
              <View className="flex-row items-center gap-2">
                <Icon as={Lock} className="size-3.5 text-slate-500" />
                <Text className="text-[10px] font-medium text-slate-500">
                  Saved Foods: {savedFoodLimitLabel}
                </Text>
                {!isPremiumUser ? (
                  <>
                    <View className="h-3 w-px bg-slate-300" />
                    <Pressable onPress={() => router.push('/dashboard/subscription-plan')}>
                      <Text className="text-primary text-[10px] font-bold">Go Unlimited</Text>
                    </Pressable>
                  </>
                ) : null}
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
                            className={`flex-row items-center px-3 py-3 ${index < items.length - 1 ? 'border-b border-slate-100' : ''}`}>
                            <View className="bg-background-subtle mr-3 h-10 w-10 items-center justify-center rounded-lg">
                              <Text className="text-xl">{getFoodEmoji(item.foodName)}</Text>
                            </View>
                            <View className="min-w-0 flex-1">
                              <Text numberOfLines={1} className="text-sm font-bold text-slate-800">
                                {item.foodName}
                              </Text>
                              <View className="mt-0.5 flex-row items-center gap-1">
                                <Icon as={Clock3} className="size-3 text-slate-400" />
                                <Text className="text-[10px] text-slate-400">{item.logTime}</Text>
                              </View>
                            </View>
                            <View className="items-end pr-2">
                              <Text className="text-sm font-bold text-slate-900">
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
              <View className="flex-1 rounded-2xl bg-sky-50 p-4 shadow-sm">
                <View className="mb-3 flex-row items-center gap-2">
                  <Icon as={Droplets} className="size-4 text-sky-600" />
                  <Text className="text-sm font-bold text-sky-600">Hydration</Text>
                </View>
                <View className="mb-3 flex-row items-baseline gap-1">
                  <Text className="text-2xl font-black text-slate-900">
                    {formatNumberGrouped(hydrationCurrentMl)}
                  </Text>
                  <Text className="text-xs text-slate-500">
                    / {formatNumberGrouped(hydrationTargetMl)}ml
                  </Text>
                </View>
                <View className="mb-3 flex-row justify-between px-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <View
                      key={index}
                      className={
                        index < hydrationFilled
                          ? 'h-8 w-2 rounded-full bg-sky-500'
                          : 'h-8 w-2 rounded-full bg-sky-200'
                      }
                    />
                  ))}
                </View>
                <Pressable
                  disabled={hydrationMutation.isPending}
                  onPress={() => {
                    void onQuickAddWater();
                  }}
                  className="ml-auto h-8 w-8 items-center justify-center rounded-full bg-sky-500">
                  <Icon as={Plus} className="size-4 text-white" />
                </Pressable>
              </View>

              <View className="bg-card flex-1 rounded-2xl p-4 shadow-sm">
                <View className="mb-3 flex-row items-center gap-2">
                  <Icon as={TrendingDown} className="size-4 text-slate-500" />
                  <Text className="text-sm font-bold text-slate-500">Weight</Text>
                </View>
                <View className="mb-2 flex-row items-baseline gap-1">
                  <Text className="text-2xl font-black text-slate-900">
                    {selectedDaySummary?.weightKg ?? homeDashboard.data?.currentWeightKg ?? 0}
                  </Text>
                  <Text className="text-xs text-slate-500">kg</Text>
                </View>
                <View className="mb-2 flex-row items-center gap-1">
                  <Icon as={TrendingDown} className="size-3 text-green-500" />
                  <Text className="text-xs font-medium text-green-600">
                    {homeDashboard.data?.weightDeltaKg ?? 0}kg
                  </Text>
                </View>
                <Sparkline values={homeDashboard.data?.weightTrend ?? [0]} width={120} />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

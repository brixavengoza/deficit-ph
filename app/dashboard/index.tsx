import { WeightLogModal } from '@/components/progress/weight-log-modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import {
  useAddHydrationMutation,
  useAddWeightMutation,
  useFoodLogsForDayQuery,
  useHomeDashboardQuery,
} from '@/hooks/use-trackk-query';
import { getNutritionScanCapability } from '@/lib/ai-capability';
import { getFoodEmoji } from '@/lib/food-emoji';
import { formatNumberGrouped } from '@/lib/number-format';
import { targetProgressPct } from '@/utils/calorie-targets';
import { router, Stack } from 'expo-router';
import {
  BookOpenText,
  Droplets,
  Edit3,
  PencilLine,
  Plus,
  Scale,
  ScanLine,
  Search,
  Utensils,
} from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

const DASHBOARD_HISTORY_DAYS = 7;
const CALORIE_RING_SIZE = 164;
const CALORIE_RING_STROKE = 13;
const CALORIE_RING_RADIUS = (CALORIE_RING_SIZE - CALORIE_RING_STROKE) / 2;
const CALORIE_RING_CIRCUMFERENCE = 2 * Math.PI * CALORIE_RING_RADIUS;

type PromptTone = 'primary' | 'info' | 'warning';

function getLocalDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayLabel() {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());
}

function QuickAction({
  label,
  icon,
  tone = 'primary',
  onPress,
}: {
  label: string;
  icon: typeof Search;
  tone?: PromptTone;
  onPress: () => void;
}) {
  const toneClass =
    tone === 'info' ? 'bg-info/10' : tone === 'warning' ? 'bg-warning/10' : 'bg-primary/10';
  const iconClass =
    tone === 'info' ? 'text-info' : tone === 'warning' ? 'text-warning' : 'text-primary';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}
      className="bg-card min-h-20 flex-1 items-center justify-center gap-2 rounded-md px-2 py-3">
      <View className={`h-9 w-9 items-center justify-center rounded-md ${toneClass}`}>
        <Icon as={icon} className={`size-5 ${iconClass}`} />
      </View>
      <Text className="text-foreground text-center text-xs font-bold">{label}</Text>
    </Pressable>
  );
}

function MacroTotal({
  isDarkMode,
  label,
  target,
  tone,
  value,
}: {
  isDarkMode: boolean;
  label: string;
  target: number;
  tone: PromptTone;
  value: number;
}) {
  const barClass = tone === 'info' ? 'bg-info' : tone === 'warning' ? 'bg-warning' : 'bg-primary';
  const labelClass = isDarkMode ? 'text-white/65' : 'text-muted-foreground';
  const valueClass = isDarkMode ? 'text-white' : 'text-foreground';
  const mutedClass = isDarkMode ? 'text-white/45' : 'text-muted-foreground';
  const tileClass = isDarkMode ? 'bg-white/10' : 'bg-card/70';
  const trackClass = isDarkMode ? 'bg-white/10' : 'bg-primary/15';

  // Targets always reach the dashboard, but degrade to grams-only if one is missing/zero.
  const hasTarget = target > 0;
  const progress = targetProgressPct(value, target);

  return (
    <View className={`${tileClass} flex-1 rounded-md px-3 py-3`}>
      <View className="flex-row items-center gap-1.5">
        <View className={`h-2 w-2 rounded-full ${barClass}`} />
        <Text className={`${labelClass} text-[10px] font-bold uppercase`}>{label}</Text>
      </View>
      <View className="mt-1 flex-row items-baseline gap-0.5">
        <Text className={`${valueClass} text-base font-black`}>{formatNumberGrouped(value)}</Text>
        <Text className={`${mutedClass} text-[11px] font-semibold`}>
          {hasTarget ? `/ ${formatNumberGrouped(target)}g` : 'g'}
        </Text>
      </View>
      {hasTarget ? (
        <View className={`${trackClass} mt-2 h-1.5 overflow-hidden rounded-full`}>
          <View className={`${barClass} h-full rounded-full`} style={{ width: `${progress}%` }} />
        </View>
      ) : null}
    </View>
  );
}

function CalorieHero({
  calorieProgress,
  consumedKcal,
  goalKcal,
  isDarkMode,
  macroTotals,
  remainingKcal,
}: {
  calorieProgress: number;
  consumedKcal: number;
  goalKcal: number;
  isDarkMode: boolean;
  remainingKcal: number;
  macroTotals: { label: string; target: number; tone: PromptTone; value: number }[];
}) {
  const ringProgress = Math.max(0, Math.min(1, calorieProgress / 100));
  const strokeDashoffset = CALORIE_RING_CIRCUMFERENCE * (1 - ringProgress);
  // Hard-hide the scan shortcut on devices where the scanner can't run (never show-then-fail).
  const scannerAvailable = React.useMemo(() => getNutritionScanCapability().tier !== 'unavailable', []);
  const heroClass = isDarkMode ? 'bg-surface-dark' : 'bg-primary/10';
  const titleClass = isDarkMode ? 'text-primary' : 'text-primary-dark';
  const valueClass = isDarkMode ? 'text-white' : 'text-foreground';
  const mutedClass = isDarkMode ? 'text-white/65' : 'text-text-secondary';
  const quietClass = isDarkMode ? 'text-white/50' : 'text-muted-foreground';
  const trackColor = isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(33,196,93,0.16)';

  return (
    <View className={`overflow-hidden rounded-lg p-5 ${heroClass}`}>
      <View className="flex-row items-center justify-between gap-4">
        <View className="min-w-0 flex-1">
          <Text className={`${titleClass} text-xs font-extrabold tracking-wider uppercase`}>
            Today&apos;s Calories
          </Text>
          <Text className={`${valueClass} mt-2 text-4xl font-black tracking-tight`}>
            {formatNumberGrouped(remainingKcal)}
          </Text>
          <Text className={`${mutedClass} mt-0.5 text-sm font-semibold`}>kcal remaining</Text>
          <View className="mt-5 flex-row gap-3">
            <View>
              <Text className={`${quietClass} text-[10px] font-bold uppercase`}>Eaten</Text>
              <Text className={`${valueClass} text-base font-extrabold`}>
                {formatNumberGrouped(consumedKcal)}
              </Text>
            </View>
            <View className={isDarkMode ? 'h-9 w-px bg-white/10' : 'bg-primary/15 h-9 w-px'} />
            <View>
              <Text className={`${quietClass} text-[10px] font-bold uppercase`}>Goal</Text>
              <Text className={`${valueClass} text-base font-extrabold`}>
                {formatNumberGrouped(goalKcal)}
              </Text>
            </View>
          </View>
        </View>

        <View className="h-[164px] w-[164px] items-center justify-center">
          <Svg width={CALORIE_RING_SIZE} height={CALORIE_RING_SIZE}>
            <Circle
              cx={CALORIE_RING_SIZE / 2}
              cy={CALORIE_RING_SIZE / 2}
              r={CALORIE_RING_RADIUS}
              stroke={trackColor}
              strokeWidth={CALORIE_RING_STROKE}
              fill="transparent"
            />
            <Circle
              cx={CALORIE_RING_SIZE / 2}
              cy={CALORIE_RING_SIZE / 2}
              r={CALORIE_RING_RADIUS}
              stroke="#7ea56b"
              strokeWidth={CALORIE_RING_STROKE}
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={`${CALORIE_RING_CIRCUMFERENCE} ${CALORIE_RING_CIRCUMFERENCE}`}
              strokeDashoffset={strokeDashoffset}
              rotation="-90"
              originX={CALORIE_RING_SIZE / 2}
              originY={CALORIE_RING_SIZE / 2}
            />
          </Svg>
          <View className="absolute items-center">
            <Text className={`${valueClass} text-2xl font-black`}>
              {Math.round(calorieProgress)}%
            </Text>
            <Text className={`${quietClass} text-[10px] font-bold uppercase`}>used</Text>
          </View>
        </View>
      </View>

      <View className="mt-5 flex-row gap-2">
        {macroTotals.map((macro) => (
          <MacroTotal key={macro.label} isDarkMode={isDarkMode} {...macro} />
        ))}
      </View>

      <View className="mt-5 flex-row gap-2">
        <Button
          size="lg"
          className="h-13 flex-1 rounded-md"
          onPress={() => router.push('/dashboard/log-food-search')}>
          <Icon as={Plus} className="text-primary-foreground size-5" />
          <Text className="text-primary-foreground text-base font-extrabold">Log Food</Text>
        </Button>
        {scannerAvailable ? (
          <Button
            size="lg"
            variant="outline"
            className="border-primary/40 h-13 rounded-md px-4"
            accessibilityLabel="Scan food or nutrition label"
            onPress={() => router.push('/dashboard/scan-label')}>
            <Icon as={ScanLine} className="text-primary size-5" />
            <Text className="text-primary text-base font-extrabold">Scan</Text>
          </Button>
        ) : null}
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const todayKey = getLocalDayKey();
  const todayFoodsQuery = useFoodLogsForDayQuery(todayKey);
  const homeDashboard = useHomeDashboardQuery(DASHBOARD_HISTORY_DAYS);
  const hydrationMutation = useAddHydrationMutation();
  const addWeightMutation = useAddWeightMutation();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [hydrationModalOpen, setHydrationModalOpen] = React.useState(false);
  const [hydrationInput, setHydrationInput] = React.useState('');
  const [hydrationUnit, setHydrationUnit] = React.useState<'ml' | 'liters'>('ml');
  const [hydrationError, setHydrationError] = React.useState<string | null>(null);
  const [hydrationTodayMl, setHydrationTodayMl] = React.useState<number | null>(null);
  const [weightModalOpen, setWeightModalOpen] = React.useState(false);
  const [weightInput, setWeightInput] = React.useState('');

  const todayFoods = todayFoodsQuery.data ?? [];
  const todaySummary = React.useMemo(() => {
    if (!homeDashboard.data) return null;
    return homeDashboard.data.days.find((day) => day.localDay === todayKey) ?? null;
  }, [homeDashboard.data, todayKey]);

  React.useEffect(() => {
    if (!todaySummary) return;
    setHydrationTodayMl(todaySummary.hydrationMl);
  }, [todaySummary]);

  React.useEffect(() => {
    const currentWeight = homeDashboard.data?.currentWeightKg;
    if (currentWeight == null || currentWeight <= 0) return;
    setWeightInput(String(currentWeight));
  }, [homeDashboard.data?.currentWeightKg]);

  const goalKcal = homeDashboard.data?.goalKcal ?? 2000;
  const consumedKcal = todaySummary?.totalKcal ?? 0;
  const remainingKcal = Math.max(0, goalKcal - consumedKcal);
  const calorieProgress = goalKcal > 0 ? Math.min(100, (consumedKcal / goalKcal) * 100) : 0;
  const hydrationCurrentMl = hydrationTodayMl ?? todaySummary?.hydrationMl ?? 0;
  const hydrationTargetMl = homeDashboard.data?.hydrationTargetMl ?? 2500;
  const currentWeightKg = todaySummary?.weightKg ?? homeDashboard.data?.currentWeightKg ?? null;

  const macroTotals = [
    {
      label: 'Protein',
      value: todaySummary?.proteinG ?? 0,
      target: homeDashboard.data?.proteinTargetG ?? 0,
      tone: 'primary' as const,
    },
    {
      label: 'Carbs',
      value: todaySummary?.carbsG ?? 0,
      target: homeDashboard.data?.carbsTargetG ?? 0,
      tone: 'info' as const,
    },
    {
      label: 'Fat',
      value: todaySummary?.fatG ?? 0,
      target: homeDashboard.data?.fatTargetG ?? 0,
      tone: 'warning' as const,
    },
  ];

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([todayFoodsQuery.refetch(), homeDashboard.refetch()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [homeDashboard, todayFoodsQuery]);

  const onAddWater = React.useCallback(
    async (volumeMl: number) => {
      if (hydrationMutation.isPending) return;
      if (!Number.isFinite(volumeMl) || volumeMl <= 0) return;

      try {
        setHydrationError(null);
        const roundedVolume = Math.round(volumeMl);
        await hydrationMutation.mutateAsync(roundedVolume);
        setHydrationTodayMl((previous) => (previous ?? hydrationCurrentMl) + roundedVolume);
        setHydrationModalOpen(false);
      } catch (error) {
        setHydrationError('Unable to save water. Please try again.');
        console.error('[DashboardScreen.addHydrationLog]', error);
      }
    },
    [hydrationCurrentMl, hydrationMutation]
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

  const openHydrationModal = React.useCallback(() => {
    setHydrationInput('');
    setHydrationError(null);
    setHydrationModalOpen(true);
  }, []);

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

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="bg-background flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 144 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#7ea56b"
              colors={['#7ea56b']}
            />
          }>
          <View className="gap-5 px-5">
            <View className="flex-row items-center justify-between">
              <View className="min-w-0 flex-1">
                <Text className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  {getTodayLabel()}
                </Text>
                <Text className="text-foreground mt-1 text-2xl font-black tracking-tight">
                  Howdy, {homeDashboard.data?.userName ?? 'Trackk User'}
                </Text>
              </View>
              <Button
                variant="ghost"
                size="icon"
                className="bg-card h-11 w-11 rounded-md"
                onPress={() => router.push('/dashboard/log')}>
                <Icon as={BookOpenText} className="text-foreground size-5" />
              </Button>
            </View>

            <CalorieHero
              calorieProgress={calorieProgress}
              consumedKcal={consumedKcal}
              goalKcal={goalKcal}
              isDarkMode={isDarkMode}
              macroTotals={macroTotals}
              remainingKcal={remainingKcal}
            />

            <View>
              <Text className="mb-3 px-1 text-base font-extrabold">Quick Actions</Text>
              <View className="flex-row gap-2">
                <QuickAction
                  label="Add Water"
                  icon={Droplets}
                  tone="info"
                  onPress={openHydrationModal}
                />
                <QuickAction
                  label="Log Weight"
                  icon={Scale}
                  tone="warning"
                  onPress={() => setWeightModalOpen(true)}
                />
                <QuickAction
                  label="Custom Food"
                  icon={PencilLine}
                  onPress={() => router.push('/dashboard/add-custom-food')}
                />
              </View>
            </View>

            <View>
              <View className="mb-3 flex-row items-center justify-between px-1">
                <Text className="text-lg font-black">Today&apos;s Meals</Text>
                <Pressable onPress={() => router.push('/dashboard/log')}>
                  <Text className="text-primary text-xs font-extrabold">History</Text>
                </Pressable>
              </View>

              {todayFoods.length === 0 ? (
                <View className="bg-card rounded-md p-4">
                  <View className="bg-primary/10 mb-3 h-10 w-10 items-center justify-center rounded-md">
                    <Icon as={Utensils} className="text-primary size-5" />
                  </View>
                  <Text className="text-foreground text-base font-black">No food logged yet</Text>
                  <Text className="text-muted-foreground mt-1 text-sm leading-5">
                    Start with one meal. Search, enter the amount, then tap Log Food.
                  </Text>
                  <Button
                    className="mt-4 h-11 rounded-md"
                    onPress={() => router.push('/dashboard/log-food-search')}>
                    <Text className="text-primary-foreground font-bold">Log First Food</Text>
                  </Button>
                </View>
              ) : (
                <View className="gap-2">
                  {todayFoods.map((item) => (
                    <View
                      key={item.id}
                      className="bg-card flex-row items-center gap-3 rounded-md px-3 py-3">
                      <View className="bg-primary/10 h-10 w-10 items-center justify-center rounded-md">
                        <Text className="text-xl">{getFoodEmoji(item.foodName)}</Text>
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text numberOfLines={1} className="text-foreground text-sm font-black">
                          {item.foodName}
                        </Text>
                        <Text className="text-muted-foreground mt-0.5 text-xs">
                          {item.quantity} {item.unit} • {item.meal} • {item.logTime}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-foreground text-sm font-black">
                          {formatNumberGrouped(item.totalKcal)}
                        </Text>
                        <Text className="text-muted-foreground text-[10px]">kcal</Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${item.foodName}`}
                        onPress={() =>
                          router.push({
                            pathname: '/dashboard/add-food',
                            params: { entryId: item.id },
                          })
                        }
                        className="bg-background-subtle h-9 w-9 items-center justify-center rounded-md">
                        <Icon as={Edit3} className="text-foreground size-4" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View className="flex-row gap-3">
              <Pressable
                onPress={openHydrationModal}
                style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}
                className="bg-info/10 flex-1 rounded-md p-4">
                <View className="mb-2 flex-row items-center justify-between gap-2">
                  <View className="flex-row items-center gap-2">
                    <Icon as={Droplets} className="text-info size-4" />
                    <Text className="text-info text-sm font-black">Water</Text>
                  </View>
                  <View className="bg-info/15 h-7 w-7 items-center justify-center rounded-md">
                    <Icon as={Plus} className="text-info size-4" />
                  </View>
                </View>
                <Text className="text-foreground text-2xl font-black">
                  {formatNumberGrouped(hydrationCurrentMl)}
                </Text>
                <Text className="text-muted-foreground text-xs">
                  of {formatNumberGrouped(hydrationTargetMl)} ml
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setWeightModalOpen(true)}
                style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}
                className="bg-warning/10 flex-1 rounded-md p-4">
                <View className="mb-2 flex-row items-center justify-between gap-2">
                  <View className="flex-row items-center gap-2">
                    <Icon as={Scale} className="text-warning size-4" />
                    <Text className="text-warning text-sm font-black">Weight</Text>
                  </View>
                  <View className="bg-warning/15 h-7 w-7 items-center justify-center rounded-md">
                    <Icon as={Plus} className="text-warning size-4" />
                  </View>
                </View>
                <Text className="text-foreground text-2xl font-black">
                  {currentWeightKg ?? '--'}
                </Text>
                <Text className="text-muted-foreground text-xs">kg latest</Text>
              </Pressable>
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
          className="bg-card w-full max-w-md rounded-lg p-5"
          onPress={(event) => event.stopPropagation()}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-foreground text-lg font-black">Add Water</Text>
            <Pressable
              className="bg-muted h-9 w-9 items-center justify-center rounded-md"
              onPress={onClose}>
              <Text className="text-foreground text-lg font-bold">x</Text>
            </Pressable>
          </View>

          <View className="mb-5">
            <Text className="text-foreground mb-2 text-sm font-bold">Amount</Text>
            <View className="flex-row items-center gap-3">
              <View className="flex-1">
                <Input
                  value={value}
                  onChangeText={onChangeValue}
                  keyboardType="decimal-pad"
                  placeholder="Amount"
                  className="bg-input-bg h-12 rounded-md"
                />
              </View>
              <View className="bg-background-subtle h-12 w-36 flex-row rounded-md p-1">
                {(['ml', 'liters'] as const).map((nextUnit) => (
                  <Button
                    key={nextUnit}
                    variant={unit === nextUnit ? 'default' : 'ghost'}
                    className="h-full flex-1 rounded-lg px-2"
                    onPress={() => onChangeUnit(nextUnit)}>
                    <Text
                      className={
                        unit === nextUnit
                          ? 'text-primary-foreground text-xs font-bold'
                          : 'text-muted-foreground text-xs font-bold'
                      }>
                      {nextUnit === 'liters' ? 'L' : 'ml'}
                    </Text>
                  </Button>
                ))}
              </View>
            </View>
            {error ? <Text className="text-destructive mt-1 text-xs">{error}</Text> : null}
          </View>

          <View className="flex-row gap-3">
            <Button variant="outline" className="h-12 flex-1 rounded-md" onPress={onClose}>
              <Text className="font-bold">Cancel</Text>
            </Button>
            <Button
              variant="default"
              className="h-12 flex-1 rounded-md"
              disabled={isSaving}
              onPress={onSave}>
              <Text className="text-primary-foreground font-bold">
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

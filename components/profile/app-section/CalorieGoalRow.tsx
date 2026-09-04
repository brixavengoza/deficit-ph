import { zodResolver } from '@hookform/resolvers/zod';
import { Flame, X } from 'lucide-react-native';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { z } from 'zod';

import FieldError from '@/components/profile/field-error';
import StaticRow from '@/components/profile/static-row';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import {
  useMacroTargetsQuery,
  useRevertCalorieGoalMutation,
  useSetManualCalorieGoalMutation,
} from '@/hooks/use-trackk-query';
import { formatNumberGrouped } from '@/lib/number-format';
import { MAX_MANUAL_CALORIE_GOAL, MIN_MANUAL_CALORIE_GOAL } from '@/utils/calorie-targets';

const calorieSchema = z.object({
  dailyCalories: z
    .string()
    .trim()
    .min(1, 'Enter calories')
    .refine((value) => Number.isFinite(Number(value)), 'Enter a number')
    .refine(
      (value) => Number(value) >= MIN_MANUAL_CALORIE_GOAL,
      `At least ${MIN_MANUAL_CALORIE_GOAL} kcal for safety`
    )
    .refine(
      (value) => Number(value) <= MAX_MANUAL_CALORIE_GOAL,
      `Must be ${MAX_MANUAL_CALORIE_GOAL} or lower`
    ),
});

type CalorieFormValues = z.infer<typeof calorieSchema>;

export default function CalorieGoalRow() {
  const [open, setOpen] = React.useState(false);
  const macroTargets = useMacroTargetsQuery();
  const goalValue = macroTargets.data
    ? `${formatNumberGrouped(macroTargets.data.dailyCalorieGoal)} kcal`
    : '--';

  return (
    <>
      <StaticRow
        icon={Flame}
        iconWrapClass="bg-primary/10"
        iconClassName="text-primary"
        label="Calorie Goal"
        value={goalValue}
        onPress={() => setOpen(true)}
      />
      <CalorieGoalModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function CalorieGoalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const macroTargets = useMacroTargetsQuery();
  const setManual = useSetManualCalorieGoalMutation();
  const revert = useRevertCalorieGoalMutation();
  const data = macroTargets.data;

  const [draftMode, setDraftMode] = React.useState<'auto' | 'manual'>('auto');
  const [error, setError] = React.useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CalorieFormValues>({
    resolver: zodResolver(calorieSchema),
    mode: 'onChange',
    defaultValues: { dailyCalories: '' },
  });

  React.useEffect(() => {
    if (!open || !data) return;
    setDraftMode(data.calorieGoalMode);
    reset({ dailyCalories: String(data.dailyCalorieGoal) });
    setError(null);
  }, [open, data, reset]);

  const isBusy = setManual.isPending || revert.isPending;

  const handleSelectAuto = React.useCallback(async () => {
    setError(null);
    if (data?.calorieGoalMode === 'manual') {
      try {
        await revert.mutateAsync();
      } catch (revertError) {
        setError(revertError instanceof Error ? revertError.message : 'Failed to switch to Auto.');
        return;
      }
    }
    setDraftMode('auto');
  }, [data?.calorieGoalMode, revert]);

  const handleSelectManual = React.useCallback(() => {
    setError(null);
    setDraftMode('manual');
  }, []);

  const onSave = React.useCallback(
    async (values: CalorieFormValues) => {
      setError(null);
      try {
        await setManual.mutateAsync(values.dailyCalories);
        onClose();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Failed to save calorie goal.');
      }
    },
    [onClose, setManual]
  );

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable className="flex-1 items-center justify-center bg-black/35 px-5" onPress={onClose}>
          <Pressable
            className="bg-card max-h-[88%] w-full max-w-md rounded-lg p-5"
            onPress={(event) => event.stopPropagation()}>
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text className="text-foreground text-lg font-bold">Calorie Goal</Text>
                <Text className="text-muted-foreground mt-1 text-xs">
                  Auto base sa body stats mo, o set your own.
                </Text>
              </View>
              <Pressable
                className="bg-muted h-9 w-9 items-center justify-center rounded-md"
                onPress={onClose}>
                <Icon as={X} className="text-foreground size-4" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="gap-4 pb-2">
              <View className="bg-background-subtle flex-row rounded-md p-1">
                <Button
                  variant={draftMode === 'auto' ? 'default' : 'ghost'}
                  className="h-10 flex-1 rounded-md"
                  disabled={isBusy}
                  onPress={() => void handleSelectAuto()}>
                  <Text
                    className={
                      draftMode === 'auto'
                        ? 'text-primary-foreground font-semibold'
                        : 'text-muted-foreground font-semibold'
                    }>
                    Auto
                  </Text>
                </Button>
                <Button
                  variant={draftMode === 'manual' ? 'default' : 'ghost'}
                  className="h-10 flex-1 rounded-md"
                  disabled={isBusy}
                  onPress={handleSelectManual}>
                  <Text
                    className={
                      draftMode === 'manual'
                        ? 'text-primary-foreground font-semibold'
                        : 'text-muted-foreground font-semibold'
                    }>
                    Manual
                  </Text>
                </Button>
              </View>

              {draftMode === 'auto' ? (
                <View className="gap-3">
                  <View className="bg-background-subtle rounded-md p-4">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-muted-foreground text-sm font-medium">Daily goal</Text>
                      <Text className="text-foreground text-base font-black">
                        {formatNumberGrouped(data?.dailyCalorieGoal ?? 0)} kcal
                      </Text>
                    </View>
                  </View>
                  <Text className="text-muted-foreground text-xs leading-4">
                    Auto-computed from your age, height, weight, activity and goal, with a safety
                    floor so it never drops below a healthy minimum. Tap Manual to set your own.
                  </Text>
                </View>
              ) : (
                <View className="gap-4">
                  <View>
                    <Text className="text-foreground mb-2 text-sm font-semibold">
                      Daily calories
                    </Text>
                    <View className="relative justify-center">
                      <Controller
                        control={control}
                        name="dailyCalories"
                        render={({ field: { value, onChange, onBlur } }) => (
                          <Input
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            keyboardType="number-pad"
                            placeholder="2000"
                            className="bg-input-bg h-12 rounded-md pr-16"
                          />
                        )}
                      />
                      <Text className="text-muted-foreground absolute right-4 text-sm font-medium">
                        kcal
                      </Text>
                    </View>
                    <FieldError message={errors.dailyCalories?.message} />
                  </View>
                  <Text className="text-muted-foreground text-xs leading-4">
                    Minimum {formatNumberGrouped(MIN_MANUAL_CALORIE_GOAL)} kcal for safety. Auto
                    macros, if enabled, will adjust to match.
                  </Text>

                  <Button
                    variant="default"
                    className="h-12 rounded-md"
                    disabled={isBusy}
                    onPress={handleSubmit(onSave)}>
                    <Text className="text-primary-foreground font-semibold">
                      {setManual.isPending ? 'Saving...' : 'Save goal'}
                    </Text>
                  </Button>
                </View>
              )}

              {error ? (
                <View className="bg-destructive/10 rounded-md px-3 py-2">
                  <Text className="text-destructive text-sm">{error}</Text>
                </View>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

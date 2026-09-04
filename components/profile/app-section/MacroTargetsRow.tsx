import { zodResolver } from '@hookform/resolvers/zod';
import { Target, X } from 'lucide-react-native';
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
  useRevertMacroTargetsMutation,
  useSetCustomMacroTargetsMutation,
} from '@/hooks/use-trackk-query';
import { formatNumberGrouped } from '@/lib/number-format';
import { MAX_MACRO_TARGET_G, reconcileMacrosWithCalories } from '@/utils/calorie-targets';

const gramField = z
  .string()
  .trim()
  .min(1, 'Enter grams')
  .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, 'Must be 0 or higher')
  .refine((value) => Number(value) <= MAX_MACRO_TARGET_G, `Must be ${MAX_MACRO_TARGET_G} or lower`);

const macroSchema = z.object({
  proteinG: gramField,
  carbsG: gramField,
  fatG: gramField,
});

type MacroFormValues = z.infer<typeof macroSchema>;
type MacroFieldName = keyof MacroFormValues;

export default function MacroTargetsRow() {
  const [open, setOpen] = React.useState(false);
  const macroTargets = useMacroTargetsQuery();
  const modeLabel = macroTargets.data?.mode === 'custom' ? 'Custom' : 'Auto';

  return (
    <>
      <StaticRow
        icon={Target}
        iconWrapClass="bg-primary/10"
        iconClassName="text-primary"
        label="Macro Targets"
        value={modeLabel}
        onPress={() => setOpen(true)}
      />
      <MacroTargetsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function MacroTargetsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const macroTargets = useMacroTargetsQuery();
  const setCustom = useSetCustomMacroTargetsMutation();
  const revert = useRevertMacroTargetsMutation();
  const data = macroTargets.data;

  const [draftMode, setDraftMode] = React.useState<'auto' | 'custom'>('auto');
  const [error, setError] = React.useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<MacroFormValues>({
    resolver: zodResolver(macroSchema),
    mode: 'onChange',
    defaultValues: { proteinG: '', carbsG: '', fatG: '' },
  });

  // Seed the draft mode + form from persisted data when the modal opens or data changes.
  React.useEffect(() => {
    if (!open || !data) return;
    setDraftMode(data.mode);
    reset({
      proteinG: String(data.proteinTargetG),
      carbsG: String(data.carbsTargetG),
      fatG: String(data.fatTargetG),
    });
    setError(null);
  }, [open, data, reset]);

  const proteinG = Number(watch('proteinG')) || 0;
  const carbsG = Number(watch('carbsG')) || 0;
  const fatG = Number(watch('fatG')) || 0;
  const reconciliation = React.useMemo(
    () => reconcileMacrosWithCalories({ proteinG, carbsG, fatG }, data?.dailyCalorieGoal ?? 0),
    [proteinG, carbsG, fatG, data?.dailyCalorieGoal]
  );

  const isBusy = setCustom.isPending || revert.isPending;

  const handleSelectAuto = React.useCallback(async () => {
    setError(null);
    if (data?.mode === 'custom') {
      try {
        await revert.mutateAsync();
      } catch (revertError) {
        setError(revertError instanceof Error ? revertError.message : 'Failed to switch to Auto.');
        return;
      }
    }
    setDraftMode('auto');
  }, [data?.mode, revert]);

  const handleSelectCustom = React.useCallback(() => {
    setError(null);
    setDraftMode('custom');
  }, []);

  const onSave = React.useCallback(
    async (values: MacroFormValues) => {
      setError(null);
      try {
        await setCustom.mutateAsync({
          proteinG: values.proteinG,
          carbsG: values.carbsG,
          fatG: values.fatG,
        });
        onClose();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Failed to save macro targets.');
      }
    },
    [onClose, setCustom]
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
                <Text className="text-foreground text-lg font-bold">Macro Targets</Text>
                <Text className="text-muted-foreground mt-1 text-xs">
                  Optional. Calories are still the main focus.
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
                  variant={draftMode === 'custom' ? 'default' : 'ghost'}
                  className="h-10 flex-1 rounded-md"
                  disabled={isBusy}
                  onPress={handleSelectCustom}>
                  <Text
                    className={
                      draftMode === 'custom'
                        ? 'text-primary-foreground font-semibold'
                        : 'text-muted-foreground font-semibold'
                    }>
                    Custom
                  </Text>
                </Button>
              </View>

              {draftMode === 'auto' ? (
                <View className="gap-3">
                  <View className="bg-background-subtle rounded-md p-4">
                    <MacroReadRow label="Protein" value={data?.proteinTargetG ?? 0} />
                    <MacroReadRow label="Carbs" value={data?.carbsTargetG ?? 0} />
                    <MacroReadRow label="Fat" value={data?.fatTargetG ?? 0} />
                  </View>
                  <Text className="text-muted-foreground text-xs leading-4">
                    Auto-set from your calorie goal (30% protein / 40% carbs / 30% fat), and
                    adjusts when your weight or goal changes. Tap Custom to set your own grams.
                  </Text>
                </View>
              ) : (
                <View className="gap-4">
                  <GramInput
                    control={control}
                    name="proteinG"
                    label="Protein"
                    error={errors.proteinG?.message}
                  />
                  <GramInput
                    control={control}
                    name="carbsG"
                    label="Carbs"
                    error={errors.carbsG?.message}
                  />
                  <GramInput
                    control={control}
                    name="fatG"
                    label="Fat"
                    error={errors.fatG?.message}
                  />

                  <View className="bg-background-subtle rounded-md px-4 py-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-muted-foreground text-xs font-semibold">
                        From macros
                      </Text>
                      <Text className="text-foreground text-xs font-bold">
                        {formatNumberGrouped(reconciliation.macroCalories)} kcal
                      </Text>
                    </View>
                    <View className="mt-1 flex-row items-center justify-between">
                      <Text className="text-muted-foreground text-xs font-semibold">
                        Calorie goal
                      </Text>
                      <Text className="text-foreground text-xs font-bold">
                        {formatNumberGrouped(data?.dailyCalorieGoal ?? 0)} kcal
                      </Text>
                    </View>
                    {reconciliation.diverges ? (
                      <Text className="text-warning mt-2 text-xs leading-4">
                        Heads up: your macros add up to{' '}
                        {formatNumberGrouped(reconciliation.macroCalories)} kcal, which is some way
                        off your calorie goal. You can still save. This is just a guide. 💚
                      </Text>
                    ) : null}
                  </View>

                  <Button
                    variant="default"
                    className="h-12 rounded-md"
                    disabled={isBusy}
                    onPress={handleSubmit(onSave)}>
                    <Text className="text-primary-foreground font-semibold">
                      {setCustom.isPending ? 'Saving...' : 'Save targets'}
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

function GramInput({
  control,
  name,
  label,
  error,
}: {
  control: ReturnType<typeof useForm<MacroFormValues>>['control'];
  name: MacroFieldName;
  label: string;
  error?: string;
}) {
  return (
    <View>
      <Text className="text-foreground mb-2 text-sm font-semibold">{label}</Text>
      <View className="relative justify-center">
        <Controller
          control={control}
          name={name}
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="number-pad"
              placeholder="0"
              className="bg-input-bg h-12 rounded-md pr-12"
            />
          )}
        />
        <Text className="text-muted-foreground absolute right-4 text-sm font-medium">g</Text>
      </View>
      <FieldError message={error} />
    </View>
  );
}

function MacroReadRow({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-muted-foreground text-sm font-medium">{label}</Text>
      <Text className="text-foreground text-sm font-bold">{formatNumberGrouped(value)} g</Text>
    </View>
  );
}

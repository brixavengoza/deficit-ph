import { bodyMeasurementsSchema, BodyMeasurementsValues } from '@/components/schema/profile-schema';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import BaseCollapsibleRow from '../collapsible-row';
import { Ruler } from 'lucide-react-native';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import FieldError from '../field-error';
import { Button } from '@/components/ui/button';
import { useProfileBundleStore } from '@/stores/use-profile-bundle-store';
import { heightCmToDisplay, weightKgToDisplay } from '@/utils/units';

// The bundle stores canonical metric (cm/kg). Convert to the user's display units so the
// value shown under an "in"/"lb" label is actually Imperial — the save path converts back
// to metric, keeping the round-trip consistent (no corruption on re-save).
function toDisplay(metricValue: string, kind: 'height' | 'weight', units: 'Metric' | 'Imperial') {
  const num = Number(metricValue);
  if (!Number.isFinite(num) || num <= 0) return metricValue;
  const converted =
    kind === 'height' ? heightCmToDisplay(num, units) : weightKgToDisplay(num, units);
  return String(Math.round(converted * 10) / 10);
}

export default function BodyMeasurementsCollapsibleRow() {
  const [open, setOpen] = React.useState(false);
  const { units, height, weight, goalWeight } = useProfileBundleStore((state) => state.bundle);
  const saveBodyToDb = useProfileBundleStore((state) => state.saveBodyMeasurements);
  const form = useForm<BodyMeasurementsValues>({
    resolver: zodResolver(bodyMeasurementsSchema),
    mode: 'onChange',
    defaultValues: {
      height: '',
      weight: '',
      goalWeight: '',
    },
  });

  React.useEffect(() => {
    form.reset({
      height: toDisplay(height, 'height', units),
      weight: toDisplay(weight, 'weight', units),
      goalWeight: toDisplay(goalWeight, 'weight', units),
    });
  }, [form, goalWeight, height, units, weight]);

  const saveBodyMeasurements = async (values: BodyMeasurementsValues) => {
    await saveBodyToDb(values);
    form.reset(values);
  };

  return (
    <BaseCollapsibleRow
      icon={Ruler}
      iconWrapClass="bg-accent"
      iconClassName="text-accent-foreground"
      label="Body Measurements"
      open={open}
      onToggle={() => setOpen((prev) => !prev)}>
      <View className="mt-4 gap-3">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-foreground mb-1 text-xs font-semibold">
              Height ({units === 'Metric' ? 'cm' : 'in'})
            </Text>
            <Controller
              control={form.control}
              name="height"
              render={({ field }) => (
                <Input
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  keyboardType="decimal-pad"
                  className="bg-input-bg h-11 rounded-md"
                />
              )}
            />
            <FieldError message={form.formState.errors.height?.message} />
          </View>

          <View className="flex-1">
            <Text className="text-foreground mb-1 text-xs font-semibold">
              Weight ({units === 'Metric' ? 'kg' : 'lb'})
            </Text>
            <Controller
              control={form.control}
              name="weight"
              render={({ field }) => (
                <Input
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  keyboardType="decimal-pad"
                  className="bg-input-bg h-11 rounded-md"
                />
              )}
            />
            <FieldError message={form.formState.errors.weight?.message} />
          </View>
        </View>

        <View>
          <Text className="text-foreground mb-1 text-xs font-semibold">
            Goal Weight ({units === 'Metric' ? 'kg' : 'lb'})
          </Text>
          <Controller
            control={form.control}
            name="goalWeight"
            render={({ field }) => (
              <Input
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                keyboardType="decimal-pad"
                className="bg-input-bg h-11 rounded-md"
              />
            )}
          />
          <FieldError message={form.formState.errors.goalWeight?.message} />
        </View>

        <Button
          className="mt-1 h-10 rounded-md"
          disabled={!form.formState.isDirty || !form.formState.isValid}
          onPress={() => {
            void form.handleSubmit(saveBodyMeasurements)();
          }}>
          <Text className="text-primary-foreground font-semibold">Save Measurements</Text>
        </Button>
      </View>
    </BaseCollapsibleRow>
  );
}

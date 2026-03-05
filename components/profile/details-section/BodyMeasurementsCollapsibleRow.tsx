import { bodyMeasurementsSchema, BodyMeasurementsValues } from '@/components/schema/profile-schema';
import {
  PROFILE_APP_PREFERENCES_MOCK,
  PROFILE_BODY_MEASUREMENTS_MOCK,
  Units,
} from '@/lib/profile-settings-mock';
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

export default function BodyMeasurementsCollapsibleRow() {
  const [open, setOpen] = React.useState(false);
  const [units] = React.useState<Units>(PROFILE_APP_PREFERENCES_MOCK.units);
  const form = useForm<BodyMeasurementsValues>({
    resolver: zodResolver(bodyMeasurementsSchema),
    mode: 'onChange',
    defaultValues: PROFILE_BODY_MEASUREMENTS_MOCK,
  });

  const saveBodyMeasurements = (values: BodyMeasurementsValues) => {
    console.log('[profile body save]', values);
    form.reset(values);
  };

  return (
    <BaseCollapsibleRow
      icon={Ruler}
      iconWrapClass="bg-purple-100"
      iconClassName="text-purple-600"
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
                  className="bg-background-subtle h-11 rounded-xl border-transparent"
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
                  className="bg-background-subtle h-11 rounded-xl border-transparent"
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
                className="bg-background-subtle h-11 rounded-xl border-transparent"
              />
            )}
          />
          <FieldError message={form.formState.errors.goalWeight?.message} />
        </View>

        <Button
          className="mt-1 h-10 rounded-full"
          disabled={!form.formState.isDirty || !form.formState.isValid}
          onPress={form.handleSubmit(saveBodyMeasurements)}>
          <Text className="text-primary-foreground font-semibold">Save Measurements</Text>
        </Button>
      </View>
    </BaseCollapsibleRow>
  );
}

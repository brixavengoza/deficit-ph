import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { MAX_WEIGHT_LOG_KG, MIN_WEIGHT_LOG_KG } from '@/lib/local-data';
import { useProfileBundleStore } from '@/stores/use-profile-bundle-store';
import { LB_TO_KG } from '@/utils/units';
import { Check, CircleAlert, X } from 'lucide-react-native';
import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';

type WeightUnit = 'kg' | 'lbs';

type WeightLogModalProps = {
  open: boolean;
  value: string;
  previousKg?: number | null;
  isSaving?: boolean;
  onChangeValue: (value: string) => void;
  onClose: () => void;
  onSave: (weightKg: number) => void;
};

export function WeightLogModal({
  open,
  value,
  previousKg = null,
  isSaving = false,
  onChangeValue,
  onClose,
  onSave,
}: WeightLogModalProps) {
  // Default the toggle from the user's Units preference — an Imperial user typing 154
  // with a silent "kg" default would store 154 kg and (since weigh-ins now recompute the
  // calorie target) instantly corrupt their daily goal.
  const preferredUnits = useProfileBundleStore((state) => state.bundle.units);
  const [unit, setUnit] = React.useState<WeightUnit>(
    preferredUnits === 'Imperial' ? 'lbs' : 'kg'
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setUnit(preferredUnits === 'Imperial' ? 'lbs' : 'kg');
  }, [open, preferredUnits]);

  const handleChangeValue = (nextValue: string) => {
    onChangeValue(nextValue);
    setError(null);
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSave = () => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a valid weight.');
      return;
    }

    const weightKg = unit === 'lbs' ? parsed * LB_TO_KG : parsed;
    if (weightKg < MIN_WEIGHT_LOG_KG || weightKg > MAX_WEIGHT_LOG_KG) {
      const min = unit === 'lbs' ? Math.round(MIN_WEIGHT_LOG_KG / LB_TO_KG) : MIN_WEIGHT_LOG_KG;
      const max = unit === 'lbs' ? Math.round(MAX_WEIGHT_LOG_KG / LB_TO_KG) : MAX_WEIGHT_LOG_KG;
      setError(`Enter a weight between ${min} and ${max} ${unit}.`);
      return;
    }
    onSave(Number(weightKg.toFixed(2)));
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/35 px-5"
          onPress={handleClose}>
          <Pressable
            className="bg-card w-full max-w-md rounded-lg p-5"
            onPress={(e) => e.stopPropagation()}>
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-foreground text-lg font-bold">Log Today&apos;s Weight</Text>
              <Pressable
                className="bg-muted h-9 w-9 items-center justify-center rounded-md"
                onPress={handleClose}>
                <Icon as={X} className="text-foreground size-4" />
              </Pressable>
            </View>

            <View className="mb-4">
              <Text className="text-foreground mb-2 text-sm font-semibold">Today&apos;s Weight</Text>
              <View className="relative justify-center">
                <Input
                  value={value}
                  onChangeText={handleChangeValue}
                  keyboardType="decimal-pad"
                  placeholder={unit === 'lbs' ? '187' : '85.0'}
                  className="bg-input-bg h-12 rounded-md pr-16"
                />
                <Text className="text-muted-foreground absolute right-4 text-sm font-medium">
                  {unit}
                </Text>
              </View>
              {previousKg != null ? (
                <Text className="text-muted-foreground mt-1.5 text-xs">
                  Previous:{' '}
                  {unit === 'lbs' ? (previousKg / 0.45359237).toFixed(1) : previousKg.toFixed(1)}{' '}
                  {unit}
                </Text>
              ) : null}
              {error ? <Text className="text-destructive mt-1 text-xs">{error}</Text> : null}
            </View>

            <View className="mb-4">
              <Text className="text-foreground mb-2 text-sm font-semibold">Measurement</Text>
              <View className="bg-background-subtle flex-row rounded-md p-1">
                {(['kg', 'lbs'] as const).map((nextUnit) => (
                  <Button
                    key={nextUnit}
                    variant={unit === nextUnit ? 'default' : 'ghost'}
                    className="h-10 flex-1 rounded-md"
                    onPress={() => {
                      setUnit(nextUnit);
                      setError(null);
                    }}>
                    <Text
                      className={
                        unit === nextUnit
                          ? 'text-primary-foreground font-semibold'
                          : 'text-muted-foreground font-semibold'
                      }>
                      {nextUnit}
                    </Text>
                  </Button>
                ))}
              </View>
            </View>

            <View className="bg-warning/10 mb-5 rounded-md p-3">
              <View className="mb-1 flex-row items-center gap-2">
                <Icon as={CircleAlert} className="text-warning size-4" />
                <Text className="text-warning text-sm font-semibold">Best weigh-in timing</Text>
              </View>
              <Text className="text-warning text-sm leading-5">
                For the most consistent tracking, weigh yourself first thing in the morning after
                using the bathroom, before eating or drinking, and in similar clothing conditions.
              </Text>
            </View>

            <View className="flex-row gap-3">
              <Button variant="outline" className="h-12 flex-1 rounded-md" onPress={handleClose}>
                <Text className="font-semibold">Cancel</Text>
              </Button>
              <Button
                variant="default"
                className="h-12 flex-1 rounded-md"
                disabled={isSaving}
                onPress={handleSave}>
                <Icon as={Check} className="text-primary-foreground size-4" />
                <Text className="text-primary-foreground font-semibold">
                  {isSaving ? 'Saving...' : 'Save'}
                </Text>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { formatTimeLabelFromDate, parseTimeLabelToDate } from '@/utils/add-food-utils';
import React from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';

type AddFoodTimePickerModalProps = {
  open: boolean;
  date: Date;
  onClose: () => void;
  onConfirm: (date: Date) => void;
};

export function AddFoodTimePickerModal({
  open,
  date,
  onClose,
  onConfirm,
}: AddFoodTimePickerModalProps) {
  const [pickerDateDraft, setPickerDateDraft] = React.useState(date);
  const [timeDraft, setTimeDraft] = React.useState(formatTimeLabelFromDate(date));

  React.useEffect(() => {
    if (open) {
      setPickerDateDraft(date);
      setTimeDraft(formatTimeLabelFromDate(date));
    }
  }, [date, open]);

  const nativeDateTimePicker = getNativeDateTimePicker();

  if (nativeDateTimePicker) {
    const NativeDateTimePicker = nativeDateTimePicker;
    return (
      <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable
          onPress={onClose}
          className="flex-1 items-center justify-center bg-black/35 px-6">
          <Pressable
            onPress={(event) => event.stopPropagation()}
            className="bg-background w-full max-w-sm rounded-xl p-4">
            <Text className="text-foreground text-lg font-bold">Set Log Time</Text>
            <Text className="text-muted-foreground mt-1 text-sm">
              Pick the exact time for this food log.
            </Text>

            <View className="mt-3 items-center rounded-2xl bg-white dark:bg-slate-900">
              <NativeDateTimePicker
                value={pickerDateDraft}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selectedDate) => {
                  if (selectedDate) setPickerDateDraft(selectedDate);
                }}
              />
            </View>

            <View className="mt-3 flex-row gap-2">
              <Button variant="outline" className="flex-1" onPress={onClose}>
                <Text>Cancel</Text>
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onPress={() => onConfirm(pickerDateDraft)}>
                <Text>Save Time</Text>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 items-center justify-center bg-black/35 px-6">
        <Pressable
          onPress={(event) => event.stopPropagation()}
          className="bg-background w-full max-w-sm rounded-3xl p-4">
          <Text className="text-foreground text-lg font-bold">Set Log Time</Text>
          <Text className="text-muted-foreground mt-1 text-sm">
            Native time picker is unavailable in this build. Enter a time like `12:30 PM`.
          </Text>

          <Input
            value={timeDraft}
            onChangeText={(text) => setTimeDraft(text.toUpperCase())}
            placeholder="12:30 PM"
            autoCapitalize="characters"
            className="bg-background-subtle mt-4 h-14 rounded-2xl border-0 px-4 text-base font-medium"
            returnKeyType="done"
          />

          <View className="mt-3 flex-row gap-2">
            <Button variant="outline" className="flex-1" onPress={onClose}>
              <Text>Cancel</Text>
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onPress={() => onConfirm(parseTimeLabelToDate(timeDraft, date))}>
              <Text>Save Time</Text>
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type NativeDateTimePickerProps = {
  value: Date;
  mode: 'time';
  display?: 'default' | 'spinner' | 'clock' | 'compact' | 'inline';
  onChange: (event: unknown, date?: Date) => void;
};

type NativeDateTimePickerComponent = React.ComponentType<NativeDateTimePickerProps>;

let cachedNativeDateTimePicker: NativeDateTimePickerComponent | null | undefined;

function getNativeDateTimePicker(): NativeDateTimePickerComponent | null {
  if (cachedNativeDateTimePicker !== undefined) {
    return cachedNativeDateTimePicker;
  }

  try {
    const moduleValue = require('@react-native-community/datetimepicker') as { default?: unknown };
    cachedNativeDateTimePicker =
      typeof moduleValue?.default === 'function'
        ? (moduleValue.default as NativeDateTimePickerComponent)
        : null;
  } catch (error) {
    cachedNativeDateTimePicker = null;
    console.warn('[AddFoodTimePickerModal] Falling back to text time input.', error);
  }

  return cachedNativeDateTimePicker;
}

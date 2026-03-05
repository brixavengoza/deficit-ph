import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Check, CircleAlert, X } from 'lucide-react-native';
import { Modal, Pressable, View } from 'react-native';

type WeightLogModalProps = {
  open: boolean;
  value: string;
  onChangeValue: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export function WeightLogModal({
  open,
  value,
  onChangeValue,
  onClose,
  onSave,
}: WeightLogModalProps) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/35 px-5" onPress={onClose}>
        <Pressable className="w-full max-w-md rounded-[22px] bg-white p-5" onPress={(e) => e.stopPropagation()}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-foreground text-lg font-bold">Log Today&apos;s Weight</Text>
            <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-slate-100" onPress={onClose}>
              <Icon as={X} className="size-4 text-slate-700" />
            </Pressable>
          </View>

          <View className="mb-4">
            <Text className="text-foreground mb-2 text-sm font-semibold">Current Weight (kg)</Text>
            <Input
              value={value}
              onChangeText={onChangeValue}
              keyboardType="decimal-pad"
              placeholder="85.0"
              className="bg-background-subtle h-12 rounded-xl border-transparent"
            />
          </View>

          <View className="mb-5 rounded-xl bg-amber-50 p-3">
            <View className="mb-1 flex-row items-center gap-2">
              <Icon as={CircleAlert} className="text-amber-600 size-4" />
              <Text className="text-amber-700 text-sm font-semibold">Best weigh-in timing</Text>
            </View>
            <Text className="text-sm leading-5 text-amber-700/90">
              For the most consistent tracking, weigh yourself first thing in the morning after using
              the bathroom, before eating or drinking, and in similar clothing conditions.
            </Text>
          </View>

          <View className="flex-row gap-3">
            <Button variant="outline" className="h-12 flex-1 rounded-full" onPress={onClose}>
              <Text className="font-semibold">Cancel</Text>
            </Button>
            <Button variant="default" className="h-12 flex-1 rounded-full" onPress={onSave}>
              <Icon as={Check} className="text-primary-foreground size-4" />
              <Text className="text-primary-foreground font-semibold">Save</Text>
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}


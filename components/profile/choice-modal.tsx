import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Modal, Pressable, View } from 'react-native';

type ChoiceModalProps<T extends string> = {
  title: string;
  open: boolean;
  options: readonly T[] | T[];
  selected: T;
  onClose: () => void;
  onSelect: (value: T) => void;
};

export function ChoiceModal<T extends string>({
  title,
  open,
  options,
  selected,
  onClose,
  onSelect,
}: ChoiceModalProps<T>) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/35 px-5" onPress={onClose}>
        <Pressable
          className="w-full max-w-md rounded-[22px] bg-white p-5"
          onPress={(e) => e.stopPropagation()}>
          <Text className="text-foreground mb-4 text-lg font-bold">{title}</Text>
          <View className="gap-2">
            {options.map((option) => {
              const active = option === selected;
              return (
                <Pressable
                  key={option}
                  className={
                    active
                      ? 'border-primary bg-primary/10 rounded-xl border p-4'
                      : 'rounded-xl border border-transparent bg-slate-50 p-4'
                  }
                  onPress={() => {
                    onSelect(option);
                    onClose();
                  }}>
                  <Text
                    className={
                      active
                        ? 'text-primary text-center font-semibold'
                        : 'text-foreground text-center font-medium'
                    }>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Button variant="outline" className="mt-4 h-11 rounded-full" onPress={onClose}>
            <Text>Close</Text>
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { X } from 'lucide-react-native';
import { Modal, Pressable, View } from 'react-native';

type ChoiceModalProps<T extends string> = {
  title: string;
  open: boolean;
  options: readonly T[] | T[];
  selected: T;
  optionLayout?: 'list' | 'pills';
  optionDescriptions?: Partial<Record<T, string>>;
  showFooterClose?: boolean;
  onClose: () => void;
  onSelect: (value: T) => void;
};

export function ChoiceModal<T extends string>({
  title,
  open,
  options,
  selected,
  optionLayout = 'pills',
  optionDescriptions,
  showFooterClose = false,
  onClose,
  onSelect,
}: ChoiceModalProps<T>) {
  const isPillLayout = optionLayout === 'pills';
  const hasDescriptions = Boolean(optionDescriptions);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/35 px-5" onPress={onClose}>
        <Pressable
          className="bg-card w-full max-w-md rounded-lg p-5"
          onPress={(e) => e.stopPropagation()}>
          <View className="mb-4 flex-row items-center justify-between gap-3">
            <Text className="text-foreground flex-1 text-lg font-bold">{title}</Text>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onPress={onClose}>
              <Icon as={X} className="text-muted-foreground size-5" />
            </Button>
          </View>
          <View className={isPillLayout ? 'flex-row flex-wrap gap-2' : 'gap-2'}>
            {options.map((option) => {
              const active = option === selected;
              return (
                <Pressable
                  key={option}
                  className={
                    isPillLayout
                      ? active
                        ? hasDescriptions
                          ? 'bg-primary/10 max-w-48 rounded-md px-4 py-3'
                          : 'bg-primary/10 rounded-full px-5 py-3'
                        : hasDescriptions
                          ? 'bg-muted max-w-48 rounded-md px-4 py-3'
                          : 'bg-muted rounded-full px-5 py-3'
                      : active
                        ? 'bg-primary/10 rounded-md p-4'
                        : 'bg-muted rounded-md p-4'
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
                  {optionDescriptions?.[option] ? (
                    <Text className="text-muted-foreground mt-1 text-center text-xs leading-4">
                      {optionDescriptions[option]}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          {showFooterClose ? (
            <Button variant="outline" className="mt-4 h-11 rounded-md" onPress={onClose}>
              <Text>Close</Text>
            </Button>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

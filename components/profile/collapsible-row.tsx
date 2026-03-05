import { ChevronDown, LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Icon } from '../ui/icon';
import { Text } from '../ui/text';

export default function BaseCollapsibleRow({
  icon,
  iconWrapClass,
  iconClassName,
  label,
  open,
  onToggle,
  children,
}: {
  icon: LucideIcon;
  iconWrapClass: string;
  iconClassName: string;
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Pressable className="flex-row items-center justify-between px-4 py-3" onPress={onToggle}>
        <View className="flex-row items-center gap-3">
          <View className={`${iconWrapClass} h-8 w-8 items-center justify-center rounded-full`}>
            <Icon as={icon} className={`${iconClassName} size-4`} />
          </View>
          <Text className="text-sm font-medium text-slate-700">{label}</Text>
        </View>
        <Icon as={ChevronDown} className={open ? 'text-primary size-5' : 'size-5 text-slate-400'} />
      </Pressable>
      {open ? <View className="border-border border-t px-4 pb-4">{children}</View> : null}
    </View>
  );
}

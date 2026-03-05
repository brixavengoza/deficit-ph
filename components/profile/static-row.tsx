import { ChevronRight, LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Icon } from '../ui/icon';
import { Text } from '../ui/text';

export default function StaticRow({
  icon,
  iconWrapClass,
  iconClassName,
  label,
  value,
  onPress,
}: {
  icon: LucideIcon;
  iconWrapClass: string;
  iconClassName: string;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable className="flex-row items-center justify-between px-4 py-3" onPress={onPress}>
      <View className="flex-row items-center gap-3">
        <View className={`${iconWrapClass} h-8 w-8 items-center justify-center rounded-full`}>
          <Icon as={icon} className={`${iconClassName} size-4`} />
        </View>
        <Text className="text-sm font-medium text-slate-700">{label}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        {value ? <Text className="text-xs font-medium text-slate-400">{value}</Text> : null}
        <Icon as={ChevronRight} className="size-5 text-slate-400" />
      </View>
    </Pressable>
  );
}

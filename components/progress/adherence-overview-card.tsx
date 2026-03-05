import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Droplets, Flame, Scale } from 'lucide-react-native';
import { View } from 'react-native';

function ProgressRow({
  label,
  value,
  colorClass,
  icon,
  chipClass,
  barClass,
}: {
  label: string;
  value: number;
  colorClass: string;
  icon: any;
  chipClass: string;
  barClass: string;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className={`${chipClass} h-10 w-10 items-center justify-center rounded-full`}>
        <Icon as={icon} className={`${colorClass} size-4`} />
      </View>
      <View className="flex-1">
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-slate-900">{label}</Text>
          <Text className={`${colorClass} text-sm font-bold`}>{value}%</Text>
        </View>
        <View className="h-2 rounded-full bg-slate-100">
          <View className={`${barClass} h-2 rounded-full`} style={{ width: `${value}%` }} />
        </View>
      </View>
    </View>
  );
}

export function AdherenceOverviewCard() {
  return (
    <View className="mb-6 rounded-[22px] border border-slate-100 bg-white p-5 shadow-sm">
      <Text className="mb-4 text-base font-bold text-slate-900">Adherence Overview</Text>

      <View className="gap-4">
        <ProgressRow
          label="Calorie Goal Hit Rate"
          value={78}
          colorClass="text-primary"
          icon={Flame}
          chipClass="bg-primary/10"
          barClass="bg-primary"
        />
        <ProgressRow
          label="Hydration Target Hit Rate"
          value={64}
          colorClass="text-info"
          icon={Droplets}
          chipClass="bg-info/10"
          barClass="bg-info"
        />
        <ProgressRow
          label="Weigh-in Consistency"
          value={71}
          colorClass="text-slate-700"
          icon={Scale}
          chipClass="bg-slate-100"
          barClass="bg-slate-400"
        />
      </View>
    </View>
  );
}


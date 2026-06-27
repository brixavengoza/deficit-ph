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
          <Text className="text-foreground text-sm font-semibold">{label}</Text>
          <Text className={`${colorClass} text-sm font-bold`}>{value}%</Text>
        </View>
        <View className="bg-muted h-2 rounded-full">
          <View className={`${barClass} h-2 rounded-full`} style={{ width: `${value}%` }} />
        </View>
      </View>
    </View>
  );
}

export function AdherenceOverviewCard({
  calorieHitRate,
  hydrationHitRate,
  weighInConsistency,
}: {
  calorieHitRate: number;
  hydrationHitRate: number;
  weighInConsistency: number;
}) {
  return (
    <View className="bg-card mb-6 rounded-md p-5">
      <Text className="text-foreground mb-4 text-base font-bold">Adherence Overview</Text>

      <View className="gap-4">
        <ProgressRow
          label="Calorie Goal Hit Rate"
          value={calorieHitRate}
          colorClass="text-primary"
          icon={Flame}
          chipClass="bg-primary/10"
          barClass="bg-primary"
        />
        <ProgressRow
          label="Hydration Target Hit Rate"
          value={hydrationHitRate}
          colorClass="text-info"
          icon={Droplets}
          chipClass="bg-info/10"
          barClass="bg-info"
        />
        <ProgressRow
          label="Weigh-in Consistency"
          value={weighInConsistency}
          colorClass="text-muted-foreground"
          icon={Scale}
          chipClass="bg-muted"
          barClass="bg-muted-foreground"
        />
      </View>
    </View>
  );
}

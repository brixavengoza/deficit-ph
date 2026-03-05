import StaticRow from '@/components/profile/static-row';
import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';

export default function ProRow() {
  return (
    <StaticRow
      icon={Sparkles}
      iconWrapClass="bg-primary/20"
      iconClassName="text-primary"
      label="DeficitPH Pro"
      onPress={() => router.push('/dashboard/subscription-plan')}
    />
  );
}

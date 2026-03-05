import StaticRow from '@/components/profile/static-row';
import { router } from 'expo-router';
import { Shield } from 'lucide-react-native';

export default function PrivacyPolicyRow() {
  return (
    <StaticRow
      icon={Shield}
      iconWrapClass="bg-slate-100"
      iconClassName="text-slate-600"
      label="Privacy Policy"
      onPress={() => router.push('/dashboard/privacy-policy')}
    />
  );
}

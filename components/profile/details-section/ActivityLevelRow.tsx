import { ACTIVITY_LEVEL_OPTIONS, ActivityLevel } from '@/lib/profile-settings-options';
import React from 'react';
import StaticRow from '../static-row';
import { Activity } from 'lucide-react-native';
import { ChoiceModal } from '../choice-modal';
import { useProfileBundleStore } from '@/stores/use-profile-bundle-store';

const ACTIVITY_LEVEL_DESCRIPTIONS: Record<ActivityLevel, string> = {
  Sedentary: 'Little to no exercise',
  Light: 'Light exercise 1-3 days/week',
  Moderate: 'Moderate exercise 3-5 days/week',
  'Very Active': 'Hard exercise 6-7 days/week',
};

export default function ActivityLevelRow() {
  const [activeModal, setActiveModal] = React.useState<'activity' | null>(null);
  const activityLevel = useProfileBundleStore((state) => state.bundle.activityLevel);
  const saveActivityLevel = useProfileBundleStore((state) => state.saveActivityLevel);

  return (
    <>
      <StaticRow
        icon={Activity}
        iconWrapClass="bg-orange-100"
        iconClassName="text-orange-600"
        label="Activity Level"
        value={activityLevel}
        onPress={() => setActiveModal('activity')}
      />

      <ChoiceModal
        title="Activity Level"
        open={activeModal === 'activity'}
        selected={activityLevel}
        options={ACTIVITY_LEVEL_OPTIONS}
        optionLayout="list"
        optionDescriptions={ACTIVITY_LEVEL_DESCRIPTIONS}
        onClose={() => setActiveModal(null)}
        onSelect={(value) => {
          void saveActivityLevel(value);
        }}
      />
    </>
  );
}

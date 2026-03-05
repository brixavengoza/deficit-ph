import {
  ACTIVITY_LEVEL_OPTIONS,
  ActivityLevel,
  PROFILE_APP_PREFERENCES_MOCK,
} from '@/lib/profile-settings-mock';
import React from 'react';
import StaticRow from '../static-row';
import { Activity } from 'lucide-react-native';
import { ChoiceModal } from '../choice-modal';

export default function ActivityLevelRow() {
  const [activeModal, setActiveModal] = React.useState<'activity' | null>(null);
  const [activityLevel, setActivityLevel] = React.useState<ActivityLevel>(
    PROFILE_APP_PREFERENCES_MOCK.activityLevel
  );

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
        onClose={() => setActiveModal(null)}
        onSelect={(value) => setActivityLevel(value)}
      />
    </>
  );
}

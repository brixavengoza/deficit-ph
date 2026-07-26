import { GOAL_OPTIONS, type Goal } from '@/lib/profile-settings-options';
import { useProfileBundleStore } from '@/stores/use-profile-bundle-store';
import { Target } from 'lucide-react-native';
import React from 'react';
import { ChoiceModal } from '../choice-modal';
import StaticRow from '../static-row';

const GOAL_DESCRIPTIONS: Record<Goal, string> = {
  'Lose Weight': 'Calorie deficit to trim down',
  'Maintain Weight': 'Keep your current weight',
  'Gain Weight': 'Calorie surplus to build up',
};

export default function GoalRow() {
  const [open, setOpen] = React.useState(false);
  const goal = useProfileBundleStore((state) => state.bundle.goal);
  const saveGoal = useProfileBundleStore((state) => state.saveGoal);

  return (
    <>
      <StaticRow
        icon={Target}
        iconWrapClass="bg-primary/10"
        iconClassName="text-primary"
        label="Goal"
        value={goal}
        onPress={() => setOpen(true)}
      />

      <ChoiceModal
        title="Goal"
        open={open}
        selected={goal}
        options={GOAL_OPTIONS}
        optionLayout="list"
        optionDescriptions={GOAL_DESCRIPTIONS}
        onClose={() => setOpen(false)}
        onSelect={(value) => {
          void saveGoal(value);
        }}
      />
    </>
  );
}

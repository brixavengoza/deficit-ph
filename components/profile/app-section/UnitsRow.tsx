import { ChoiceModal } from '@/components/profile/choice-modal';
import StaticRow from '@/components/profile/static-row';
import { UNITS_OPTIONS, type Units } from '@/lib/profile-settings-mock';
import { Scale } from 'lucide-react-native';
import React from 'react';
import { useProfileBundleStore } from '@/stores/use-profile-bundle-store';

export default function UnitsRow() {
  const [open, setOpen] = React.useState(false);
  const units = useProfileBundleStore((state) => state.bundle.units);
  const saveUnits = useProfileBundleStore((state) => state.saveUnits);

  return (
    <>
      <StaticRow
        icon={Scale}
        iconWrapClass="bg-teal-100"
        iconClassName="text-teal-600"
        label="Units"
        value={units}
        onPress={() => setOpen(true)}
      />

      <ChoiceModal
        title="Units"
        open={open}
        selected={units}
        options={UNITS_OPTIONS}
        onClose={() => setOpen(false)}
        onSelect={(value) => {
          void saveUnits(value as Units);
        }}
      />
    </>
  );
}

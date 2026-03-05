import { ChoiceModal } from '@/components/profile/choice-modal';
import StaticRow from '@/components/profile/static-row';
import {
  PROFILE_APP_PREFERENCES_MOCK,
  THEME_OPTIONS,
  type ThemeMode,
} from '@/lib/profile-settings-mock';
import { MoonStar } from 'lucide-react-native';
import React from 'react';

export default function ThemeRow() {
  const [open, setOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<ThemeMode>(PROFILE_APP_PREFERENCES_MOCK.theme);

  return (
    <>
      <StaticRow
        icon={MoonStar}
        iconWrapClass="bg-slate-100"
        iconClassName="text-slate-600"
        label="Theme"
        value={theme}
        onPress={() => setOpen(true)}
      />

      <ChoiceModal
        title="Theme"
        open={open}
        selected={theme}
        options={THEME_OPTIONS}
        onClose={() => setOpen(false)}
        onSelect={(value) => setTheme(value)}
      />
    </>
  );
}

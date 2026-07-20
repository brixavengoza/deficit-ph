import { ChoiceModal } from '@/components/profile/choice-modal';
import StaticRow from '@/components/profile/static-row';
import { THEME_OPTIONS, type ThemeMode } from '@/lib/profile-settings-options';
import { MoonStar } from 'lucide-react-native';
import React from 'react';
import { Uniwind } from 'uniwind';
import { useProfileBundleStore } from '@/stores/use-profile-bundle-store';

export default function ThemeRow() {
  const [open, setOpen] = React.useState(false);
  const selectedTheme = useProfileBundleStore((state) => state.bundle.theme);
  const saveTheme = useProfileBundleStore((state) => state.saveTheme);

  const handleThemeSelect = (value: ThemeMode) => {
    void saveTheme(value);
    if (value === 'Auto') {
      Uniwind.setTheme('system');
      return;
    }

    Uniwind.setTheme(value.toLowerCase() as 'light' | 'dark');
  };

  return (
    <>
      <StaticRow
        icon={MoonStar}
        iconWrapClass="bg-secondary"
        iconClassName="text-foreground"
        label="Theme"
        value={selectedTheme}
        onPress={() => setOpen(true)}
      />

      <ChoiceModal
        title="Theme"
        open={open}
        selected={selectedTheme}
        options={THEME_OPTIONS}
        onClose={() => setOpen(false)}
        onSelect={handleThemeSelect}
      />
    </>
  );
}

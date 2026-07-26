import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { THEME_OPTIONS, type ThemeMode } from '@/lib/profile-settings-options';
import { Moon, MoonStar, Sun, SunMoon, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { Uniwind } from 'uniwind';
import { useProfileBundleStore } from '@/stores/use-profile-bundle-store';

const THEME_ICONS: Record<ThemeMode, LucideIcon> = {
  Auto: SunMoon,
  Light: Sun,
  Dark: Moon,
};

export default function ThemeRow() {
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
    <View className="px-4 py-3">
      <View className="mb-2 flex-row items-center gap-3">
        <View className="bg-secondary h-8 w-8 items-center justify-center rounded-full">
          <Icon as={MoonStar} className="text-foreground size-4" />
        </View>
        <Text className="text-foreground text-sm font-medium">Theme</Text>
      </View>

      <View className="bg-background-subtle flex-row gap-1 rounded-md p-1">
        {THEME_OPTIONS.map((value) => {
          const active = selectedTheme === value;
          return (
            <Pressable
              key={value}
              onPress={() => handleThemeSelect(value)}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-md py-2.5 ${
                active ? 'bg-primary' : ''
              }`}>
              <Icon
                as={THEME_ICONS[value]}
                className={active ? 'size-4 text-white' : 'text-muted-foreground size-4'}
              />
              <Text
                className={
                  active
                    ? 'text-xs font-semibold text-white'
                    : 'text-muted-foreground text-xs font-semibold'
                }>
                {value}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

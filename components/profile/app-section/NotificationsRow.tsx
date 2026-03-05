import { PROFILE_APP_PREFERENCES_MOCK } from '@/lib/profile-settings-mock';
import { Bell } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '../../ui/icon';
import { Text } from '../../ui/text';

export default function NotificationsRow() {
  const [enabled, setEnabled] = React.useState<boolean>(PROFILE_APP_PREFERENCES_MOCK.notifications);

  return (
    <Pressable
      className="flex-row items-center justify-between px-4 py-3"
      onPress={() => setEnabled((v) => !v)}>
      <View className="flex-row items-center gap-3">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-yellow-100">
          <Icon as={Bell} className="size-4 text-yellow-600" />
        </View>
        <Text className="text-sm font-medium text-slate-700">Notifications</Text>
      </View>

      <View className="flex-row items-center gap-3">
        <Text className="text-xs font-medium text-slate-400">{enabled ? 'On' : 'Off'}</Text>
        <View
          className={
            enabled
              ? 'bg-primary h-7 w-12 rounded-full p-1'
              : 'h-7 w-12 rounded-full bg-slate-300 p-1'
          }>
          <View
            style={{ transform: [{ translateX: enabled ? 20 : 0 }] }}
            className="h-5 w-5 rounded-full bg-white"
          />
        </View>
      </View>
    </Pressable>
  );
}

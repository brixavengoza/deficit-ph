import { Bell } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '../../ui/icon';
import { Text } from '../../ui/text';
import { useProfileBundleStore } from '@/stores/use-profile-bundle-store';

export default function NotificationsRow() {
  const enabled = useProfileBundleStore((state) => state.bundle.notifications);
  const saveNotifications = useProfileBundleStore((state) => state.saveNotifications);

  return (
    <Pressable
      className="flex-row items-center justify-between px-4 py-3"
      onPress={() => {
        void saveNotifications(!enabled);
      }}>
      <View className="flex-row items-center gap-3">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-yellow-100">
          <Icon as={Bell} className="size-4 text-yellow-600" />
        </View>
        <Text className="text-foreground text-sm font-medium">Notifications</Text>
      </View>

      <View className="flex-row items-center gap-3">
        <Text className="text-muted-foreground text-xs font-medium">{enabled ? 'On' : 'Off'}</Text>
        <View
          className={
            enabled
              ? 'bg-primary h-7 w-12 rounded-full p-1'
              : 'bg-muted h-7 w-12 rounded-full p-1'
          }>
          <View
            style={{ transform: [{ translateX: enabled ? 20 : 0 }] }}
            className="bg-card h-5 w-5 rounded-full"
          />
        </View>
      </View>
    </Pressable>
  );
}

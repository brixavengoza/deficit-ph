import { PhotoActionsSheet } from '@/components/profile/photo-actions-sheet';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { PROFILE_IDENTITY_MOCK } from '@/lib/profile-settings-mock';
import { Camera, Settings } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
export function ProfileHeaderSection() {
  const [photoSheetOpen, setPhotoSheetOpen] = React.useState(false);
  const { fullName, username, memberSinceYear } = PROFILE_IDENTITY_MOCK;

  const initials = (fullName || 'JD')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <>
      <View className="px-6 py-6">
        <View className="items-center gap-4">
          <Pressable className="relative" onPress={() => setPhotoSheetOpen(true)}>
            <View className="h-28 w-28 items-center justify-center rounded-full bg-slate-200 ring-4 ring-white">
              <Text className="text-3xl font-bold text-slate-600">{initials}</Text>
            </View>
            <View className="bg-primary border-surface absolute right-0 bottom-0 h-8 w-8 items-center justify-center rounded-full border-2">
              <Icon as={Camera} className="size-4 text-white" />
            </View>
          </Pressable>

          <View className="items-center">
            <Text className="text-foreground text-2xl font-bold">{fullName}</Text>
            <Text className="text-muted-foreground text-sm">
              @{username} • Member since {memberSinceYear}
            </Text>
          </View>
        </View>
      </View>

      <PhotoActionsSheet
        open={photoSheetOpen}
        onClose={() => setPhotoSheetOpen(false)}
        onChoosePhoto={() => {
          console.log('[profile photo] choose photo');
          setPhotoSheetOpen(false);
        }}
        onTakePhoto={() => {
          console.log('[profile photo] take photo');
          setPhotoSheetOpen(false);
        }}
      />
    </>
  );
}

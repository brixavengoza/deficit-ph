import { PhotoActionsSheet } from '@/components/profile/photo-actions-sheet';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import React from 'react';
import { Alert, Image as RNImage, Pressable, View } from 'react-native';
import { useProfileBundleStore } from '@/stores/use-profile-bundle-store';
export function ProfileHeaderSection() {
  const [photoSheetOpen, setPhotoSheetOpen] = React.useState(false);
  const [isPickingPhoto, setIsPickingPhoto] = React.useState(false);
  const { fullName, username, profilePhotoUri } = useProfileBundleStore((state) => state.bundle);
  const saveProfilePhoto = useProfileBundleStore((state) => state.saveProfilePhoto);
  const memberSinceYear = new Date().getFullYear();

  const initials = (fullName || 'JD')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const showPhotoError = React.useCallback((message: string) => {
    Alert.alert('Profile Photo', message);
  }, []);

  const saveSelectedPhoto = React.useCallback(
    async (uri: string) => {
      await saveProfilePhoto(uri);
      setPhotoSheetOpen(false);
    },
    [saveProfilePhoto]
  );

  const choosePhoto = React.useCallback(async () => {
    setIsPickingPhoto(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Photo library access is needed to choose a profile photo.');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        base64: false,
        exif: false,
        mediaTypes: ['images'],
        quality: 0.85,
        selectionLimit: 1,
      });

      if (result.canceled) return;

      const imageUri = result.assets[0]?.uri;
      if (!imageUri) throw new Error('Unable to read the selected photo.');

      await saveSelectedPhoto(imageUri);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to choose photo.';
      showPhotoError(message);
      console.error('[ProfileHeaderSection.choosePhoto]', error);
    } finally {
      setIsPickingPhoto(false);
    }
  }, [saveSelectedPhoto, showPhotoError]);

  const takePhoto = React.useCallback(async () => {
    setIsPickingPhoto(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Camera access is needed to take a profile photo.');
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        base64: false,
        exif: false,
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (result.canceled) return;

      const imageUri = result.assets[0]?.uri;
      if (!imageUri) throw new Error('Unable to read the captured photo.');

      await saveSelectedPhoto(imageUri);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to take photo.';
      showPhotoError(message);
      console.error('[ProfileHeaderSection.takePhoto]', error);
    } finally {
      setIsPickingPhoto(false);
    }
  }, [saveSelectedPhoto, showPhotoError]);

  return (
    <>
      <View className="px-6 py-6">
        <View className="items-center gap-4">
          <Pressable className="relative" onPress={() => setPhotoSheetOpen(true)}>
            <View className="bg-muted ring-background h-28 w-28 items-center justify-center overflow-hidden rounded-full ring-4">
              {profilePhotoUri ? (
                <RNImage
                  source={{ uri: profilePhotoUri }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-muted-foreground text-3xl font-bold">{initials}</Text>
              )}
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
        isWorking={isPickingPhoto}
        onClose={() => setPhotoSheetOpen(false)}
        onChoosePhoto={() => {
          void choosePhoto();
        }}
        onTakePhoto={() => {
          void takePhoto();
        }}
      />
    </>
  );
}

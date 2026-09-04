import { PhotoActionsSheet } from '@/components/profile/photo-actions-sheet';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import React from 'react';
import { Alert, Image as RNImage, Pressable, View } from 'react-native';
import { fetchAvatarUrl, uploadAvatar } from '@/lib/avatar';
import { useAuthStore } from '@/stores/use-auth-store';
import { useProfileBundleStore } from '@/stores/use-profile-bundle-store';

export function ProfileHeaderSection() {
  const [photoSheetOpen, setPhotoSheetOpen] = React.useState(false);
  const [isPickingPhoto, setIsPickingPhoto] = React.useState(false);
  const { email: localEmail, profilePhotoUri } = useProfileBundleStore((state) => state.bundle);
  const authUser = useAuthStore((state) => state.user);
  const saveProfilePhoto = useProfileBundleStore((state) => state.saveProfilePhoto);

  // The signed-in account is the source of truth for identity; the locally cached copy
  // is only a fallback for the moment before the session is restored.
  const email = authUser?.email || localEmail || '';

  // Real signup date. This previously used `new Date().getFullYear()`, so "Member since"
  // always displayed the CURRENT year and silently changed every January.
  const memberSinceYear = authUser?.created_at
    ? new Date(authUser.created_at).getFullYear()
    : null;

  // Avatar letter comes from the email, since there is no name field any more.
  const initials = (email.split('@')[0]?.trim()[0] ?? '?').toUpperCase();

  const showPhotoError = React.useCallback((message: string) => {
    Alert.alert('Profile Photo', message);
  }, []);

  // Signed in on a new phone: the local database has no photo, but the account may
  // already have one. Pull it down once so the avatar is not blank.
  React.useEffect(() => {
    if (!authUser?.id || profilePhotoUri) return;
    let cancelled = false;
    void (async () => {
      try {
        const remoteUrl = await fetchAvatarUrl(authUser.id);
        if (!cancelled && remoteUrl) await saveProfilePhoto(remoteUrl);
      } catch (error) {
        console.warn('[ProfileHeaderSection.fetchAvatarUrl]', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser?.id, profilePhotoUri, saveProfilePhoto]);

  const saveSelectedPhoto = React.useCallback(
    async (uri: string) => {
      // Upload first so the value cached locally is the durable public URL rather than
      // a file:// path, which would break as soon as the OS clears its cache directory.
      if (authUser?.id) {
        try {
          const publicUrl = await uploadAvatar(uri, authUser.id);
          await saveProfilePhoto(publicUrl);
          setPhotoSheetOpen(false);
          return;
        } catch (error) {
          console.error('[ProfileHeaderSection.uploadAvatar]', error);
          // Keep the photo locally so the change is not simply lost, but say plainly
          // that it did not sync, instead of pretending it uploaded.
          await saveProfilePhoto(uri);
          setPhotoSheetOpen(false);
          showPhotoError(
            error instanceof Error && error.message.includes('too large')
              ? error.message
              : 'Saved on this phone, but we could not upload it. It will not appear on your other devices.'
          );
          return;
        }
      }

      await saveProfilePhoto(uri);
      setPhotoSheetOpen(false);
    },
    [authUser?.id, saveProfilePhoto, showPhotoError]
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

          <View className="w-full items-center">
            <Text
              numberOfLines={1}
              ellipsizeMode="middle"
              className="text-foreground max-w-full px-4 text-xl font-bold">
              {email || 'Signed in'}
            </Text>
            {memberSinceYear ? (
              <Text className="text-muted-foreground mt-0.5 text-sm">
                Member since {memberSinceYear}
              </Text>
            ) : null}
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

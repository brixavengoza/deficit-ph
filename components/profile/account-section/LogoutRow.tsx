import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useProfileBundleStore } from '@/stores/use-profile-bundle-store';
import { useSavedFoodStore } from '@/stores/use-saved-food-store';
import { useRouter } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, View } from 'react-native';

export default function LogoutRow() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const clearSavedFoods = useSavedFoodStore((state) => state.clearSavedFoods);
  const resetProfile = useProfileBundleStore((state) => state.reset);

  const handleLogout = async () => {
    setOpen(false);
    clearSavedFoods();
    resetProfile();
    router.replace('/welcome');
  };

  return (
    <>
      <Pressable
        className="bg-destructive/10 flex-row items-center justify-center gap-2 rounded-md p-4"
        onPress={() => setOpen(true)}>
        <Icon as={LogOut} className="text-destructive size-4" />
        <Text className="text-destructive text-sm font-bold">Log Out</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/35 px-5"
          onPress={() => setOpen(false)}>
          <Pressable
            className="bg-card w-full max-w-md rounded-lg p-5"
            onPress={(e) => e.stopPropagation()}>
            <Text className="text-foreground text-lg font-bold">Leave profile?</Text>
            <Text className="text-muted-foreground mt-2 text-sm leading-5">
              This only exits to the welcome screen. Your offline data stays on this device.
            </Text>

            <View className="mt-5 gap-2">
              <Button
                variant="destructive"
                className="h-11 rounded-md"
                onPress={() => {
                  void handleLogout();
                }}>
                <Text>Continue</Text>
              </Button>

              <Button variant="outline" className="h-11 rounded-md" onPress={() => setOpen(false)}>
                <Text>Cancel</Text>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { supabase } from '@/lib/supabase';
import { useProfileBundleStore } from '@/stores/use-profile-bundle-store';
import { useSavedFoodStore } from '@/stores/use-saved-food-store';
import { useRouter } from 'expo-router';
import React from 'react';
import { Modal, Pressable, View } from 'react-native';

export default function LogoutRow() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const clearSavedFoods = useSavedFoodStore((state) => state.clearSavedFoods);
  const resetProfile = useProfileBundleStore((state) => state.reset);

  const handleLogout = async () => {
    setOpen(false);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[LogoutRow.signOut]', error);
    } finally {
      clearSavedFoods();
      resetProfile();
      router.replace('/welcome');
    }
  };

  return (
    <>
      <Pressable className="items-center justify-center p-4" onPress={() => setOpen(true)}>
        <Text className="text-sm font-bold text-red-500">Log Out</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/35 px-5"
          onPress={() => setOpen(false)}>
          <Pressable
            className="w-full max-w-md rounded-[22px] bg-white p-5"
            onPress={(e) => e.stopPropagation()}>
            <Text className="text-foreground text-lg font-bold">Log Out?</Text>
            <Text className="text-muted-foreground mt-2 text-sm leading-5">
              Sure ka na? Kailangan mong mag-login ulit para ma-access ang account mo.
            </Text>

            <View className="mt-5 gap-2">
              <Button
                variant="destructive"
                className="h-11 rounded-full"
                onPress={() => {
                  void handleLogout();
                }}>
                <Text>Log Out</Text>
              </Button>

              <Button
                variant="outline"
                className="h-11 rounded-full"
                onPress={() => setOpen(false)}>
                <Text>Cancel</Text>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

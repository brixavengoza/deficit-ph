import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Camera, Image, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import ActionSheet, { type ActionSheetRef } from 'react-native-actions-sheet';

type PhotoActionsSheetProps = {
  open: boolean;
  onClose: () => void;
  onChoosePhoto: () => void;
  onTakePhoto: () => void;
};

export function PhotoActionsSheet({
  open,
  onClose,
  onChoosePhoto,
  onTakePhoto,
}: PhotoActionsSheetProps) {
  const sheetRef = React.useRef<ActionSheetRef>(null);

  React.useEffect(() => {
    if (open) {
      sheetRef.current?.show();
    } else if (sheetRef.current?.isOpen()) {
      sheetRef.current.hide();
    }
  }, [open]);

  return (
    <ActionSheet
      ref={sheetRef}
      gestureEnabled
      closeOnTouchBackdrop
      onClose={onClose}
      containerStyle={{
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        backgroundColor: '#fff',
      }}
      indicatorStyle={{ width: 44, backgroundColor: '#cbd5e1' }}>
      <View className="px-5 pt-2 pb-6">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-foreground text-lg font-bold">Select Profile Photo</Text>
        </View>

        <View className="gap-3">
          <Button
            variant="outline"
            className="h-12 w-full justify-start rounded-full px-4"
            onPress={onChoosePhoto}>
            <Icon as={Image} className="text-foreground size-4" />
            <Text className="text-foreground font-semibold">Choose Photo</Text>
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full justify-start rounded-full px-4"
            onPress={onTakePhoto}>
            <Icon as={Camera} className="text-foreground size-4" />
            <Text className="text-foreground font-semibold">Take Photo</Text>
          </Button>
        </View>
      </View>
    </ActionSheet>
  );
}

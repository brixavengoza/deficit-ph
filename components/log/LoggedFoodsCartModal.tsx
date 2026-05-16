import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useDeleteFoodLogMutation, useFoodLogsQuery } from '@/hooks/use-trackk-query';
import { getFoodEmoji } from '@/lib/food-emoji';
import { formatNumberGrouped } from '@/lib/number-format';
import { router } from 'expo-router';
import { Pencil, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';

type LoggedFoodsCartModalProps = {
  open: boolean;
  onClose: () => void;
  dayKey?: string;
};

export function LoggedFoodsCartModal({ open, onClose, dayKey }: LoggedFoodsCartModalProps) {
  const sheetRef = React.useRef<{ open: () => void; close: () => void } | null>(null);
  const insets = useSafeAreaInsets();
  const { theme } = useUniwind();
  const sheetBackground = theme === 'dark' ? '#1a2e22' : '#ffffff';
  const indicatorBackground = theme === 'dark' ? '#365141' : '#cbd5e1';
  const { height: windowHeight } = useWindowDimensions();
  const logsQuery = useFoodLogsQuery();
  const deleteLogMutation = useDeleteFoodLogMutation();
  const targetDayKey = dayKey ?? new Date().toISOString().slice(0, 10);
  const loggedFoods = React.useMemo(
    () => (logsQuery.data ?? []).filter((item) => item.consumedAtIso.slice(0, 10) === targetDayKey),
    [logsQuery.data, targetDayKey]
  );
  const [isSavingToDb, setIsSavingToDb] = React.useState(false);

  const totalItems = loggedFoods.length;
  const totalKcal = React.useMemo(
    () => loggedFoods.reduce((sum, item) => sum + item.totalKcal, 0),
    [loggedFoods]
  );
  const sheetHeight = React.useMemo(() => {
    const MAX_HEIGHT = Math.floor(windowHeight * 0.82);
    const MIN_HEIGHT = 250;
    const HEADER_HEIGHT = 76;
    const FOOTER_HEIGHT = 76;
    const BODY_PADDING = 24;
    const EMPTY_BODY_HEIGHT = 128;
    const ROW_ESTIMATE_HEIGHT = 104;
    const visibleRows = Math.min(loggedFoods.length || 1, 4);
    const bodyHeight = loggedFoods.length
      ? visibleRows * ROW_ESTIMATE_HEIGHT + BODY_PADDING
      : EMPTY_BODY_HEIGHT;

    const estimated = HEADER_HEIGHT + FOOTER_HEIGHT + bodyHeight + Math.max(insets.bottom, 12);
    return Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, estimated));
  }, [insets.bottom, loggedFoods.length, windowHeight]);

  const handleSaveToDb = React.useCallback(async () => {
    onClose();
  }, [onClose]);

  const handleEditItem = React.useCallback(
    (entryId: string) => {
      onClose();
      router.push({
        pathname: '/dashboard/add-food',
        params: { entryId },
      });
    },
    [onClose]
  );

  const handleClearAll = React.useCallback(async () => {
    setIsSavingToDb(true);
    try {
      await Promise.all(loggedFoods.map((entry) => deleteLogMutation.mutateAsync(entry.id)));
      onClose();
    } catch (error) {
      console.error('[LoggedFoodsCartModal.handleClearAll]', error);
    } finally {
      setIsSavingToDb(false);
    }
  }, [deleteLogMutation, loggedFoods, onClose]);

  React.useEffect(() => {
    if (totalItems === 0) {
      onClose();
    }
  }, [totalItems]);

  React.useEffect(() => {
    if (!sheetRef.current) return;
    if (open) {
      sheetRef.current.open();
    } else {
      sheetRef.current.close();
    }
  }, [open]);

  const sheetContent = (
    <View className="flex-1">
      <View className="border-border/70 flex-row items-center justify-between border-b px-4 py-3">
        <Text className="text-foreground text-lg font-bold">Logged Foods</Text>
        <Text className="text-muted-foreground text-xs">
          {totalItems} item{totalItems === 1 ? '' : 's'} • {formatNumberGrouped(totalKcal)} kcal
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerClassName="gap-3 p-4">
        {loggedFoods.length === 0 ? (
          <View className="bg-background-subtle rounded-md px-4 py-6">
            <Text className="text-foreground text-center text-base font-semibold">
              Wala pang logged food
            </Text>
            <Text className="text-muted-foreground mt-1 px-10 text-center text-sm">
              Add food first, then review and edit here before saving.
            </Text>
          </View>
        ) : null}

        {loggedFoods.map((item) => (
          <View
            key={item.id}
            className="border-border/70 bg-background-subtle/50 flex-row items-start justify-between gap-3 rounded-md border p-3">
            <View className="flex-1 flex-row items-start gap-3">
              <View className="bg-card h-10 w-10 items-center justify-center rounded-xl">
                <Text className="text-lg">{getFoodEmoji(item.foodName)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-foreground text-sm font-semibold">{item.foodName}</Text>
                <Text className="text-muted-foreground mt-0.5 text-xs">
                  {item.quantity} {item.unit} • {item.meal} • {item.logTime}
                </Text>
                <Text className="text-primary mt-1 text-xs font-semibold">
                  {item.totalKcal} kcal
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2 pl-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${item.foodName}`}
                onPress={() => handleEditItem(item.id)}
                className="border-border bg-card h-8 w-8 items-center justify-center rounded-full border">
                <View>
                  <Icon as={Pencil} className="text-foreground size-4" />
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.foodName}`}
                onPress={(event) => {
                  event.stopPropagation();
                  void (async () => {
                    try {
                      await deleteLogMutation.mutateAsync(item.id);
                    } catch (error) {
                      console.error('[LoggedFoodsCartModal.removeLoggedFood]', error);
                    }
                  })();
                }}
                className="bg-destructive/10 h-8 w-8 items-center justify-center rounded-full">
                <View>
                  <Icon as={Trash2} className="text-destructive size-4" />
                </View>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      <View
        className="border-border/70 flex-row gap-2 border-t px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        <Button
          variant="outline"
          className="h-11 flex-1"
          disabled={!loggedFoods.length}
          onPress={() => {
            void handleClearAll();
          }}>
          <Icon as={Trash2} className="text-foreground size-4" />
          <Text>Clear all</Text>
        </Button>

        <Button
          variant="default"
          className="h-11 flex-1"
          disabled={!loggedFoods.length || isSavingToDb || deleteLogMutation.isPending}
          onPress={handleSaveToDb}>
          <Text>{isSavingToDb ? 'Saving...' : 'Done'}</Text>
        </Button>
      </View>
    </View>
  );

  return (
    <RBSheet
      ref={sheetRef}
      height={sheetHeight}
      openDuration={220}
      closeDuration={180}
      closeOnPressMask
      closeOnPressBack
      draggable
      customStyles={{
        wrapper: { backgroundColor: 'rgba(0,0,0,0.35)' },
        container: {
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          overflow: 'hidden',
          backgroundColor: sheetBackground,
        },
        draggableIcon: {
          backgroundColor: indicatorBackground,
          width: 44,
        },
      }}
      onClose={onClose}>
      {sheetContent}
    </RBSheet>
  );
}

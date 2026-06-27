import { getFoodEmoji } from '@/lib/food-emoji';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { useDeleteFoodLogMutation, useFoodLogsQuery } from '@/hooks/use-trackk-query';
import { router } from 'expo-router';
import { Pencil, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, RefreshControl, SectionList, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FoodItem = {
  id: string;
  name: string;
  portion: string;
  kcal: number;
};

type FoodSection = {
  title: string;
  totalKcal: number;
  data: FoodItem[];
};

function LogFoodRow({
  item,
  isLast,
  isDeleting,
  onDelete,
}: {
  item: FoodItem;
  isLast: boolean;
  isDeleting: boolean;
  onDelete: (id: string) => void;
}) {
  const handleEdit = React.useCallback(() => {
    router.push({
      pathname: '/dashboard/add-food',
      params: { entryId: item.id },
    });
  }, [item.id]);

  const renderRightActions = React.useCallback(
    () => (
      <View className="flex-row">
        <Pressable
          className="bg-primary h-full w-20 items-center justify-center"
          onPress={handleEdit}>
          <Icon as={Pencil} className="size-5 text-white" />
          <Text className="mt-1 text-xs font-bold text-white">Edit</Text>
        </Pressable>
        <Pressable
          className="bg-destructive h-full w-20 items-center justify-center"
          disabled={isDeleting}
          onPress={() => onDelete(item.id)}>
          <Icon as={Trash2} className="size-5 text-white" />
          <Text className="mt-1 text-xs font-bold text-white">
            {isDeleting ? 'Deleting' : 'Delete'}
          </Text>
        </Pressable>
      </View>
    ),
    [handleEdit, isDeleting, item.id, onDelete]
  );

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <Pressable
        onPress={handleEdit}
        className={`bg-card px-6 py-4 ${isLast ? '' : 'border-border border-b'}`}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center pr-4">
            <View className="bg-background-subtle mr-3 h-11 w-11 items-center justify-center rounded-md">
              <Text className="text-2xl">{getFoodEmoji(item.name)}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-foreground text-base font-medium">{item.name}</Text>
              <Text className="text-muted-foreground mt-0.5 text-sm">{item.portion}</Text>
            </View>
          </View>
          <Text className="text-primary text-base font-bold">{item.kcal}</Text>
        </View>
      </Pressable>
    </Swipeable>
  );
}

function formatKcal(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

export default function DashboardLogScreen() {
  const insets = useSafeAreaInsets();
  const logsQuery = useFoodLogsQuery();
  const deleteLogMutation = useDeleteFoodLogMutation();
  const loggedFoods = logsQuery.data ?? [];
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const sections = React.useMemo<FoodSection[]>(() => {
    if (!loggedFoods.length) return [];

    const grouped = new Map<string, FoodSection>();

    for (const item of loggedFoods) {
      const key = item.consumedAtIso.slice(0, 10);
      const dateLabel = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(new Date(item.consumedAtIso));
      const title =
        key === new Date().toISOString().slice(0, 10) ? `Today, ${dateLabel}` : dateLabel;

      if (!grouped.has(key)) {
        grouped.set(key, { title, totalKcal: 0, data: [] });
      }

      const section = grouped.get(key)!;
      section.totalKcal += item.totalKcal;
      section.data.push({
        id: item.id,
        name: item.foodName,
        portion: `${item.quantity} ${item.unit} • ${item.meal} • ${item.logTime}`,
        kcal: item.totalKcal,
      });
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([, section]) => section);
  }, [loggedFoods]);

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      await logsQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [logsQuery]);

  const handleDelete = React.useCallback(
    async (id: string) => {
      if (deleteLogMutation.isPending) return;
      setDeletingId(id);
      try {
        await deleteLogMutation.mutateAsync(id);
      } catch (error) {
        console.error('[DashboardLogScreen.deleteFoodLog]', error);
      } finally {
        setDeletingId(null);
      }
    },
    [deleteLogMutation]
  );

  return (
    <View className="bg-background flex-1">
      <View
        className="bg-background flex-row items-center justify-between px-4 pb-4"
        style={{ paddingTop: insets.top + 8 }}>
        <Text className="text-foreground flex-1 text-center text-lg font-bold tracking-tight">
          Food History
        </Text>
      </View>

      <SectionList
        sections={sections}
        style={{ flex: 1 }}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 160 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#7ea56b"
            colors={['#7ea56b']}
          />
        }
        renderSectionHeader={({ section }) => (
          <View className="bg-primary/10 flex-row items-center justify-between px-6 py-3">
            <Text className="text-foreground text-base font-bold">{section.title}</Text>
            <Text className="text-muted-foreground text-sm font-semibold">
              {formatKcal(section.totalKcal)} kcal
            </Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <LogFoodRow
            item={item}
            isLast={index === section.data.length - 1}
            isDeleting={deletingId === item.id}
            onDelete={handleDelete}
          />
        )}
        ListEmptyComponent={
          <View className="px-6 py-10">
            <Text className="text-foreground text-base font-semibold">
              {logsQuery.isLoading ? 'Loading food logs...' : 'No food logs yet'}
            </Text>
            <Text className="text-muted-foreground mt-1 text-sm">
              {logsQuery.isLoading
                ? 'Fetching from database.'
                : 'Start logging meals and your history will show up here.'}
            </Text>
          </View>
        }
        ListFooterComponent={<View className="h-8" />}
      />
    </View>
  );
}

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useInsertFoodLogMutation, useUpsertUserFoodMutation } from '@/hooks/use-trackk-query';
import { scanNutritionLabel, uploadNutritionLabelImage } from '@/lib/food-label-scanner';
import { formatNumberGrouped } from '@/lib/number-format';
import type { NutritionLabelDraft } from '@/lib/nutrition-label-parser';
import { formatTimeLabelFromDate } from '@/utils/add-food-utils';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack } from 'expo-router';
import {
  ArrowLeft,
  Check,
  History,
  Image as ImageIcon,
  LoaderCircle,
  Pencil,
  Sparkles,
  Utensils,
} from 'lucide-react-native';
import React from 'react';
import { Image as RNImage, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function valueParam(value: number) {
  return Number.isFinite(value) ? String(value) : '0';
}

export default function ScanLabelScreen() {
  const insets = useSafeAreaInsets();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [draft, setDraft] = React.useState<NutritionLabelDraft | null>(null);
  const [uploadedImageUri, setUploadedImageUri] = React.useState<string | null>(null);
  const [activeAction, setActiveAction] = React.useState<'scan' | 'upload' | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const upsertFoodMutation = useUpsertUserFoodMutation();
  const insertFoodLogMutation = useInsertFoodLogMutation();
  const isWorking = activeAction != null || isSaving;

  const startScan = React.useCallback(async () => {
    setActiveAction('scan');
    setError(null);
    try {
      const result = await scanNutritionLabel();
      setUploadedImageUri(null);
      setDraft(result);
    } catch (scanError) {
      const message =
        scanError instanceof Error ? scanError.message : 'Unable to scan nutrition label.';
      setError(message);
      console.error('[ScanLabelScreen.startScan]', scanError);
    } finally {
      setActiveAction(null);
    }
  }, []);

  const uploadImage = React.useCallback(async () => {
    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Photo library access is needed to upload a nutrition label.');
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        mediaTypes: ['images'],
        exif: false,
        base64: false,
        selectionLimit: 1,
        quality: 1,
      });

      if (pickerResult.canceled) return;

      const imageUri = pickerResult.assets[0]?.uri;
      if (!imageUri) throw new Error('Unable to read the selected image.');

      setActiveAction('upload');
      const result = await uploadNutritionLabelImage(imageUri);
      setUploadedImageUri(imageUri);
      setDraft(result);
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : 'Unable to upload nutrition label.';
      setError(message);
      console.error('[ScanLabelScreen.uploadImage]', uploadError);
    } finally {
      setActiveAction(null);
    }
  }, []);

  const editDraft = React.useCallback(() => {
    if (!draft) return;
    router.push({
      pathname: '/dashboard/add-custom-food',
      params: {
        foodName: draft.foodName,
        servingSizeLabel: draft.servingSizeLabel,
        caloriesPer100g: valueParam(draft.caloriesPer100g),
        proteinPer100g: valueParam(draft.proteinPer100g),
        carbsPer100g: valueParam(draft.carbsPer100g),
        fatsPer100g: valueParam(draft.fatsPer100g),
        fiberPer100g: valueParam(draft.fiberPer100g),
        sugarPer100g: valueParam(draft.sugarPer100g),
        sodiumMgPer100g: valueParam(draft.sodiumMgPer100g),
      },
    });
  }, [draft]);

  const saveDraft = React.useCallback(async () => {
    if (!draft) return;
    setIsSaving(true);
    setError(null);
    try {
      const savedFood = await upsertFoodMutation.mutateAsync({
        name: draft.foodName.trim() || 'Scanned Food',
        kcalPer100g: draft.caloriesPer100g,
        proteinPer100g: draft.proteinPer100g,
        carbsPer100g: draft.carbsPer100g,
        fatsPer100g: draft.fatsPer100g,
        fiberPer100g: draft.fiberPer100g,
        sugarPer100g: draft.sugarPer100g,
        sodiumMgPer100g: draft.sodiumMgPer100g,
        servingSizeLabel: draft.servingSizeLabel,
      });

      await insertFoodLogMutation.mutateAsync({
        foodId: savedFood.id,
        foodName: savedFood.name,
        kcalPer100g: savedFood.kcalPer100g,
        proteinPer100g: savedFood.proteinPer100g,
        carbsPer100g: savedFood.carbsPer100g,
        fatsPer100g: savedFood.fatsPer100g,
        fiberPer100g: savedFood.fiberPer100g,
        sugarPer100g: savedFood.sugarPer100g,
        sodiumMgPer100g: savedFood.sodiumMgPer100g,
        quantity: 100,
        unit: 'grams',
        gramsEquivalent: 100,
        meal: 'Lunch',
        logTime: formatTimeLabelFromDate(new Date()),
        totalKcal: savedFood.kcalPer100g,
        proteinGrams: savedFood.proteinPer100g,
        carbsGrams: savedFood.carbsPer100g,
        fatsGrams: savedFood.fatsPer100g,
        fiberGrams: savedFood.fiberPer100g,
        sugarGrams: savedFood.sugarPer100g,
        sodiumMg: savedFood.sodiumMgPer100g,
      });

      router.back();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to save food log.';
      setError(message);
      console.error('[ScanLabelScreen.saveDraft]', saveError);
    } finally {
      setIsSaving(false);
    }
  }, [draft, insertFoodLogMutation, upsertFoodMutation]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="bg-background flex-1">
        <View
          className="border-border bg-background flex-row items-center border-b px-4 pb-3"
          style={{ paddingTop: insets.top + 10 }}>
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full"
            onPress={() => router.back()}>
            <Icon as={ArrowLeft} className="text-foreground size-5" />
          </Pressable>
          <Text className="text-foreground flex-1 pr-10 text-center text-lg font-bold">
            Scan Label
          </Text>
        </View>

        <View className="flex-1">
          <ScannerViewfinder
            activeAction={activeAction}
            bottomInset={insets.bottom}
            cameraPermissionGranted={cameraPermission?.granted ?? false}
            disabled={isWorking}
            onCapture={() => {
              void startScan();
            }}
            onGallery={() => {
              void uploadImage();
            }}
            onRecent={() => router.push('/dashboard/log')}
            onRequestCameraPermission={() => {
              void requestCameraPermission();
            }}
          />

          <View
            className="absolute left-4 right-4 flex-row items-center gap-4 rounded-2xl bg-background/95 p-4"
            style={{ bottom: Math.max(insets.bottom + 132, 148) }}>
            <View className="bg-primary/15 h-12 w-12 items-center justify-center rounded-2xl">
              <Icon as={Utensils} className="text-primary size-6" />
            </View>
            <View className="flex-1">
              <Text className="text-foreground text-sm font-bold">
                {activeAction === 'upload'
                  ? 'Reading image...'
                  : activeAction === 'scan'
                    ? 'Opening scanner...'
                    : draft
                      ? 'Label detected'
                      : 'Auto-detecting...'}
              </Text>
              <Text className="text-muted-foreground mt-0.5 text-xs">
                {draft
                  ? 'Review the nutrition draft before saving'
                  : 'Searching database for nutritional info'}
              </Text>
            </View>
            <Icon as={LoaderCircle} className="text-primary size-5" />
          </View>

          {error ? (
            <View className="absolute left-4 right-4 top-4 rounded-xl bg-destructive/90 px-4 py-3">
              <Text className="text-sm text-white">{error}</Text>
            </View>
          ) : null}

          {uploadedImageUri ? (
            <View className="border-border absolute left-4 top-4 h-28 w-28 overflow-hidden rounded-2xl border bg-card">
              <RNImage
                source={{ uri: uploadedImageUri }}
                className="h-full w-full"
                resizeMode="cover"
              />
            </View>
          ) : null}

          {draft ? (
            <ScrollView
              className="absolute left-4 right-4 max-h-[360px] rounded-2xl"
              showsVerticalScrollIndicator={false}
              style={{ bottom: Math.max(insets.bottom + 80, 96) }}>
              <View className="bg-card/95 border-border rounded-2xl border p-5">
              <View className="mb-4 flex-row items-center gap-2">
                <Icon as={Sparkles} className="text-primary size-4" />
                <Text className="text-foreground text-base font-bold">Scanned Draft</Text>
              </View>
              <View className="gap-2">
                <DraftRow label="Food" value={draft.foodName} />
                <DraftRow label="Serving" value={draft.servingSizeLabel} />
                <DraftRow
                  label="Calories"
                  value={`${formatNumberGrouped(draft.caloriesPer100g)} kcal / 100g`}
                />
                <DraftRow label="Protein" value={`${draft.proteinPer100g}g / 100g`} />
                <DraftRow label="Carbs" value={`${draft.carbsPer100g}g / 100g`} />
                <DraftRow label="Fat" value={`${draft.fatsPer100g}g / 100g`} />
                <DraftRow label="Fiber" value={`${draft.fiberPer100g}g / 100g`} />
                <DraftRow label="Sugar" value={`${draft.sugarPer100g}g / 100g`} />
                <DraftRow label="Sodium" value={`${draft.sodiumMgPer100g}mg / 100g`} />
              </View>
              </View>
            </ScrollView>
          ) : null}
        </View>

        {draft ? (
          <View
            className="absolute right-0 left-0 flex-row gap-3 px-4"
            style={{ bottom: Math.max(insets.bottom, 16) }}>
            <Button
              variant="outline"
              className="h-12 flex-1 rounded-full"
              disabled={isWorking}
              onPress={editDraft}>
              <Icon as={Pencil} className="text-foreground size-4" />
              <Text>Edit</Text>
            </Button>
            <Button
              className="h-12 flex-1 rounded-full"
              disabled={isWorking}
              onPress={() => {
                void saveDraft();
              }}>
              <Icon as={Check} className="text-primary-foreground size-4" />
              <Text>{isSaving ? 'Saving...' : 'Save'}</Text>
            </Button>
          </View>
        ) : null}
      </View>
    </>
  );
}

function ScannerViewfinder({
  activeAction,
  bottomInset,
  cameraPermissionGranted,
  disabled,
  onCapture,
  onGallery,
  onRecent,
  onRequestCameraPermission,
}: {
  activeAction: 'scan' | 'upload' | null;
  bottomInset: number;
  cameraPermissionGranted: boolean;
  disabled: boolean;
  onCapture: () => void;
  onGallery: () => void;
  onRecent: () => void;
  onRequestCameraPermission: () => void;
}) {
  const isScanning = activeAction === 'scan';

  return (
    <View className="relative flex-1 overflow-hidden bg-black">
      {cameraPermissionGranted ? (
        <CameraView className="absolute inset-0 h-full w-full" facing="back" />
      ) : (
        <View className="absolute inset-0 items-center justify-center gap-4 bg-black px-8">
          <Text className="text-center text-lg font-bold text-white">Camera access needed</Text>
          <Text className="text-center text-sm leading-5 text-white/70">
            Allow camera access so Deficit PH can scan food and nutrition labels.
          </Text>
          <Button className="mt-2" disabled={disabled} onPress={onRequestCameraPermission}>
            <Text>Allow Camera</Text>
          </Button>
        </View>
      )}
      <View className="absolute inset-0 bg-black/10" />

      <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
        <View className="relative h-72 w-72">
          <View className="border-primary absolute left-0 top-0 h-10 w-10 rounded-tl-2xl border-l-4 border-t-4" />
          <View className="border-primary absolute right-0 top-0 h-10 w-10 rounded-tr-2xl border-r-4 border-t-4" />
          <View className="border-primary absolute bottom-0 left-0 h-10 w-10 rounded-bl-2xl border-b-4 border-l-4" />
          <View className="border-primary absolute bottom-0 right-0 h-10 w-10 rounded-br-2xl border-b-4 border-r-4" />
          <View className="bg-primary absolute left-0 right-0 top-1/2 h-0.5 shadow-lg shadow-green-500" />
        </View>
      </View>

      <View
        className="absolute left-0 right-0 items-center gap-6 px-6"
        style={{ bottom: Math.max(bottomInset + 16, 28) }}>
        <View className="rounded-full border border-white/20 bg-black/40 px-4 py-2">
          <Text className="text-center text-sm font-medium text-white">
            Align food or barcode within the frame
          </Text>
        </View>

        <View className="w-full flex-row items-center justify-center gap-8">
          <View className="items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 border border-white/30 bg-white/20"
              disabled={disabled}
              onPress={onGallery}>
              <Icon as={ImageIcon} className="size-5 text-white" />
            </Button>
            <Text className="text-[10px] font-bold uppercase text-white">Gallery</Text>
          </View>

          <Pressable
            className="h-20 w-20 items-center justify-center rounded-full border-4 border-white p-1 active:scale-95"
            disabled={disabled}
            onPress={onCapture}>
            <View className="h-full w-full items-center justify-center rounded-full bg-white">
              {isScanning ? <Icon as={LoaderCircle} className="text-primary size-7" /> : null}
            </View>
          </Pressable>

          <View className="items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 border border-white/30 bg-white/20"
              disabled={disabled}
              onPress={onRecent}>
              <Icon as={History} className="size-5 text-white" />
            </Button>
            <Text className="text-[10px] font-bold uppercase text-white">Recent</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function DraftRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-muted-foreground text-sm">{label}</Text>
      <Text className="text-foreground flex-1 text-right text-sm font-semibold">{value}</Text>
    </View>
  );
}

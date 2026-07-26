import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useUpsertUserFoodMutation } from '@/hooks/use-trackk-query';
import { getNutritionScanCapability } from '@/lib/ai-capability';
import { scanNutritionLabel, uploadNutritionLabelImage } from '@/lib/food-label-scanner';
import { formatNumberGrouped } from '@/lib/number-format';
import type { NutritionLabelDraft } from '@/lib/nutrition-label-parser';
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

function describeScanError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  // Availability is now checked PROACTIVELY before the scanner mounts, so a throw here is
  // a runtime failure (ineligible hardware/OS at call time, or a parse miss) — not the
  // "feature missing" case. This branch stays only as a defensive fallback.
  if (message.includes('available on iOS') || message.includes('custom dev build')) {
    return 'Hindi available ang Scan Label sa device na ito. You can still create and log the food manually.';
  }
  return message;
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
  const isWorking = activeAction != null || isSaving;
  // Proactive, synchronous capability check — decide BEFORE mounting the camera so we
  // never show a viewfinder that can only ever throw on this platform/build.
  const scanCapability = React.useMemo(() => getNutritionScanCapability(), []);

  const startScan = React.useCallback(async () => {
    setActiveAction('scan');
    setError(null);
    try {
      const result = await scanNutritionLabel();
      setUploadedImageUri(null);
      setDraft(result);
    } catch (scanError) {
      setError(describeScanError(scanError, 'Unable to scan nutrition label.'));
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
      setError(describeScanError(uploadError, 'Unable to upload nutrition label.'));
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

      router.replace({
        pathname: '/dashboard/add-food',
        params: {
          foodName: savedFood.name,
          kcalPer100g: valueParam(savedFood.kcalPer100g),
          proteinPer100g: valueParam(savedFood.proteinPer100g),
          carbsPer100g: valueParam(savedFood.carbsPer100g),
          fatsPer100g: valueParam(savedFood.fatsPer100g),
          fiberPer100g: valueParam(savedFood.fiberPer100g),
          sugarPer100g: valueParam(savedFood.sugarPer100g),
          sodiumMgPer100g: valueParam(savedFood.sodiumMgPer100g),
        },
      });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to save food log.';
      setError(message);
      console.error('[ScanLabelScreen.saveDraft]', saveError);
    } finally {
      setIsSaving(false);
    }
  }, [draft, upsertFoodMutation]);

  if (scanCapability.tier === 'unavailable') {
    const unavailableCopy =
      scanCapability.reason === 'unsupported-platform'
        ? 'Ang Scan Label ay para sa iPhone na may custom build. Pwede mo pa ring i-create at i-log ang food nang manu-mano.'
        : 'Hindi naka-enable ang scanner sa build na ito. Pwede mo pa ring i-create at i-log ang food nang manu-mano.';
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="bg-background flex-1">
          <View
            className="bg-background flex-row items-center px-4 pb-3"
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

          <View className="flex-1 items-center justify-center gap-4 px-8">
            <View className="bg-primary/10 h-16 w-16 items-center justify-center rounded-full">
              <Icon as={Sparkles} className="text-primary size-7" />
            </View>
            <Text className="text-foreground text-center text-lg font-bold">
              Scan Label is not available here
            </Text>
            <Text className="text-muted-foreground text-center text-sm leading-5">
              {unavailableCopy}
            </Text>
            <Button
              className="mt-1 rounded-md"
              onPress={() => router.replace('/dashboard/add-custom-food')}>
              <Icon as={Pencil} className="text-primary-foreground size-4" />
              <Text className="text-primary-foreground">Create Custom Food</Text>
            </Button>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="bg-background flex-1">
        <View
          className="bg-background flex-row items-center px-4 pb-3"
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

          {activeAction || draft ? (
            <View
              className="bg-background/95 absolute right-4 left-4 flex-row items-center gap-4 rounded-md p-4"
              style={{ top: Math.max(insets.top + 64, 80) }}>
              <View className="bg-primary/15 h-12 w-12 items-center justify-center rounded-md">
                <Icon as={Utensils} className="text-primary size-6" />
              </View>
              <View className="flex-1">
                <Text className="text-foreground text-sm font-bold">
                  {activeAction === 'upload'
                    ? 'Reading image...'
                    : activeAction === 'scan'
                      ? 'Scanning...'
                      : 'Food detected'}
                </Text>
                <Text className="text-muted-foreground mt-0.5 text-xs">
                  {draft ? 'Review the nutrition draft before saving' : 'Hold steady...'}
                </Text>
              </View>
              <Icon as={LoaderCircle} className="text-primary size-5" />
            </View>
          ) : null}

          {error ? (
            <View className="bg-background/95 absolute top-4 right-4 left-4 rounded-md px-4 py-3">
              <Text className="text-foreground text-sm font-semibold">{error}</Text>
              <Button
                variant="default"
                size="sm"
                className="mt-3 self-start rounded-md"
                onPress={() => router.push('/dashboard/add-custom-food')}>
                <Text className="text-primary-foreground">Create Custom Food</Text>
              </Button>
            </View>
          ) : null}

          {uploadedImageUri ? (
            <View className="bg-card absolute top-4 left-4 h-28 w-28 overflow-hidden rounded-md">
              <RNImage
                source={{ uri: uploadedImageUri }}
                className="h-full w-full"
                resizeMode="cover"
              />
            </View>
          ) : null}

          {draft ? (
            <ScrollView
              className="absolute right-4 left-4 max-h-[360px] rounded-md"
              showsVerticalScrollIndicator={false}
              style={{ bottom: Math.max(insets.bottom + 80, 96) }}>
              <View className="bg-card/95 rounded-md p-5">
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
              className="h-12 flex-1 rounded-md"
              disabled={isWorking}
              onPress={editDraft}>
              <Icon as={Pencil} className="text-foreground size-4" />
              <Text>Edit</Text>
            </Button>
            <Button
              className="h-12 flex-1 rounded-md"
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
            Allow camera access so trackk can scan food and nutrition labels.
          </Text>
          <Button className="mt-2" disabled={disabled} onPress={onRequestCameraPermission}>
            <Text>Allow Camera</Text>
          </Button>
        </View>
      )}
      <View className="absolute inset-0 bg-black/10" />

      <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
        <View className="relative h-72 w-72">
          <View className="border-primary absolute top-0 left-0 h-10 w-10 rounded-tl-2xl border-t-4 border-l-4" />
          <View className="border-primary absolute top-0 right-0 h-10 w-10 rounded-tr-2xl border-t-4 border-r-4" />
          <View className="border-primary absolute bottom-0 left-0 h-10 w-10 rounded-bl-2xl border-b-4 border-l-4" />
          <View className="border-primary absolute right-0 bottom-0 h-10 w-10 rounded-br-2xl border-r-4 border-b-4" />
          <View className="bg-primary absolute top-1/2 right-0 left-0 h-0.5" />
        </View>
      </View>

      <View
        className="absolute right-0 left-0 items-center gap-6 px-6"
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
            <Text className="text-[10px] font-bold text-white uppercase">Gallery</Text>
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
            <Text className="text-[10px] font-bold text-white uppercase">Recent</Text>
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

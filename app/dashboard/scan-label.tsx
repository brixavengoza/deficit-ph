import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useUpsertUserFoodMutation } from '@/hooks/use-trackk-query';
import { getNutritionScanCapability } from '@/lib/ai-capability';
import { readNutritionLabelImage, readNutritionLabelQuick } from '@/lib/food-label-scanner';
import { formatNumberGrouped } from '@/lib/number-format';
import {
  isPlausibleNutritionDraft,
  type NutritionLabelDraft,
} from '@/lib/nutrition-label-parser';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack } from 'expo-router';
import {
  ArrowLeft,
  Check,
  History,
  Image as ImageIcon,
  LoaderCircle,
  Pencil,
  RotateCcw,
  Sparkles,
} from 'lucide-react-native';
import React from 'react';
import { Animated, Easing, Image as RNImage, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Viewfinder frame is h-72 / w-72 in Uniwind units, which is 288px.
const FRAME_SIZE = 288;
const SCAN_LINE_HEIGHT = 2;

// How often the live loop samples a frame. Captures are ~300-800 ms on low-end Android,
// so this yields roughly one analysis per second without starving the preview.
const AUTO_SCAN_INTERVAL_MS = 1400;

function valueParam(value: number) {
  return Number.isFinite(value) ? String(value) : '0';
}

function describeScanError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  // Availability is checked PROACTIVELY before the scanner mounts, so a throw here is a
  // runtime failure (blurred frame, no text found) — not the "feature missing" case.
  if (message.includes('custom dev build') || message.includes('custom mobile build')) {
    return 'Scan Label is not available in this build. You can still create and log the food manually.';
  }
  return message;
}

export default function ScanLabelScreen() {
  const insets = useSafeAreaInsets();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = React.useRef<CameraView>(null);
  const [isCameraReady, setIsCameraReady] = React.useState(false);
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
  // Guards the loop AND the manual capture: expo-camera dislikes overlapping captures.
  const captureInFlightRef = React.useRef(false);

  // Live auto-detect: silently sample a frame every ~1.4 s (no shutter sound, no shutter
  // animation), OCR it, and auto-fill only when the deterministic parser returns a
  // PLAUSIBLE nutrition read — a menu or receipt in frame never auto-accepts.
  React.useEffect(() => {
    if (!cameraPermission?.granted || !isCameraReady || draft || isWorking || error) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled || captureInFlightRef.current) return;
      captureInFlightRef.current = true;
      try {
        const photo = await cameraRef.current?.takePictureAsync({
          quality: 0.5,
          skipProcessing: true,
          shutterSound: false,
        });
        if (cancelled || !photo?.uri) return;
        const candidate = await readNutritionLabelQuick(photo.uri);
        if (cancelled) return;
        if (isPlausibleNutritionDraft(candidate)) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setUploadedImageUri(null);
          setDraft(candidate);
        }
      } catch {
        // Quiet by design: a blurry or textless frame just means we try the next one.
      } finally {
        captureInFlightRef.current = false;
      }
    };

    const id = setInterval(() => {
      void tick();
    }, AUTO_SCAN_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [cameraPermission?.granted, draft, error, isCameraReady, isWorking]);

  // Manual capture: one deliberate shot through the FULL pipeline (OCR + the generative
  // draft where this device supports it, parser fallback otherwise).
  const startScan = React.useCallback(async () => {
    if (captureInFlightRef.current) return;
    setActiveAction('scan');
    setError(null);
    captureInFlightRef.current = true;
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
        shutterSound: false,
      });
      if (!photo?.uri) throw new Error('Could not capture the photo. Please try again.');
      const result = await readNutritionLabelImage(photo.uri);
      setUploadedImageUri(null);
      setDraft(result);
    } catch (scanError) {
      setError(describeScanError(scanError, 'Unable to scan nutrition label.'));
      console.error('[ScanLabelScreen.startScan]', scanError);
    } finally {
      captureInFlightRef.current = false;
      setActiveAction(null);
    }
  }, []);

  // A scan that read no nutrition produces an all-zero draft. Saving that creates a
  // 0 kcal food, and with community sharing on it would spread to other users, so the
  // save is blocked and the user is pointed at Edit instead.
  const canSaveDraft = (draft?.caloriesPer100g ?? 0) > 0;

  const resetScan = React.useCallback(() => {
    setDraft(null);
    setUploadedImageUri(null);
    setError(null);
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
      const result = await readNutritionLabelImage(imageUri);
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
          // Carry serving info so "1 serving" of a scanned "1 can (155g)" food weighs
          // 155 g here too, not the 100 g default.
          ...(savedFood.servingSizeLabel ? { servingSizeLabel: savedFood.servingSizeLabel } : {}),
          ...(savedFood.servingGrams != null && savedFood.servingGrams > 0
            ? { servingGrams: String(savedFood.servingGrams) }
            : {}),
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
        ? 'Scan Label needs an iPhone or Android custom build. You can still create and log food manually.'
        : 'The scanner is not enabled in this build. You can still create and log food manually.';
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
            autoDetecting={Boolean(
              cameraPermission?.granted && isCameraReady && !draft && !isWorking && !error
            )}
            bottomInset={insets.bottom}
            cameraPermissionGranted={cameraPermission?.granted ?? false}
            cameraRef={cameraRef}
            controlsVisible={!draft}
            disabled={isWorking}
            onCameraReady={() => setIsCameraReady(true)}
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

          {error ? (
            <View className="bg-background/95 absolute top-4 right-4 left-4 rounded-md px-4 py-3">
              <Text className="text-foreground text-sm font-semibold">{error}</Text>
              <View className="mt-3 flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start rounded-md"
                  onPress={resetScan}>
                  <Icon as={RotateCcw} className="text-foreground size-4" />
                  <Text>Try Again</Text>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="self-start rounded-md"
                  onPress={() => router.push('/dashboard/add-custom-food')}>
                  <Text className="text-primary-foreground">Create Custom Food</Text>
                </Button>
              </View>
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
                  <Text className="text-foreground flex-1 text-base font-bold">Scanned Draft</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Scan again"
                    onPress={resetScan}
                    className="bg-background-subtle h-8 flex-row items-center gap-1 rounded-md px-2">
                    <Icon as={RotateCcw} className="text-foreground size-3.5" />
                    <Text className="text-foreground text-xs font-semibold">Scan Again</Text>
                  </Pressable>
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

                {canSaveDraft ? null : (
                  <View className="bg-warning/10 mt-4 rounded-md px-3 py-2.5">
                    <Text className="text-warning text-xs leading-4">
                      We could not read the nutrition facts from that photo. Move closer to the
                      label and scan again, or tap Edit to type the values yourself.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          ) : null}
        </View>

        {draft ? (
          <View
            className="absolute right-0 left-0 flex-row gap-3 px-4"
            // zIndex/elevation make the stacking explicit rather than relying on sibling
            // order, which does not settle touch handling reliably across platforms.
            style={{ bottom: Math.max(insets.bottom, 16), zIndex: 20, elevation: 20 }}>
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
              disabled={isWorking || !canSaveDraft}
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


/**
 * The sweeping line inside the viewfinder.
 *
 * This replaced a floating status card: the movement itself says "scanning", which
 * reads as a real scanner instead of a notification sitting on top of the camera.
 *
 * Uses React Native's built-in Animated with the native driver rather than Reanimated.
 * A single looping translateY runs entirely on the native thread either way, so it
 * stays smooth on the low-end Android phones this app targets, with no extra runtime.
 */
function ScanLine({ active }: { active: boolean }) {
  const progress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!active) {
      progress.stopAnimation();
      progress.setValue(0);
      return;
    }

    const sweep = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    sweep.start();
    return () => sweep.stop();
  }, [active, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, FRAME_SIZE - SCAN_LINE_HEIGHT],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{ transform: [{ translateY }] }}
      className="absolute right-0 left-0 top-0">
      {/* Soft band behind the line so the sweep reads as a beam, not a hairline. */}
      <View className="bg-primary/25 absolute right-0 -bottom-4 left-0 h-4" />
      <View className="bg-primary/15 absolute right-0 -top-4 left-0 h-4" />
      <View className="bg-primary h-0.5 w-full" />
    </Animated.View>
  );
}

function ScannerViewfinder({
  activeAction,
  autoDetecting,
  bottomInset,
  cameraPermissionGranted,
  cameraRef,
  controlsVisible,
  disabled,
  onCameraReady,
  onCapture,
  onGallery,
  onRecent,
  onRequestCameraPermission,
}: {
  activeAction: 'scan' | 'upload' | null;
  autoDetecting: boolean;
  controlsVisible: boolean;
  bottomInset: number;
  cameraPermissionGranted: boolean;
  cameraRef: React.RefObject<CameraView | null>;
  disabled: boolean;
  onCameraReady: () => void;
  onCapture: () => void;
  onGallery: () => void;
  onRecent: () => void;
  onRequestCameraPermission: () => void;
}) {
  // The sweep runs while the auto-detect loop is sampling AND during a manual capture,
  // so the camera never looks idle while work is happening.
  const isScanning = autoDetecting || activeAction !== null;
  // The shutter spinner is only for a deliberate capture. Reusing isScanning here would
  // leave the shutter spinning permanently while auto-detect idles.
  const isCapturing = activeAction === 'scan';

  return (
    <View className="relative flex-1 overflow-hidden bg-black">
      {cameraPermissionGranted ? (
        <CameraView
          ref={cameraRef}
          className="absolute inset-0 h-full w-full"
          facing="back"
          animateShutter={false}
          onCameraReady={onCameraReady}
        />
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
          {isScanning ? (
            <ScanLine active />
          ) : (
            <View className="bg-primary/50 absolute top-1/2 right-0 left-0 h-0.5" />
          )}
        </View>
      </View>

      {/* Hidden while a draft is under review: the shutter/gallery/history row sits at
          the same height as the Edit and Save buttons, so it both looked wrong and
          swallowed taps meant for those buttons. */}
      <View
        pointerEvents={controlsVisible ? 'auto' : 'none'}
        className="absolute right-0 left-0 items-center gap-6 px-6"
        style={{
          bottom: Math.max(bottomInset + 16, 28),
          opacity: controlsVisible ? 1 : 0,
        }}>
        {autoDetecting ? (
          <View className="rounded-full border border-white/20 bg-black/40 px-4 py-2">
            <Text className="text-center text-sm font-medium text-white">
              Hold steady, scanning automatically
            </Text>
          </View>
        ) : null}

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
              {isCapturing ? <Icon as={LoaderCircle} className="text-primary size-7" /> : null}
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

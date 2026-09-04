/**
 * Platform-branching tests for the on-device AI capability layer.
 *
 * These are the "iOS vs Android" cases that otherwise need two physical devices: we mock
 * `Platform.OS`, the native iOS `FoodLabelScanner` bridge, and the Android ML Kit Expo
 * module, then assert the capability verdict for each combination. Each scenario
 * re-imports the module in isolation because native modules are read at load time.
 */

type Scanner = {
  scanNutritionLabel?: () => void;
  recognizeNutritionLabelImage?: () => void;
  recognizeText?: () => void;
};

type MlkitModule = { recognizeText?: () => void };

function loadWith(platform: string, scanner: Scanner | undefined, mlkit?: MlkitModule) {
  let mod!: typeof import('@/lib/ai-capability');
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({
      Platform: { OS: platform },
      NativeModules: { FoodLabelScanner: scanner },
    }));
    // The real package throws at import time when its native module is missing — mirror
    // that when the scenario doesn't provide a mock, so the lazy-require guard is tested.
    jest.doMock('@infinitered/react-native-mlkit-text-recognition', () => {
      if (!mlkit) throw new Error("Cannot find native module 'RNMLKitTextRecognition'");
      return mlkit;
    });
    mod = require('@/lib/ai-capability');
  });
  return mod;
}

afterEach(() => {
  jest.resetModules();
  jest.dontMock('react-native');
  jest.dontMock('@infinitered/react-native-mlkit-text-recognition');
});

describe('getNutritionScanCapability: cross-platform', () => {
  it('iOS with a linked scanner bridge reports the generative tier', () => {
    const { getNutritionScanCapability } = loadWith('ios', {
      scanNutritionLabel: () => {},
      recognizeNutritionLabelImage: () => {},
    });
    expect(getNutritionScanCapability()).toEqual({
      feature: 'nutrition-scan',
      tier: 'generative',
      generativeAvailable: true,
      reason: 'available',
    });
  });

  it('Android with the ML Kit module reports the ocr tier (not generative)', () => {
    const { getNutritionScanCapability } = loadWith('android', undefined, {
      recognizeText: () => {},
    });
    expect(getNutritionScanCapability()).toEqual({
      feature: 'nutrition-scan',
      tier: 'ocr',
      generativeAvailable: false,
      reason: 'available',
    });
  });

  it('Android without the ML Kit module reports module-not-linked (require throws)', () => {
    const { getNutritionScanCapability } = loadWith('android', undefined);
    const capability = getNutritionScanCapability();
    expect(capability.tier).toBe('unavailable');
    expect(capability.reason).toBe('module-not-linked');
  });

  it('the iOS bridge does NOT count as an Android scanner', () => {
    const { getNutritionScanCapability } = loadWith('android', {
      recognizeNutritionLabelImage: () => {},
    });
    expect(getNutritionScanCapability().tier).toBe('unavailable');
  });

  it('iOS without the bridge reports module-not-linked', () => {
    const { getNutritionScanCapability } = loadWith('ios', undefined);
    const capability = getNutritionScanCapability();
    expect(capability.tier).toBe('unavailable');
    expect(capability.reason).toBe('module-not-linked');
  });

  it('web can never link a module -> unsupported-platform', () => {
    const { getNutritionScanCapability } = loadWith('web', undefined);
    expect(getNutritionScanCapability().reason).toBe('unsupported-platform');
  });
});

describe('isNutritionScannerLinked: any iOS bridge method counts', () => {
  it('true when only the still-image method is present', () => {
    expect(
      loadWith('ios', { recognizeNutritionLabelImage: () => {} }).isNutritionScannerLinked()
    ).toBe(true);
  });

  it('true when only the live-scan method is present', () => {
    expect(loadWith('ios', { scanNutritionLabel: () => {} }).isNutritionScannerLinked()).toBe(true);
  });

  it('true when only the fast OCR method is present (newer builds)', () => {
    expect(loadWith('ios', { recognizeText: () => {} }).isNutritionScannerLinked()).toBe(true);
  });

  it('false when the module is present but exposes no methods', () => {
    expect(loadWith('ios', {}).isNutritionScannerLinked()).toBe(false);
  });
});

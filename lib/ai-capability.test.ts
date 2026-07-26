/**
 * Platform-branching tests for the on-device AI capability layer.
 *
 * These are the "iOS vs Android" cases that otherwise need two physical devices: we mock
 * `Platform.OS` and the native `FoodLabelScanner` module and assert the capability verdict
 * for each combination. Each scenario re-imports the module in isolation because it reads
 * `NativeModules.FoodLabelScanner` at load time.
 */

type Scanner = {
  scanNutritionLabel?: () => void;
  recognizeNutritionLabelImage?: () => void;
};

function loadWith(platform: string, scanner: Scanner | undefined) {
  let mod!: typeof import('@/lib/ai-capability');
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({
      Platform: { OS: platform },
      NativeModules: { FoodLabelScanner: scanner },
    }));
    mod = require('@/lib/ai-capability');
  });
  return mod;
}

afterEach(() => {
  jest.resetModules();
  jest.dontMock('react-native');
});

describe('getNutritionScanCapability — cross-platform', () => {
  it('iOS with a linked scanner reports the generative tier', () => {
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

  it('Android with a linked scanner reports the ocr tier (not generative)', () => {
    const { getNutritionScanCapability } = loadWith('android', {
      recognizeNutritionLabelImage: () => {},
    });
    expect(getNutritionScanCapability()).toEqual({
      feature: 'nutrition-scan',
      tier: 'ocr',
      generativeAvailable: false,
      reason: 'available',
    });
  });

  it('mobile without the native module reports module-not-linked', () => {
    const { getNutritionScanCapability } = loadWith('android', undefined);
    const capability = getNutritionScanCapability();
    expect(capability.tier).toBe('unavailable');
    expect(capability.reason).toBe('module-not-linked');
  });

  it('web can never link the module -> unsupported-platform', () => {
    const { getNutritionScanCapability } = loadWith('web', undefined);
    expect(getNutritionScanCapability().reason).toBe('unsupported-platform');
  });
});

describe('isNutritionScannerLinked — either capability counts', () => {
  it('true when only the still-image method is present (Android path)', () => {
    expect(loadWith('android', { recognizeNutritionLabelImage: () => {} }).isNutritionScannerLinked()).toBe(
      true
    );
  });

  it('true when only the live-scan method is present (iOS path)', () => {
    expect(loadWith('ios', { scanNutritionLabel: () => {} }).isNutritionScannerLinked()).toBe(true);
  });

  it('false when the module is present but exposes neither method', () => {
    expect(loadWith('ios', {}).isNutritionScannerLinked()).toBe(false);
  });
});

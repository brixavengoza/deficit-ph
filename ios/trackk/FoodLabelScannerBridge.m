#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(FoodLabelScanner, NSObject)

RCT_EXTERN_METHOD(scanNutritionLabel:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(recognizeNutritionLabelImage:(NSString *)imageUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

@end

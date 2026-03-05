import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { type OnboardingFormValues } from '@/lib/onboarding-form';
import { useRouter } from 'expo-router';
import { Controller, useFormContext } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

export default function OnboardingStepOneScreen() {
  const router = useRouter();
  const { control, watch, setValue } = useFormContext<OnboardingFormValues>();

  const selectedSex = watch('sex');
  const age = watch('age');
  const heightCm = watch('heightCm');
  const weightKg = watch('weightKg');
  const canProceed =
    Boolean(selectedSex) &&
    [age, heightCm, weightKg].every(
      (value) => typeof value === 'string' && value.trim().length > 0
    );

  return (
    <KeyboardAvoidingView
      className="bg-background-light flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerClassName="flex-grow"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View className="bg-background-light flex-1">
          <View className="px-6 pt-4 pb-2">
            <Text className="text-foreground mt-2 text-3xl font-bold tracking-tight">
              Tell us about yourself
            </Text>
            <Text className="text-muted-foreground mt-2 text-base">
              Para ma-calculate ang deficit mo.
            </Text>
          </View>

          <View className="flex-1 px-6 pt-2 pb-28">
            <View className="gap-6">
              <View>
                <Text className="text-foreground mb-3 text-sm font-semibold">Gender</Text>
                <View className="bg-background-subtle flex-row rounded-full p-1">
                  <Button
                    variant={selectedSex === 'male' ? 'default' : 'ghost'}
                    className="h-11 flex-1 rounded-full"
                    onPress={() =>
                      setValue('sex', 'male', {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                    }>
                    <Text
                      className={
                        selectedSex === 'male'
                          ? 'text-primary-foreground font-semibold'
                          : 'text-muted-foreground font-semibold'
                      }>
                      Male
                    </Text>
                  </Button>
                  <Button
                    variant={selectedSex === 'female' ? 'default' : 'ghost'}
                    className="h-11 flex-1 rounded-full"
                    onPress={() =>
                      setValue('sex', 'female', {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                    }>
                    <Text
                      className={
                        selectedSex === 'female'
                          ? 'text-primary-foreground font-semibold'
                          : 'text-muted-foreground font-semibold'
                      }>
                      Female
                    </Text>
                  </Button>
                </View>
              </View>

              <View className="gap-4">
                <View className="gap-1.5">
                  <Text className="text-foreground text-sm font-semibold">Age</Text>
                  <View className="relative justify-center">
                    <Controller
                      control={control}
                      name="age"
                      render={({ field: { value, onChange, onBlur } }) => (
                        <Input
                          variant="step"
                          value={value ?? ''}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          keyboardType="number-pad"
                          placeholder="20"
                          className="bg-surface focus:border-primary h-14 rounded-xl border-transparent pl-5"
                        />
                      )}
                    />
                    <Text className="text-muted-foreground absolute right-4 text-sm font-medium">
                      years
                    </Text>
                  </View>
                </View>

                <View className="gap-1.5">
                  <Text className="text-foreground text-sm font-semibold">Height</Text>
                  <View className="relative justify-center">
                    <Controller
                      control={control}
                      name="heightCm"
                      render={({ field: { value, onChange, onBlur } }) => (
                        <Input
                          value={value ?? ''}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="150"
                          keyboardType="number-pad"
                          className="bg-surface h-14 rounded-xl border-transparent pl-5"
                        />
                      )}
                    />
                    <Text className="text-muted-foreground absolute right-4 text-sm font-medium">
                      cm
                    </Text>
                  </View>
                </View>

                <View className="gap-1.5">
                  <Text className="text-foreground text-sm font-semibold">Current Weight</Text>
                  <View className="relative justify-center">
                    <Controller
                      control={control}
                      name="weightKg"
                      render={({ field: { value, onChange, onBlur } }) => (
                        <Input
                          value={value ?? ''}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="80"
                          keyboardType="decimal-pad"
                          className="bg-surface h-14 rounded-xl border-transparent pl-5"
                        />
                      )}
                    />
                    <Text className="text-muted-foreground absolute right-4 text-sm font-medium">
                      kg
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="from-background-light via-background-light absolute right-0 bottom-0 left-0 bg-gradient-to-t to-transparent px-6">
        <Button
          variant="default"
          size="lg"
          className="h-14 w-full rounded-full"
          disabled={!canProceed}
          onPress={() => {
            if (!canProceed) return;
            console.log('[onboarding step 1]', { sex: selectedSex, age, heightCm, weightKg });
            router.push('/onboarding/step-2');
          }}>
          <Text className="text-primary-foreground text-lg font-bold">Next</Text>
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

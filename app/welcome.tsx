import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { getInitialAppRoute } from '@/lib/local-data';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

export default function WelcomeScreen() {
  const router = useRouter();
  const [isStarting, setIsStarting] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;
    void getInitialAppRoute()
      .then((nextRoute) => {
        if (isMounted && nextRoute === '/dashboard') router.replace('/dashboard');
      })
      .catch((error) => {
        console.error('[WelcomeScreen.getInitialAppRoute]', error);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleContinue = async () => {
    setIsStarting(true);
    try {
      const nextRoute = await getInitialAppRoute();
      router.replace(nextRoute);
    } catch (error) {
      console.error('[WelcomeScreen.handleContinue]', error);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="bg-background flex-1">
        <View className="bg-primary relative flex-1 items-center justify-center overflow-hidden">
          <View className="absolute -top-18 -left-14 h-72 w-72 rounded-full bg-white/10" />
          <View className="absolute -right-10 bottom-28 h-52 w-52 rounded-full bg-emerald-200/25" />

          <MaterialIcons name="local-fire-department" size={96} color="#FFFFFF" />

          <View className="mt-4 mb-12 items-center px-6">
            <Text className="text-center text-[42px] font-extrabold tracking-tight text-white">
              Deficit PH
            </Text>
            <Text className="mt-2 max-w-xs text-center text-base leading-6 font-semibold text-white/90">
              Hit your macros, and stay consistent
            </Text>
          </View>
        </View>

        <View className="bg-background -mt-8 rounded-[40px] px-8 pt-4 pb-10 shadow-lg shadow-black/10">
          <View className="items-center gap-4 pt-5">
            <View className="mb-1 items-center gap-2">
              <Text className="text-foreground text-center text-[30px] font-extrabold tracking-tight">
                Run toward your goals
              </Text>
              <Text className="text-muted-foreground text-center text-sm leading-5">
                Track calories, food history, custom foods, hydration, and weight fully offline.
              </Text>
            </View>

            <Button
              size="lg"
              disabled={isStarting}
              className="h-14 w-full max-w-[360px] rounded-full"
              onPress={() => {
                void handleContinue();
              }}>
              <Text>{isStarting ? 'Loading...' : 'Continue'}</Text>
            </Button>
          </View>
        </View>
      </View>
    </>
  );
}

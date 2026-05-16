import { getInitialAppRoute } from '@/lib/local-data';
import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

export default function Index() {
  const [route, setRoute] = React.useState<'/onboarding/step-1' | '/dashboard' | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    void getInitialAppRoute()
      .then((nextRoute) => {
        if (isMounted) setRoute(nextRoute);
      })
      .catch((error) => {
        console.error('[Index.getInitialAppRoute]', error);
        if (isMounted) setRoute('/onboarding/step-1');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {route ? <Redirect href={route} /> : <View className="bg-background flex-1" />}
    </>
  );
}

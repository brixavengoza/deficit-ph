import { getInitialAppRoute } from '@/lib/local-data';
import { Redirect } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

export default function Onboarding() {
  const [route, setRoute] = React.useState<'/onboarding/step-1' | '/dashboard' | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    void getInitialAppRoute()
      .then((nextRoute) => {
        if (isMounted) setRoute(nextRoute);
      })
      .catch((error) => {
        console.error('[Onboarding.getInitialAppRoute]', error);
        if (isMounted) setRoute('/onboarding/step-1');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return route ? <Redirect href={route} /> : <View className="bg-background flex-1" />;
}

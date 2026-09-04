import { getInitialAppRoute } from '@/lib/local-data';
import { useAuthStore } from '@/stores/use-auth-store';
import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

export default function Index() {
  const status = useAuthStore((state) => state.status);
  const [route, setRoute] = React.useState<'/welcome' | '/dashboard' | null>(null);

  React.useEffect(() => {
    // Only resolve the local route once signed in. Without this check, a signed-out
    // launch would race the root auth guard: this screen redirecting to /welcome while
    // the guard redirects to /auth/login, and whichever lands last wins.
    if (status !== 'signed-in') {
      setRoute(null);
      return;
    }

    let isMounted = true;
    void getInitialAppRoute()
      .then((nextRoute) => {
        if (isMounted) setRoute(nextRoute === '/dashboard' ? '/dashboard' : '/welcome');
      })
      .catch((error) => {
        console.error('[Index.getInitialAppRoute]', error);
        if (isMounted) setRoute('/welcome');
      });

    return () => {
      isMounted = false;
    };
  }, [status]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {status === 'signed-in' && route ? (
        <Redirect href={route} />
      ) : (
        <View className="bg-background flex-1" />
      )}
    </>
  );
}

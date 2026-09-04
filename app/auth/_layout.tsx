import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Sign-in is a gate, not part of the app's browsing history.
        animation: 'fade',
      }}
    />
  );
}

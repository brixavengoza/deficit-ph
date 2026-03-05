import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { View } from 'react-native';

export default function WelcomeScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="bg-background-light flex-1">
        <View className="bg-primary relative flex-1 items-center justify-center overflow-hidden">
          <View className="absolute -top-18 -left-14 h-72 w-72 rounded-full bg-white/10" />
          <View className="absolute -right-10 bottom-28 h-52 w-52 rounded-full bg-emerald-200/25" />

          <MaterialIcons name="local-fire-department" size={96} color="#FFFFFF" />

          <View className="mt-4 mb-12 items-center px-6">
            <Text className="text-center text-[42px] font-extrabold tracking-tight text-white">
              Deficit PH
            </Text>
            <Text className="mt-2 max-w-xs text-center text-base leading-6 font-semibold text-white/90">
              Hit your deficit, and stay consistent
            </Text>
          </View>
        </View>

        <View className="bg-background-light -mt-8 rounded-t-[40px] px-8 pt-4 pb-10 shadow-lg shadow-black/10">
          <View className="items-center pb-2">
            <View className="bg-border h-1.5 w-12 rounded-full" />
          </View>

          <View className="items-center gap-4 pt-5">
            <View className="mb-1 items-center gap-2">
              <Text className="text-foreground text-center text-[30px] font-extrabold tracking-tight">
                Run toward your goals
              </Text>
              <Text className="text-muted-foreground text-center text-sm leading-5">
                Track calories, stay in deficit, and build momentum.
              </Text>
            </View>

            <Button
              variant="default"
              size="lg"
              className="shadow-primary/35 h-14 w-full max-w-[360px] flex-row gap-2 rounded-full shadow-lg"
              onPress={() => router.replace('/auth/signup')}>
              <Text className="text-primary-foreground text-lg font-extrabold tracking-tight">
                Get Started
              </Text>
              <Icon as={ArrowRight} className="text-primary-foreground size-5" />
            </Button>

            <Button
              variant="ghost"
              size="default"
              className="h-12 w-full max-w-[360px] rounded-full bg-transparent"
              onPress={() => router.push('/auth/login')}>
              <Text className="text-muted-foreground text-sm font-bold">
                I already have an account
              </Text>
            </Button>
          </View>
        </View>
      </View>
    </>
  );
}

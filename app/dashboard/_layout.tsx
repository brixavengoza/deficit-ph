import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Link, Stack, router, usePathname } from 'expo-router';
import { BarChart3, BookOpenText, Home, Plus, User } from 'lucide-react-native';
import { Platform, Pressable, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

enum TabRoutes {
  Dashboard = '/dashboard',
  Log = '/dashboard/log',
  Progress = '/dashboard/progress',
  Profile = '/dashboard/profile',
}

function TabItem({
  href,
  label,
  icon,
  active,
}: {
  href: TabRoutes;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Pressable
      className="w-14 items-center gap-1"
      onPress={() => {
        if (!active) router.replace(href);
      }}>
      <Icon
        as={icon}
        className={active ? 'text-primary size-[26px]' : 'text-muted-foreground size-[26px]'}
      />
      <Text
        className={
          active
            ? 'text-primary text-[11px] font-bold'
            : 'text-muted-foreground text-[11px] font-medium'
        }>
        {label}
      </Text>
    </Pressable>
  );
}

export default function DashboardLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const isHome = pathname === '/dashboard' || pathname === '/dashboard/';
  const isLog = pathname.startsWith('/dashboard/log');
  const isLogSearch = pathname.startsWith('/dashboard/log-food-search');
  const isAddFood = pathname.startsWith('/dashboard/add-food');
  const isAddCustomFood = pathname.startsWith('/dashboard/add-custom-food');
  const isSavedFoods = pathname.startsWith('/dashboard/saved-foods');
  const isProgress = pathname.startsWith('/dashboard/progress');
  const isProfile = pathname.startsWith('/dashboard/profile');
  const isSubscriptionPlan = pathname.startsWith('/dashboard/subscription-plan');
  const isPrivacyPolicy = pathname.startsWith('/dashboard/privacy-policy');
  const topSafeAreaBg =
    isLog || isLogSearch || isAddFood || isAddCustomFood || isSavedFoods ? '#ffffff' : '#f8fbfa';

  return (
    <>
      <View className="bg-background flex-1">
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: topSafeAreaBg }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ gestureEnabled: false, animation: 'none' }} />
            <Stack.Screen name="log" options={{ gestureEnabled: false, animation: 'none' }} />
            <Stack.Screen name="progress" options={{ gestureEnabled: false, animation: 'none' }} />
            <Stack.Screen name="profile" options={{ gestureEnabled: false, animation: 'none' }} />
            <Stack.Screen name="subscription-plan" options={{ gestureEnabled: true }} />
            <Stack.Screen name="privacy-policy" options={{ gestureEnabled: true }} />
            <Stack.Screen name="log-food-search" options={{ gestureEnabled: true }} />
            <Stack.Screen name="saved-foods" options={{ gestureEnabled: true }} />
            <Stack.Screen name="add-food" options={{ gestureEnabled: true }} />
            <Stack.Screen name="add-custom-food" options={{ gestureEnabled: true }} />
          </Stack>
        </SafeAreaView>

        {isLogSearch ||
        isSavedFoods ||
        isAddFood ||
        isAddCustomFood ||
        isSubscriptionPlan ||
        isPrivacyPolicy ? null : (
          <View
            pointerEvents="box-none"
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
            <View className="relative h-16 w-full">
              <View
                pointerEvents="none"
                className="absolute inset-0"
                style={{
                  shadowColor: '#000',
                  shadowOpacity: Platform.OS === 'ios' ? 0.08 : 0,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: -6 },
                  elevation: 0,
                }}>
                <Svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 375 80"
                  preserveAspectRatio="none"
                  className="absolute inset-0">
                  <Path
                    d="M 0 0 L 127 0 C 155 0 157 44 187 44 C 220 44 220 0 252 0 L 375 0 L 375 80 L 0 80 Z"
                    fill="#FFFFFF"
                  />
                </Svg>
              </View>

              <View className="absolute inset-0 flex-row items-center justify-between bg-transparent px-6">
                <View className="mt-3 flex-row items-center gap-8">
                  <TabItem href={TabRoutes.Dashboard} label="Home" icon={Home} active={isHome} />
                  <TabItem href={TabRoutes.Log} label="Log" icon={BookOpenText} active={isLog} />
                </View>

                <View className="mt-3 flex-row items-center gap-8">
                  <TabItem
                    href={TabRoutes.Progress}
                    label="Progress"
                    icon={BarChart3}
                    active={isProgress}
                  />
                  <TabItem
                    href={TabRoutes.Profile}
                    label="Profile"
                    icon={User}
                    active={isProfile}
                  />
                </View>
              </View>

              <View pointerEvents="box-none" className="absolute inset-x-0 -top-6 items-center">
                <Link href="/dashboard/log-food-search" asChild>
                  <Pressable>
                    <View className="bg-primary h-16 w-16 items-center justify-center rounded-full border-4 border-white shadow-lg shadow-green-700/25">
                      <Icon as={Plus} className="size-8 text-white" />
                    </View>
                  </Pressable>
                </Link>
              </View>
            </View>

            <View style={{ height: insets.bottom, backgroundColor: '#ffffff' }} />
          </View>
        )}
      </View>
    </>
  );
}

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Database,
  Lock,
  Mail,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react-native';
import React from 'react';
import { Alert, Linking, Pressable, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function SectionCard({
  icon,
  iconWrapClassName,
  iconClassName,
  title,
  subtitle,
  children,
}: {
  icon: typeof Database;
  iconWrapClassName: string;
  iconClassName: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-card rounded-md p-5">
      <View className="mb-4 flex-row items-center gap-3">
        <View className={`h-10 w-10 items-center justify-center rounded-md ${iconWrapClassName}`}>
          <Icon as={icon} className={`size-5 ${iconClassName}`} />
        </View>
        <View className="flex-1">
          <Text className="text-foreground text-base font-bold">{title}</Text>
          {subtitle ? <Text className="text-muted-foreground text-xs">{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="bg-primary mt-1 h-2 w-2 rounded-full" />
      <Text className="text-muted-foreground flex-1 text-sm leading-5">{children}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();

  async function handleShare() {
    try {
      await Share.share({
        message:
          'trackk Privacy Policy\n\nThis policy explains how your health and account data is handled in the app.',
      });
    } catch {
      // noop: user cancelled or share is unavailable
    }
  }

  function handleEmailPress() {
    Linking.openURL('mailto:privacy@deficitph.com').catch(() => {
      Alert.alert(
        'No email app found',
        'Email us directly at privacy@deficitph.com from any device with a mail app set up.'
      );
    });
  }

  return (
    <View className="bg-background flex-1">
      <View className="bg-primary/10 absolute inset-x-0 top-0 h-36" />

      <View className="bg-background/90 px-4 pb-3" style={{ paddingTop: insets.top + 12 }}>
        <View className="relative flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="bg-card h-10 w-10 items-center justify-center rounded-full">
            <Icon as={ArrowLeft} className="text-foreground size-5" />
          </Pressable>

          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <Text className="text-foreground text-base font-bold">Privacy Policy</Text>
          </View>

          <Pressable
            onPress={handleShare}
            className="bg-card h-10 w-10 items-center justify-center rounded-full">
            <Icon as={Share2} className="text-foreground size-5" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-4 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: Math.max(24, insets.bottom + 20) }}>
        <View className="bg-card rounded-lg p-5">
          <View className="mb-3 flex-row items-start gap-3">
            <View className="flex-1">
              <Text className="text-primary text-xs font-semibold tracking-[1.5px] uppercase">
                Data & Privacy
              </Text>
              <Text className="text-foreground mt-1 text-2xl leading-7 font-extrabold">
                We protect your health and account data.
              </Text>
            </View>
            <View className="bg-primary/10 h-12 w-12 items-center justify-center rounded-md">
              <Icon as={ShieldCheck} className="text-primary size-6" />
            </View>
          </View>

          <Text className="text-muted-foreground text-sm leading-5">
            This screen explains what trackk saves on your device and why it is needed for the
            calorie tracking experience.
          </Text>

          <View className="mt-4 flex-row gap-3">
            <View className="bg-background-subtle flex-1 rounded-lg px-5 py-3">
              <Text className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Last Updated
              </Text>
              <Text className="text-foreground mt-1 text-sm font-semibold">February 23, 2026</Text>
            </View>
            <View className="bg-background-subtle flex-1 rounded-lg px-5 py-3">
              <Text className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Version
              </Text>
              <Text className="text-foreground mt-1 text-sm font-semibold">Policy v2.1</Text>
            </View>
          </View>
        </View>

        <SectionCard
          icon={Database}
          iconWrapClassName="bg-info/15"
          iconClassName="text-info"
          title="1. Information We Collect"
          subtitle="Only what is needed to provide the app">
          <View className="gap-3">
            <View className="bg-background-subtle rounded-md p-4">
              <Text className="text-foreground text-sm font-semibold">Profile details</Text>
              <Text className="text-muted-foreground mt-1 text-sm leading-5">
                Name, email address, and profile photo saved on this device.
              </Text>
            </View>
            <View className="bg-background-subtle rounded-md p-4">
              <Text className="text-foreground text-sm font-semibold">Health & fitness inputs</Text>
              <Text className="text-muted-foreground mt-1 text-sm leading-5">
                Weight, height, age, activity level, goals, food logs, hydration entries, and
                progress tracking records you add.
              </Text>
            </View>
            <View className="bg-background-subtle rounded-md p-4">
              <Text className="text-foreground text-sm font-semibold">App preferences</Text>
              <Text className="text-muted-foreground mt-1 text-sm leading-5">
                Theme choice and app settings used to keep the experience consistent between app
                opens.
              </Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard
          icon={Sparkles}
          iconWrapClassName="bg-primary/15"
          iconClassName="text-primary"
          title="2. How We Use Information"
          subtitle="For core local features">
          <View className="gap-1 pl-2">
            <Bullet>Calculate calorie targets and personalized deficit recommendations.</Bullet>
            <Bullet>Show progress analytics and keep your logs available between app opens.</Bullet>
            <Bullet>Save custom foods, meals, hydration, weight, and profile preferences locally.</Bullet>
          </View>
        </SectionCard>

        <SectionCard
          icon={Lock}
          iconWrapClassName="bg-warning/15"
          iconClassName="text-warning"
          title="3. Data Sharing & Security"
          subtitle="We do not sell your data">
          <View className="gap-3">
            <Text className="text-muted-foreground text-sm leading-5">
              Your food logs, profile details, progress, hydration, and weight entries are stored
              locally on this device for the V1 app experience.
            </Text>
            <View className="bg-primary/10 rounded-md p-4">
              <Text className="text-foreground text-sm leading-5">
                Health-related entries are used to provide the service experience and are not sold
                to third parties for advertising.
              </Text>
            </View>
            <View className="gap-2">
              <Bullet>Keep your device locked to protect local app data.</Bullet>
              <Bullet>Removing the app removes the local data stored by the app on this device.</Bullet>
              <Bullet>Only grant camera or photo access when you want to use those features.</Bullet>
            </View>
          </View>
        </SectionCard>

        <SectionCard
          icon={UserCheck}
          iconWrapClassName="bg-accent"
          iconClassName="text-accent-foreground"
          title="4. Your Privacy Choices"
          subtitle="Manage your data and account">
          <View className="gap-2 pl-2">
            <Bullet>Update your profile, goals, theme, and saved foods inside the app.</Bullet>
            <Bullet>Use your device settings to revoke camera or photo permissions.</Bullet>
            <Bullet>Delete the app if you want to remove V1 local data from this device.</Bullet>
          </View>
        </SectionCard>

        <View className="bg-card rounded-md p-5">
          <View className="flex-row items-start gap-3">
            <View className="bg-primary h-11 w-11 items-center justify-center rounded-md">
              <Icon as={Mail} className="size-5 text-white" />
            </View>
            <View className="flex-1">
              <Text className="text-primary text-xs font-semibold tracking-[1.5px] uppercase">
                Need Help?
              </Text>
              <Text className="text-foreground mt-1 text-lg font-bold">
                Contact the Privacy Team
              </Text>
              <Text className="text-muted-foreground mt-2 text-sm leading-5">
                For concerns about data handling or privacy, reach out and we will respond as soon
                as possible.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleEmailPress}
            className="bg-primary mt-4 flex-row items-center justify-center gap-2 rounded-md px-4 py-3">
            <Icon as={Send} className="size-4 text-white" />
            <Text className="text-sm font-semibold text-white">privacy@deficitph.com</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

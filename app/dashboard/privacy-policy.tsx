import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { router } from 'expo-router';
import {
  ArrowLeft,
  ChevronRight,
  Database,
  Download,
  FileText,
  Lock,
  Mail,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react-native';
import React from 'react';
import { Linking, Pressable, ScrollView, Share, View } from 'react-native';
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
    <View className="border-border bg-card rounded-xl border p-5">
      <View className="mb-4 flex-row items-center gap-3">
        <View className={`h-10 w-10 items-center justify-center rounded-xl ${iconWrapClassName}`}>
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
          'DeficitPH Privacy Policy\n\nThis policy explains how your health and account data is handled in the app.',
      });
    } catch {
      // noop: user cancelled or share is unavailable
    }
  }

  function handleEmailPress() {
    Linking.openURL('mailto:privacy@deficitph.com').catch(() => {});
  }

  return (
    <View className="bg-background flex-1">
      <View className="bg-primary/10 absolute inset-x-0 top-0 h-36" />

      <View className="border-border bg-background/90 border-b px-4 py-3">
        <View className="relative flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="border-border bg-card h-10 w-10 items-center justify-center rounded-full border">
            <Icon as={ArrowLeft} className="text-foreground size-5" />
          </Pressable>

          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <Text className="text-foreground text-base font-bold">Privacy Policy</Text>
          </View>

          <Pressable
            onPress={handleShare}
            className="border-border bg-card h-10 w-10 items-center justify-center rounded-full border">
            <Icon as={Share2} className="text-foreground size-5" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-4 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: Math.max(24, insets.bottom + 20) }}>
        <View className="border-primary/20 bg-card rounded-lg border p-5 shadow-sm">
          <View className="mb-3 flex-row items-start gap-3">
            <View className="flex-1">
              <Text className="text-primary text-xs font-semibold tracking-[1.5px] uppercase">
                Data & Privacy
              </Text>
              <Text className="text-foreground mt-1 text-2xl leading-7 font-extrabold">
                We protect your health and account data.
              </Text>
            </View>
            <View className="bg-primary/10 h-12 w-12 items-center justify-center rounded-2xl">
              <Icon as={ShieldCheck} className="text-primary size-6" />
            </View>
          </View>

          <Text className="text-muted-foreground text-sm leading-5">
            This screen explains what DeficitPH collects, why it is used, and the controls you have
            over your personal information.
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
              <Text className="text-foreground text-sm font-semibold">Usage diagnostics</Text>
              <Text className="text-muted-foreground mt-1 text-sm leading-5">
                Device type, app version, crash reports, and basic usage events to improve
                reliability and performance.
              </Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard
          icon={Sparkles}
          iconWrapClassName="bg-primary/15"
          iconClassName="text-primary"
          title="2. How We Use Information"
          subtitle="For core features, support, and app quality">
          <View className="gap-1 pl-2">
            <Bullet>Calculate calorie targets and personalized deficit recommendations.</Bullet>
            <Bullet>Show progress analytics and keep your logs available between app opens.</Bullet>
            <Bullet>Investigate crashes, bugs, and performance issues.</Bullet>
            <Bullet>Provide support for account and data requests.</Bullet>
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
              We may share limited information with service providers that help us operate the app
              (such as crash diagnostics or app quality tooling), under security and confidentiality
              obligations. Your food logs and progress are stored locally on this device.
            </Text>
            <View className="border-primary/20 bg-primary/10 rounded-lg border p-4">
              <Text className="text-foreground text-sm leading-5">
                Health-related entries are used to provide the service experience and are not sold
                to third parties for advertising.
              </Text>
            </View>
            <View className="gap-2">
              <Bullet>Reasonable technical and organizational safeguards are applied.</Bullet>
              <Bullet>
                Data is retained only as long as needed for service and legal requirements.
              </Bullet>
              <Bullet>Deletion requests trigger account/data removal workflows.</Bullet>
            </View>
          </View>
        </SectionCard>

        <SectionCard
          icon={UserCheck}
          iconWrapClassName="bg-accent"
          iconClassName="text-accent-foreground"
          title="4. Your Privacy Choices"
          subtitle="Manage your data and account">
          <View className="gap-3">
            <Pressable className="bg-background-subtle flex-row items-center justify-between rounded-xl px-4 py-3">
              <View className="flex-row items-center gap-3">
                <Icon as={FileText} className="text-primary size-4" />
                <Text className="text-foreground text-sm font-medium">
                  Request a copy of your personal data
                </Text>
              </View>
              <Icon as={ChevronRight} className="size-4 text-slate-400" />
            </Pressable>

            <Pressable className="bg-background-subtle flex-row items-center justify-between rounded-xl px-4 py-3">
              <View className="flex-row items-center gap-3">
                <Icon as={Download} className="text-primary size-4" />
                <Text className="text-foreground text-sm font-medium">
                  Export logs and progress history
                </Text>
              </View>
              <Icon as={ChevronRight} className="size-4 text-slate-400" />
            </Pressable>
          </View>
        </SectionCard>

        <View className="border-primary/20 bg-card rounded-lg border p-5">
          <View className="flex-row items-start gap-3">
            <View className="bg-primary h-11 w-11 items-center justify-center rounded-2xl">
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
                For concerns about data handling, access requests, or account deletion, reach out
                and we will respond as soon as possible.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleEmailPress}
            className="bg-primary mt-4 flex-row items-center justify-center gap-2 rounded-full px-4 py-3">
            <Icon as={Send} className="size-4 text-white" />
            <Text className="text-sm font-semibold text-white">privacy@deficitph.com</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

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
    <View className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <View className="mb-4 flex-row items-center gap-3">
        <View className={`h-10 w-10 items-center justify-center rounded-xl ${iconWrapClassName}`}>
          <Icon as={icon} className={`size-5 ${iconClassName}`} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-900 dark:text-white">{title}</Text>
          {subtitle ? (
            <Text className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</Text>
          ) : null}
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
      <Text className="flex-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
        {children}
      </Text>
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

      <View className="bg-background/90 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <View className="relative flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <Icon as={ArrowLeft} className="size-5 text-slate-700 dark:text-slate-200" />
          </Pressable>

          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <Text className="text-base font-bold text-slate-900 dark:text-white">
              Privacy Policy
            </Text>
          </View>

          <Pressable
            onPress={handleShare}
            className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <Icon as={Share2} className="size-5 text-slate-700 dark:text-slate-200" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-4 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: Math.max(24, insets.bottom + 20) }}>
        <View className="border-primary/15 dark:border-primary/25 rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-900">
          <View className="mb-3 flex-row items-start gap-3">
            <View className="flex-1">
              <Text className="text-primary text-xs font-semibold tracking-[1.5px] uppercase">
                Data & Privacy
              </Text>
              <Text className="mt-1 text-2xl leading-7 font-extrabold text-slate-900 dark:text-white">
                We protect your health and account data.
              </Text>
            </View>
            <View className="bg-primary/10 h-12 w-12 items-center justify-center rounded-2xl">
              <Icon as={ShieldCheck} className="text-primary size-6" />
            </View>
          </View>

          <Text className="text-sm leading-5 text-slate-600 dark:text-slate-300">
            This screen explains what DeficitPH collects, why it is used, and the controls you have
            over your personal information.
          </Text>

          <View className="mt-4 flex-row gap-3">
            <View className="flex-1 rounded-lg bg-slate-50 px-5 py-3 dark:bg-slate-800">
              <Text className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Last Updated
              </Text>
              <Text className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                February 23, 2026
              </Text>
            </View>
            <View className="flex-1 rounded-lg bg-slate-50 px-5 py-3 dark:bg-slate-800">
              <Text className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Version
              </Text>
              <Text className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                Policy v2.1
              </Text>
            </View>
          </View>
        </View>

        <SectionCard
          icon={Database}
          iconWrapClassName="bg-blue-100 dark:bg-blue-900/30"
          iconClassName="text-blue-600 dark:text-blue-300"
          title="1. Information We Collect"
          subtitle="Only what is needed to provide the app">
          <View className="gap-3">
            <View className="rounded-md bg-slate-50 p-4 dark:bg-slate-800/70">
              <Text className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Account details
              </Text>
              <Text className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                Name, email address, profile photo, and sign-in related account identifiers.
              </Text>
            </View>
            <View className="rounded-md bg-slate-50 p-4 dark:bg-slate-800/70">
              <Text className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Health & fitness inputs
              </Text>
              <Text className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                Weight, height, age, activity level, goals, food logs, hydration entries, and
                progress tracking records you add.
              </Text>
            </View>
            <View className="rounded-md bg-slate-50 p-4 dark:bg-slate-800/70">
              <Text className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Usage diagnostics
              </Text>
              <Text className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
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
            <Bullet>Show progress analytics and save your logs across sessions.</Bullet>
            <Bullet>Investigate crashes, bugs, and performance issues.</Bullet>
            <Bullet>Provide support for account, subscription, and data requests.</Bullet>
          </View>
        </SectionCard>

        <SectionCard
          icon={Lock}
          iconWrapClassName="bg-amber-100 dark:bg-amber-900/30"
          iconClassName="text-amber-600 dark:text-amber-300"
          title="3. Data Sharing & Security"
          subtitle="We do not sell your data">
          <View className="gap-3">
            <Text className="text-sm leading-5 text-slate-600 dark:text-slate-300">
              We may share limited information with service providers that help us operate the app
              (such as hosting, analytics, payments, and authentication), under security and
              confidentiality obligations.
            </Text>
            <View className="border-primary/20 bg-primary/5 dark:border-primary/25 dark:bg-primary/10 rounded-lg border p-4">
              <Text className="text-sm leading-5 text-slate-700 dark:text-slate-200">
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
          iconWrapClassName="bg-purple-100 dark:bg-purple-900/30"
          iconClassName="text-purple-600 dark:text-purple-300"
          title="4. Your Privacy Choices"
          subtitle="Manage your data and account">
          <View className="gap-3">
            <Pressable className="flex-row items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
              <View className="flex-row items-center gap-3">
                <Icon as={FileText} className="text-primary size-4" />
                <Text className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Request a copy of your personal data
                </Text>
              </View>
              <Icon as={ChevronRight} className="size-4 text-slate-400" />
            </Pressable>

            <Pressable className="flex-row items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
              <View className="flex-row items-center gap-3">
                <Icon as={Download} className="text-primary size-4" />
                <Text className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Export logs and progress history
                </Text>
              </View>
              <Icon as={ChevronRight} className="size-4 text-slate-400" />
            </Pressable>
          </View>
        </SectionCard>

        <View className="border-primary/20 dark:border-primary/25 rounded-lg border bg-white p-5 dark:bg-slate-900">
          <View className="flex-row items-start gap-3">
            <View className="bg-primary h-11 w-11 items-center justify-center rounded-2xl">
              <Icon as={Mail} className="size-5 text-white" />
            </View>
            <View className="flex-1">
              <Text className="text-primary text-xs font-semibold tracking-[1.5px] uppercase">
                Need Help?
              </Text>
              <Text className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                Contact the Privacy Team
              </Text>
              <Text className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
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

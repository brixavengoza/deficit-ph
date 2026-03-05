import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { router } from 'expo-router';
import { ArrowLeft, ArrowRight, Check, Crown, Sparkles, Target, Zap } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type BillingCycle = 'monthly' | 'yearly';

const PRO_FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Meal Suggestions',
    subtitle: 'Mas mabilis mag-decide kung ano kakainin mo',
  },
  {
    icon: Target,
    title: 'Advanced Macro Tracking',
    subtitle: 'Mas klaro ang protein, carbs, at fats mo',
  },
  {
    icon: Crown,
    title: 'Unlimited History',
    subtitle: 'Balikan mo anytime ang old logs at progress mo',
  },
  {
    icon: Crown,
    title: 'Unlimited Saved Foods',
    subtitle: 'Save mo favorite/custom foods mo without cap',
  },
  {
    icon: Zap,
    title: 'Ad-free Experience',
    subtitle: 'Mas clean at less distracting habang nagta-track',
  },
] as const;

const BASIC_FEATURES = [
  'Basic Calorie Tracking (manual logging)',
  'Up to 3 meals/day (Breakfast, Lunch, Dinner only)',
  'No snack logging (Free plan limit)',
  'Limited History (7 Days)',
  'Basic progress view',
  'Weight + water tracking (basic)',
  'Saved foods (up to 20 only)',
] as const;

const PRICE_COMPARISONS = {
  monthly: ['Kaprice lang ng isang milktea + add-ons', 'Mas mahal pa ang 1pc chicken meal'],
  yearly: ['Parang less than ₱3/day lang', 'Mas mura than one cheat meal kada month'],
} as const;

export default function SubscriptionPlanScreen() {
  const [billingCycle, setBillingCycle] = React.useState<BillingCycle>('yearly');
  const isYearly = billingCycle === 'yearly';

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View className="bg-background flex-1">
        <View className="bg-background/90 flex-row items-center justify-between px-4 pb-4">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full"
            onPress={() => router.back()}>
            <Icon as={ArrowLeft} className="text-foreground size-5" />
          </Pressable>
          <Text className="text-base font-bold tracking-tight">Subscription Plans</Text>
          <View className="h-10 w-10" />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-4 pb-32">
          <View className="mt-1 mb-6 items-center">
            <Text className="text-center text-3xl leading-9 font-black tracking-tight text-slate-900">
              I-unlock ang{'\n'}
              <Text className="text-primary text-3xl">full potential</Text> mo
            </Text>
            <Text className="text-muted-foreground mt-3 px-10 text-center text-sm font-medium">
              Pili ka ng plan na swak sa journey mo para mas consistent ang tracking.
            </Text>
          </View>

          <View className="mb-5">
            <View
              className="bg-primary/1 border-primary overflow-hidden rounded-lg border p-5"
              style={{
                shadowColor: '#22c55e',
                shadowOpacity: 0.18,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
                elevation: 8,
              }}>
              <View className="mb-4 flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-foreground text-xl font-bold">DeficitPH Pro</Text>
                  <Text className="text-muted-foreground mt-1 text-xs font-medium">
                    Sulit if gusto mo mas guided at mas organized ang progress mo
                  </Text>
                </View>
                <View className="bg-primary rounded-full px-3 py-1">
                  <Text className="text-[10px] font-bold tracking-wider text-white uppercase">
                    Most Popular
                  </Text>
                </View>
              </View>

              <View className="bg-primary/30 mb-5 flex-row rounded-2xl p-1">
                <Pressable
                  onPress={() => setBillingCycle('monthly')}
                  className={
                    isYearly
                      ? 'flex-1 items-center justify-center rounded-xl py-2.5'
                      : 'bg-card border-border flex-1 items-center justify-center rounded-xl border py-2.5'
                  }>
                  <Text
                    className={
                      isYearly
                        ? 'text-foreground text-sm font-medium'
                        : 'text-foreground text-sm font-bold'
                    }>
                    Monthly
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setBillingCycle('yearly')}
                  className={
                    isYearly
                      ? 'bg-card border-border flex-1 items-center justify-center rounded-xl border py-2.5'
                      : 'flex-1 items-center justify-center rounded-xl py-2.5'
                  }>
                  <View className="relative items-center">
                    <Text
                      className={
                        isYearly
                          ? 'text-foreground text-sm font-bold'
                          : 'text-muted-foreground text-sm font-medium'
                      }>
                      Yearly
                    </Text>
                    <View className="absolute -top-3 -right-8 rounded-full bg-slate-900 px-1.5 py-0.5">
                      <Text className="text-[9px] font-bold text-white">BEST</Text>
                    </View>
                  </View>
                </Pressable>
              </View>

              <View className="mb-5">
                <View className="flex-row items-end gap-1">
                  <Text className="text-foreground text-4xl font-black tracking-tight">
                    {isYearly ? '₱999' : '₱99'}
                  </Text>
                  <Text className="text-muted-foreground mb-1 text-sm font-semibold">
                    /{isYearly ? 'year' : 'month'}
                  </Text>
                </View>
                <Text className="text-primary mt-1 text-xs font-semibold">
                  {isYearly
                    ? 'Parang ₱83/month lang kapag yearly.'
                    : 'Flexible if gusto mo monthly muna.'}
                </Text>
                <View className="mt-3 gap-2">
                  {PRICE_COMPARISONS[billingCycle].map((line) => (
                    <View
                      key={line}
                      className="bg-primary/8 border-primary/20 flex-row items-center rounded-xl border px-3 py-2">
                      <Text className="text-primary text-xs font-medium">{line}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="gap-3">
                {PRO_FEATURES.map((feature) => (
                  <View key={feature.title} className="flex-row items-start gap-3">
                    <View className="bg-primary/10 mt-0.5 h-6 w-6 items-center justify-center rounded-full">
                      <Icon as={Check} className="text-primary size-4" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-foreground text-sm font-semibold">{feature.title}</Text>
                      <Text className="text-muted-foreground text-xs">{feature.subtitle}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View className="bg-card border-border mb-6 rounded-lg border p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-foreground text-lg font-bold">Basic</Text>
              <Text className="text-foreground text-xl font-bold">Freemium</Text>
            </View>
            <View className="gap-3 opacity-80">
              {BASIC_FEATURES.map((item) => (
                <View key={item} className="flex-row items-center gap-3">
                  <Icon as={Check} className="text-muted-foreground size-4" />
                  <Text className="text-muted-foreground text-sm font-medium">{item}</Text>
                </View>
              ))}
            </View>
            <View className="border-border mt-4 rounded-sm border border-dashed p-3">
              <Text className="text-foreground text-xs font-semibold">Pro unlocks more</Text>
              <Text className="text-muted-foreground mt-1 text-xs">
                Unlimited meals/day (including snacks), unlimited history, and more advanced
                tracking features.
              </Text>
              <Text className="text-primary mt-2 text-xs font-semibold">
                Saved foods: Free users up to 20, Pro users unlimited.
              </Text>
            </View>
          </View>
        </ScrollView>

        <View className="absolute inset-x-0 bottom-0 px-4">
          <Button
            className="h-14 rounded-full"
            onPress={() => console.log('[subscription] upgrade', billingCycle)}>
            <Text>Upgrade Now</Text>
            <Icon as={ArrowRight} className="size-4 text-white" />
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

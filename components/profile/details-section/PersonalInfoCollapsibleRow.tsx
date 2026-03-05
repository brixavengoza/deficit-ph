import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { personalInfoSchema, PersonalInfoValues } from '@/components/schema/profile-schema';
import { PROFILE_PERSONAL_INFO_MOCK } from '@/lib/profile-settings-mock';
import BaseCollapsibleRow from '../collapsible-row';
import { User } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import FieldError from '../field-error';
import { Button } from '@/components/ui/button';
import { View } from 'react-native';

export default function PersonalInfoCollapsibleRow() {
  const [open, setOpen] = React.useState(false);
  const form = useForm<PersonalInfoValues>({
    resolver: zodResolver(personalInfoSchema),
    mode: 'onChange',
    defaultValues: PROFILE_PERSONAL_INFO_MOCK,
  });

  const savePersonalInfo = (values: PersonalInfoValues) => {
    console.log('[profile personal save]', values);
    form.reset(values);
  };

  return (
    <BaseCollapsibleRow
      icon={User}
      iconWrapClass="bg-blue-100"
      iconClassName="text-blue-600"
      label="Personal Info"
      open={open}
      onToggle={() => setOpen((prev) => !prev)}>
      <View className="mt-4 gap-3">
        <View>
          <Text className="text-foreground mb-1 text-xs font-semibold">Full Name</Text>
          <Controller
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <Input
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                className="bg-background-subtle h-11 rounded-xl border-transparent"
              />
            )}
          />
          <FieldError message={form.formState.errors.fullName?.message} />
        </View>

        <View>
          <Text className="text-foreground mb-1 text-xs font-semibold">Username</Text>
          <Controller
            control={form.control}
            name="username"
            render={({ field }) => (
              <Input
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                className="bg-background-subtle h-11 rounded-xl border-transparent"
              />
            )}
          />
          <FieldError message={form.formState.errors.username?.message} />
        </View>

        <View>
          <Text className="text-foreground mb-1 text-xs font-semibold">Email</Text>
          <Controller
            control={form.control}
            name="email"
            render={({ field }) => (
              <Input
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-background-subtle h-11 rounded-xl border-transparent"
              />
            )}
          />
          <FieldError message={form.formState.errors.email?.message} />
        </View>

        <Button
          className="mt-1 h-10 rounded-full"
          disabled={!form.formState.isDirty || !form.formState.isValid}
          onPress={form.handleSubmit(savePersonalInfo)}>
          <Text className="text-primary-foreground font-semibold">Save Personal Info</Text>
        </Button>
      </View>
    </BaseCollapsibleRow>
  );
}

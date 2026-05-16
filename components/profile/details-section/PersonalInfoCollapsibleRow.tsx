import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { personalInfoSchema, PersonalInfoValues } from '@/components/schema/profile-schema';
import BaseCollapsibleRow from '../collapsible-row';
import { User } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import FieldError from '../field-error';
import { Button } from '@/components/ui/button';
import { View } from 'react-native';
import { useProfileBundleStore } from '@/stores/use-profile-bundle-store';

export default function PersonalInfoCollapsibleRow() {
  const [open, setOpen] = React.useState(false);
  const { fullName, username, email } = useProfileBundleStore((state) => state.bundle);
  const savePersonalInfoToDb = useProfileBundleStore((state) => state.savePersonalInfo);
  const form = useForm<PersonalInfoValues>({
    resolver: zodResolver(personalInfoSchema),
    mode: 'onChange',
    defaultValues: { fullName: '', username: '', email: '' },
  });

  React.useEffect(() => {
    form.reset({ fullName, username, email });
  }, [email, form, fullName, username]);

  const savePersonalInfo = async (values: PersonalInfoValues) => {
    await savePersonalInfoToDb(values);
    form.reset(values);
  };

  return (
    <BaseCollapsibleRow
      icon={User}
      iconWrapClass="bg-info/15"
      iconClassName="text-info"
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
                className="bg-input-bg h-11 rounded-xl"
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
                className="bg-input-bg h-11 rounded-xl"
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
                className="bg-input-bg h-11 rounded-xl"
              />
            )}
          />
          <FieldError message={form.formState.errors.email?.message} />
        </View>

        <Button
          className="mt-1 h-10 rounded-full"
          disabled={!form.formState.isDirty || !form.formState.isValid}
          onPress={() => {
            void form.handleSubmit(savePersonalInfo)();
          }}>
          <Text className="text-primary-foreground font-semibold">Save Personal Info</Text>
        </Button>
      </View>
    </BaseCollapsibleRow>
  );
}

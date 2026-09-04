import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Mail } from 'lucide-react-native';
import * as React from 'react';
import { TextInput, View } from 'react-native';

type EmailInputProps = React.ComponentProps<typeof TextInput>;

/**
 * Email field with a leading mail icon, mirroring PasswordInput's lock icon so the two
 * fields line up visually in the auth forms.
 */
function EmailInput({
  className,
  showMailIcon = true,
  ...props
}: EmailInputProps & { showMailIcon?: boolean }) {
  return (
    <View className="relative justify-center">
      {showMailIcon ? (
        <View className="pointer-events-none absolute left-4 z-10">
          <Icon as={Mail} className="text-muted-foreground size-5" />
        </View>
      ) : null}

      <Input
        {...props}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        className={cn('bg-input-bg h-14 rounded-xl border-transparent pr-4 pl-12', className)}
      />
    </View>
  );
}

export { EmailInput };
export type { EmailInputProps };

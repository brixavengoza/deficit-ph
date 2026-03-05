import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Lock } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, TextInput, View } from 'react-native';

type PasswordInputProps = React.ComponentProps<typeof TextInput>;

function PasswordInput({
  className,
  showLockIcon = true,
  ...props
}: PasswordInputProps & { showLockIcon?: boolean }) {
  const [visible, setVisible] = React.useState(false);

  return (
    <View className="relative justify-center">
      {showLockIcon ? (
        <View className="pointer-events-none absolute left-4 z-10">
          <Icon as={Lock} className="text-muted-foreground size-5" />
        </View>
      ) : null}

      <Input
        {...props}
        secureTextEntry={!visible}
        className={cn('bg-input-bg h-14 rounded-xl border-transparent pr-12 pl-12', className)}
      />

      <Pressable className="absolute right-4" onPress={() => setVisible((v) => !v)}>
        <Icon as={visible ? EyeOff : Eye} className="text-muted-foreground size-5" />
      </Pressable>
    </View>
  );
}

export { PasswordInput };
export type { PasswordInputProps };

import { cn } from '@/lib/utils';
import { Platform, TextInput } from 'react-native';

type TextareaProps = React.ComponentProps<typeof TextInput>;

function Textarea({ className, editable, ...props }: TextareaProps) {
  return (
    <TextInput
      className={cn(
        'text-foreground border-input bg-input-bg min-h-28 w-full rounded-2xl border px-4 py-3 text-base',
        'placeholder:text-muted-foreground',
        Platform.select({
          web: 'transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] disabled:cursor-not-allowed',
        }),
        editable === false && 'opacity-50',
        className
      )}
      editable={editable}
      multiline
      textAlignVertical="top"
      {...props}
    />
  );
}

export { Textarea };
export type { TextareaProps };

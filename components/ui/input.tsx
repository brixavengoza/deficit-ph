import { cn } from '@/lib/utils';
import { formatNumericInputDisplay, normalizeNumericInputRaw } from '@/lib/number-format';
import { cva, type VariantProps } from 'class-variance-authority';
import { useState } from 'react';
import { Platform, TextInput, type TextInputProps } from 'react-native';

const inputVariants = cva(
  'text-foreground placeholder:text-muted-foreground w-full min-w-0 border',
  {
    variants: {
      variant: {
        default: 'bg-background border-input',
        step: 'bg-background border-input',
      },
      size: {
        default: 'h-10 rounded-md px-3 text-base leading-5 sm:h-9',
        lg: 'h-12 rounded-xl px-4 text-lg leading-6',
        // For quantity / numeric fields: tuned line-height + no vertical padding to stay optically centered.
        xlNumeric: 'h-16 rounded-2xl px-5 text-2xl font-bold leading-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type InputProps = TextInputProps &
  React.RefAttributes<TextInput> &
  VariantProps<typeof inputVariants> & {
    format?: 'none' | 'number';
    maxNumericValue?: number;
  };

function Input({
  className,
  variant,
  size,
  style,
  onFocus,
  onBlur,
  onChangeText,
  value,
  format = 'none',
  maxNumericValue,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const displayValue =
    format === 'number' && typeof value === 'string' ? formatNumericInputDisplay(value) : value;

  return (
    <TextInput
      className={cn(
        inputVariants({ variant, size }),
        // Native focus border
        isFocused ? 'border-ring' : 'border-input',
        props.editable === false &&
          cn(
            'opacity-50',
            Platform.select({ web: 'disabled:pointer-events-none disabled:cursor-not-allowed' })
          ),
        Platform.select({
          web: cn(
            'selection:bg-primary selection:text-primary-foreground transition-[color,box-shadow] outline-none md:text-sm',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive'
          ),
          native: 'placeholder:text-muted-foreground/50',
        }),
        className
      )}
      style={[
        Platform.select({
          android: {
            includeFontPadding: false,
            textAlignVertical: 'center',
            paddingTop: 0,
            paddingBottom: 0,
            minHeight: 0,
          },
          ios: {
            paddingTop: 0,
            paddingBottom: 0,
            minHeight: 0,
          },
          default: null,
        }),
        Platform.OS === 'ios' && isFocused
          ? { boxShadow: '0 0 0 3px hsl(var(--ring) / 0.5)' }
          : null,
        style,
      ]}
      onFocus={(e) => {
        setIsFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        onBlur?.(e);
      }}
      value={displayValue}
      onChangeText={(text) => {
        if (format === 'number') {
          const normalized = normalizeNumericInputRaw(text);
          if (!normalized) {
            onChangeText?.('');
            return;
          }

          if (maxNumericValue !== undefined) {
            const parsed = Number(normalized);
            if (Number.isFinite(parsed) && parsed > maxNumericValue) {
              onChangeText?.(String(maxNumericValue));
              return;
            }
          }

          onChangeText?.(normalized);
          return;
        }
        onChangeText?.(text);
      }}
      {...props}
    />
  );
}

export { Input, inputVariants };
export type { InputProps };

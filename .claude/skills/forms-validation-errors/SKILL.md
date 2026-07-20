---
name: forms-validation-errors
description: Use when building or refactoring React Native forms and validation flows. Standardizes schema-first validation with React Hook Form + Zod, mobile-friendly error UX, submit handling, and API/server error mapping.
---

# Forms, Validation, and Errors (React Native)

Build forms with `react-hook-form` and `zod`. Do not manage each field with manual `useState`.

## Instructions

### Core Stack

```bash
pnpm add react-hook-form zod @hookform/resolvers
```

### Define Schema First

Define Zod schema outside components and infer form type from schema.

```ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
```

### Use Controller for React Native Inputs

Use `Controller` when component does not directly support `ref` + native input props.

```tsx
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export function LoginForm() {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    const result = await login(values);
    if (!result.ok) {
      setError('root', { message: result.message ?? 'Login failed' });
      return;
    }
  };

  return (
    <View>
      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        )}
      />
      {errors.email?.message ? <FieldError message={errors.email.message} /> : null}

      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry />
        )}
      />
      {errors.password?.message ? <FieldError message={errors.password.message} /> : null}

      {errors.root?.message ? <FormError message={errors.root.message} /> : null}

      <Pressable disabled={isSubmitting} onPress={handleSubmit(onSubmit)}>
        <Text>{isSubmitting ? 'Submitting...' : 'Login'}</Text>
      </Pressable>
    </View>
  );
}
```

### Error Components

Create reusable mobile error UI components.

```tsx
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text style={{ color: 'red', marginTop: 4 }}>{message}</Text>;
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text style={{ color: 'red', marginBottom: 12 }}>{message}</Text>;
}
```

### Server Error Mapping

- Use `setError('fieldName', ...)` for field-specific backend errors
- Use `setError('root', ...)` for general failures

```ts
if (json.fieldErrors?.email) {
  setError('email', { message: json.fieldErrors.email });
  return;
}
setError('root', { message: json.error ?? 'Something went wrong' });
```

### Mobile Form UX Rules

- Wrap long forms with `KeyboardAvoidingView`
- Use `ScrollView` for smaller screens
- Use `returnKeyType`, `onSubmitEditing`, and focus next input for smooth flow
- Disable submit while `isSubmitting`

### Form Checklist

- [ ] Schema declared outside component
- [ ] Types inferred from schema (`z.infer`)
- [ ] Use `useForm` + `zodResolver`
- [ ] Use `Controller` for RN inputs
- [ ] Field and root errors rendered explicitly
- [ ] Submit action disabled during submission
- [ ] Keyboard behavior handled for mobile screens

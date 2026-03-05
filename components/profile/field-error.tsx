import { Text } from '../ui/text';

export default function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text className="text-destructive mt-1 text-xs">{message}</Text>;
}

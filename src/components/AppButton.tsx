import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '@/theme';

type Props = { label: string; onPress: () => void; disabled?: boolean };

export function AppButton({ label, onPress, disabled = false }: Props) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.lg },
  pressed: { opacity: 0.82 }, disabled: { opacity: 0.45 }, label: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

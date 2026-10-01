import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appPalette } from '@/theme/palette';
import { useThemeStore } from '@/theme/themeStore';

type NavItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  path?: '/dashboard' | '/member-registration' | '/customers' | '/gym-attendance' | '/settings';
};

const items: NavItem[] = [
  { label: 'GYM', icon: 'barbell-outline', path: '/dashboard' },
  { label: 'Customers', icon: 'people-outline', path: '/customers' },
  { label: '', icon: 'add', path: '/member-registration' },
  { label: 'GYM Attendance', icon: 'barbell-outline', path: '/gym-attendance' },
  { label: 'Settings', icon: 'settings-outline', path: '/settings' },
];

export function AppBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const mode = useThemeStore(state => state.mode);
  const styles = createStyles(mode);

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.nav}>
        {items.map((item, index) => {
          const center = index === 2;
          const active = item.path === pathname || (item.path === '/customers' && pathname === '/customer-details');
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={center ? 'Add member' : item.label}
              accessibilityState={{ selected: active }}
              key={`${item.label}-${index}`}
              hitSlop={center ? 16 : 8}
              onPress={() => { if (item.path && item.path !== pathname) router.push(item.path); }}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <View style={[center && styles.centerButton, center && active && styles.activeCenterButton, active && !center && styles.activeIcon]}>
                <Ionicons name={active && item.path === '/settings' ? 'settings' : item.icon} size={center ? 38 : 29} color={active || center ? '#08eff2' : mode === 'dark' ? '#9bc9ff' : '#426b88'} />
              </View>
              {item.label ? <Text style={[styles.label, active && styles.activeLabel]}>{item.label}</Text> : null}
              {active && !center ? <View style={styles.indicator} /> : null}
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (mode: 'dark' | 'light') => {
  const colors = appPalette(mode);
  return StyleSheet.create({
  safeArea: { backgroundColor: colors.nav, borderTopWidth: 1, borderTopColor: colors.border },
  nav: { width: '100%', maxWidth: 1000, alignSelf: 'center', minHeight: 78, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.nav },
  item: { flex: 1, height: '100%', minWidth: 0, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', gap: 3 },
  pressed: { opacity: .65 },
  label: { color: mode === 'dark' ? '#9bc9ff' : '#426b88', fontSize: 11, lineHeight: 15, textAlign: 'center', fontWeight: '600' },
  activeLabel: { color: '#08eff2' },
  activeIcon: { shadowColor: '#04eff3', shadowOpacity: .8, shadowRadius: 10 },
  centerButton: { width: 66, height: 66, marginTop: -24, borderWidth: 3, borderColor: '#08eff2', borderRadius: 33, alignItems: 'center', justifyContent: 'center', backgroundColor: mode === 'dark' ? '#012548' : '#d9fbfc', shadowColor: '#08eff2', shadowOpacity: .8, shadowRadius: 13, elevation: 8 },
  activeCenterButton: { backgroundColor: mode === 'dark' ? '#004768' : '#bff9fa', borderColor: '#ffffff', shadowOpacity: 1 },
  indicator: { width: '65%', maxWidth: 56, height: 3, borderRadius: 3, backgroundColor: '#08eff2' },
  });
};

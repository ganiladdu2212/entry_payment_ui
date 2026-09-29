import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  path?: '/dashboard' | '/member-registration' | '/customers';
};

const items: NavItem[] = [
  { label: 'GYM', icon: 'barbell-outline', path: '/dashboard' },
  { label: 'Customers', icon: 'people-outline', path: '/customers' },
  { label: '', icon: 'add', path: '/member-registration' },
  { label: 'Payments', icon: 'card-outline' },
  { label: 'Settings', icon: 'settings-outline' },
];

export function AppBottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.nav}>
        {items.map((item, index) => {
          const active = item.path === pathname || (index === 1 && (pathname === '/member-registration' || pathname === '/customer-details'));
          const center = index === 2;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={center ? 'Add member' : item.label}
              key={`${item.label}-${index}`}
              onPress={() => item.path && router.replace(item.path)}
              style={styles.item}
            >
              <View style={[center && styles.centerButton, active && !center && styles.activeIcon]}>
                <Ionicons name={item.icon} size={center ? 38 : 29} color={active || center ? '#08eff2' : '#9bc9ff'} />
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

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#001a34', borderTopWidth: 1, borderTopColor: '#075d8b' },
  nav: { height: 78, flexDirection: 'row', alignItems: 'center', backgroundColor: '#001a34' },
  item: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { color: '#9bc9ff', fontSize: 12, fontWeight: '700' },
  activeLabel: { color: '#08eff2' },
  activeIcon: { shadowColor: '#04eff3', shadowOpacity: .8, shadowRadius: 10 },
  centerButton: { width: 66, height: 66, marginTop: -24, borderWidth: 3, borderColor: '#08eff2', borderRadius: 33, alignItems: 'center', justifyContent: 'center', backgroundColor: '#012548', shadowColor: '#08eff2', shadowOpacity: .8, shadowRadius: 13, elevation: 8 },
  indicator: { width: 56, height: 4, borderRadius: 3, backgroundColor: '#08eff2' },
});

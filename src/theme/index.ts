import { Platform } from 'react-native';
export const theme = {
  colors: { primary: '#3157D5', background: '#F3F6FC', surface: '#FFFFFF', text: '#17213A', muted: '#64708A', success: '#16794D', danger: '#C03434' },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  shadow: { card: Platform.select({ web: { boxShadow: '0 16px 48px rgba(30, 50, 90, 0.12)' }, default: { elevation: 5, shadowColor: '#1E325A', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } } }) },
} as const;

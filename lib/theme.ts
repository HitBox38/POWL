import { Theme } from '@react-navigation/native';

const NAV_THEME = {
  light: {
    dark: false,
    colors: {
      primary: 'hsl(199, 89%, 48%)',
      background: 'hsl(222, 47%, 11%)',
      card: 'hsl(222, 47%, 14%)',
      text: 'hsl(213, 31%, 91%)',
      border: 'hsl(222, 47%, 22%)',
      notification: 'hsl(0, 70%, 55%)',
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' as const },
      medium: { fontFamily: 'System', fontWeight: '500' as const },
      bold: { fontFamily: 'System', fontWeight: '700' as const },
      heavy: { fontFamily: 'System', fontWeight: '900' as const },
    },
  },
  dark: {
    dark: true,
    colors: {
      primary: 'hsl(199, 89%, 48%)',
      background: 'hsl(222, 47%, 7%)',
      card: 'hsl(222, 47%, 10%)',
      text: 'hsl(213, 31%, 91%)',
      border: 'hsl(222, 47%, 18%)',
      notification: 'hsl(0, 70%, 50%)',
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' as const },
      medium: { fontFamily: 'System', fontWeight: '500' as const },
      bold: { fontFamily: 'System', fontWeight: '700' as const },
      heavy: { fontFamily: 'System', fontWeight: '900' as const },
    },
  },
} satisfies Record<'light' | 'dark', Theme>;

export { NAV_THEME };

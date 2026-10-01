import type { ThemeMode } from './themeStore';

export const appPalette = (mode: ThemeMode) => mode === 'dark' ? {
  background: '#001726', surface: '#002339', surfaceRaised: '#002d43', nav: '#001a34',
  text: '#ffffff', muted: '#a9d0ef', border: '#087093', input: '#001a2e', inputMuted: '#092a3d',
} : {
  background: '#eef7fc', surface: '#ffffff', surfaceRaised: '#e4f3fa', nav: '#ffffff',
  text: '#10283a', muted: '#55748b', border: '#8cc9df', input: '#ffffff', inputMuted: '#e8f0f4',
};

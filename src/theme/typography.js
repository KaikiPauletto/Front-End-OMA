import { Platform } from 'react-native';

// Figma especifica Inter para textos e EB Garamond para alguns títulos.
// Enquanto os arquivos de fonte não forem adicionados ao projeto, usamos
// as famílias nativas equivalentes para manter a compatibilidade com Expo Go.
export const typography = {
  family: {
    body: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
    bodyMedium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
    display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  },
  size: {
    caption: 10,
    small: 12,
    body: 14,
    subtitle: 16,
    heading: 20,
    title: 28,
  },
};

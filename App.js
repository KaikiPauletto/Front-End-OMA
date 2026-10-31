import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CartProvider } from './src/contexts/CartContext';
import { SellerProductsProvider } from './src/contexts/SellerProductsContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme/colors';

export default function App() {
  return (
    <SafeAreaProvider>
      <CartProvider>
        <SellerProductsProvider>
          <NavigationContainer
            theme={{
              ...DefaultTheme,
              colors: {
                ...DefaultTheme.colors,
                primary: colors.forest,
                background: colors.canvas,
                card: colors.surface,
                text: colors.ink,
                border: colors.border,
                notification: colors.clay,
              },
            }}
          >
            <StatusBar style="dark" />
            <RootNavigator />
          </NavigationContainer>
        </SellerProductsProvider>
      </CartProvider>
    </SafeAreaProvider>
  );
}

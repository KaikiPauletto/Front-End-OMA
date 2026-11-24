import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { CartProvider } from './src/contexts/CartContext';
import { OrdersProvider } from './src/contexts/OrdersContext';
import { SellerProductsProvider } from './src/contexts/SellerProductsContext';
import { ProductCatalogProvider } from './src/contexts/ProductCatalogContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme/colors';

const linking = {
  prefixes: ['oma://'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Conta: {
            screens: {
              Pedidos: 'payment/:result',
            },
          },
        },
      },
    },
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <OrdersProvider>
            <SellerProductsProvider>
              <ProductCatalogProvider>
                <NavigationContainer
                  linking={linking}
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
              </ProductCatalogProvider>
            </SellerProductsProvider>
          </OrdersProvider>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

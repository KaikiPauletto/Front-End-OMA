import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../contexts/CartContext';
import { CartScreen } from '../screens/CartScreen';
import { CategoriesScreen } from '../screens/CategoriesScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { ProductDetailsScreen } from '../screens/ProductDetailsScreen';
import { ProductsScreen } from '../screens/ProductsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { SellerProductsScreen } from '../screens/SellerProductsScreen';
import { AddSellerProductScreen } from '../screens/AddSellerProductScreen';
import { SubcategoriesScreen } from '../screens/SubcategoriesScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AccountStack({ route }) {
  const accountType = route.params?.accountType ?? 'customer';

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.canvas },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="ContaHome"
        component={ProfileScreen}
        initialParams={{ accountType }}
      />
      <Stack.Screen name="Pedidos" component={OrdersScreen} />
      <Stack.Screen name="MinhasVendas" component={SellerProductsScreen} />
      <Stack.Screen name="AdicionarProduto" component={AddSellerProductScreen} />
    </Stack.Navigator>
  );
}

function MainTabs({ route }) {
  const { itemCount } = useCart();
  const insets = useSafeAreaInsets();
  const accountType = route.params?.accountType ?? 'customer';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.forest,
        tabBarInactiveTintColor: colors.mutedStrong,
        tabBarLabelStyle: {
          fontFamily: typography.family.bodyMedium,
          fontSize: 10,
          fontWeight: '500',
          letterSpacing: 0.36,
          marginTop: 3,
          marginBottom: 2,
        },
        tabBarStyle: {
          height: 64 + insets.bottom,
          width: '100%',
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 4),
          backgroundColor: 'rgba(253, 249, 244, 0.97)',
          borderTopColor: colors.border,
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarItemStyle: { flex: 1 },
        tabBarIcon: ({ color, focused }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            Carrinho: focused ? 'bag-handle' : 'bag-handle-outline',
            Conta: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name] || 'grid-outline'} size={18} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'HOME' }} />
      <Tab.Screen
        name="Carrinho"
        component={CartScreen}
        options={{
          tabBarLabel: 'CARRINHO',
          tabBarBadge: itemCount > 0 ? itemCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.clay, color: colors.white, fontSize: 9 },
        }}
      />
      <Tab.Screen
        name="Conta"
        component={AccountStack}
        initialParams={{ accountType }}
        options={{ tabBarLabel: 'CONTA' }}
      />
      <Tab.Screen
        name="Categorias"
        component={CategoriesScreen}
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
      <Tab.Screen
        name="Subcategorias"
        component={SubcategoriesScreen}
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
      <Tab.Screen
        name="Produtos"
        component={ProductsScreen}
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.canvas },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
    </Stack.Navigator>
  );
}

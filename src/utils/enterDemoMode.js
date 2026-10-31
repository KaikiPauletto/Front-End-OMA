export function enterDemoMode(navigation, accountType = 'customer') {
  navigation.reset({
    index: 0,
    routes: [{ name: 'MainTabs', params: { accountType } }],
  });
}

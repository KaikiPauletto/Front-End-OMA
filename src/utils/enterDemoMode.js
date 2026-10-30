export function enterDemoMode(navigation) {
  navigation.reset({
    index: 0,
    routes: [{ name: 'MainTabs' }],
  });
}

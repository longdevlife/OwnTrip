import { Redirect } from 'expo-router';

export default function Index() {
  const isLoggedIn = false;

  if (isLoggedIn) {
    return <Redirect href={'/(tabs)' as any} />;
  }

  return <Redirect href={'/(auth)/login' as any} />;
}

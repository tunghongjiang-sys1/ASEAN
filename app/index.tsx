import { Redirect } from 'expo-router';
import { useApp } from '../src/context/app-context';

export default function Index() {
  const { auth, onboarded } = useApp();
  if (!auth) return <Redirect href="/welcome" />;
  if (onboarded) return <Redirect href="/globe" />;
  return <Redirect href="/welcome" />;
}

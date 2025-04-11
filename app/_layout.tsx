
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
        <Stack.Screen name="index" options={{ title: 'Scan QR Code' }} />
        <Stack.Screen name="GameMap" options={{ title: 'Find the Location' }} />
    </Stack>
  );
}
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import CustomTabBar from '@/components/navigation/CustomTabBar';
import DraggableChatbot from '@/components/DraggableChatbot';

export default function TabsLayout() {
  return (
    <View style={styles.container}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="trips" options={{ title: 'Trips' }} />
        <Tabs.Screen name="checkin" options={{ title: 'Check-in' }} />
        <Tabs.Screen name="store" options={{ title: 'Store' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>

      {/* DraggableChatbot xuất hiện trên tất cả các screen */}
      <DraggableChatbot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

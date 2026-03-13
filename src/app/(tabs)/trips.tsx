import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export default function TripsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Feather name="map" size={40} color="#4A7CFF" />
        </View>
        <Text style={styles.title}>My Trips</Text>
        <Text style={styles.subtitle}>Your travel plans will appear here</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFC' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(74, 124, 255, 0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#1A2B4A', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#718096', textAlign: 'center' },
});

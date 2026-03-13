import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export default function CheckinScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Feather name="map-pin" size={40} color="#48BB78" />
        </View>
        <Text style={styles.title}>Check-in</Text>
        <Text style={styles.subtitle}>Share your travel moments</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFC' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(72, 187, 120, 0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#1A2B4A', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#718096', textAlign: 'center' },
});

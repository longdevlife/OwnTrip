import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Feather name="user" size={40} color="#805AD5" />
        </View>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Manage your account</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFC' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(128, 90, 213, 0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#1A2B4A', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#718096', textAlign: 'center' },
});

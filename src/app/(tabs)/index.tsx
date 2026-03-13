import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBFC" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning 👋</Text>
            <Text style={styles.headerTitle}>Discover</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.pointsBadge}>
              <Feather name="award" size={16} color="#48BB78" />
              <Text style={styles.pointsText}>2,450</Text>
            </View>
            <View style={styles.notifButton}>
              <Feather name="bell" size={20} color="#1A2B4A" />
              <View style={styles.notifDot} />
            </View>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#A0AEC0" />
          <Text style={styles.searchPlaceholder}>Search destinations...</Text>
        </View>

        {/* Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Where to{'\n'}next?</Text>
          <Text style={styles.bannerSubtitle}>Instantly generate a personalized dream trip.</Text>
          <View style={styles.bannerButton}>
            <Feather name="zap" size={16} color="#FFFFFF" />
            <Text style={styles.bannerButtonText}>Instant Plan</Text>
          </View>
        </View>

        {/* Trending Now */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending Now</Text>
          <Text style={styles.viewAll}>View all &gt;</Text>
        </View>

        <Text style={styles.comingSoon}>Content coming soon...</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFC' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  greeting: { fontSize: 14, color: '#718096', marginBottom: 2 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1A2B4A' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pointsText: { fontSize: 14, fontWeight: '700', color: '#48BB78' },
  notifButton: { position: 'relative', padding: 4 },
  notifDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F56565',
    borderWidth: 1.5,
    borderColor: '#FAFBFC',
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    marginBottom: 20,
  },
  searchPlaceholder: { fontSize: 15, color: '#A0AEC0' },

  // Banner
  banner: {
    backgroundColor: '#1A2B4A',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  bannerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  bannerSubtitle: { fontSize: 14, color: '#CBD5E0', marginBottom: 16, lineHeight: 20 },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#48BB78',
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bannerButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1A2B4A' },
  viewAll: { fontSize: 14, color: '#4A7CFF', fontWeight: '600' },

  comingSoon: { fontSize: 15, color: '#A0AEC0', textAlign: 'center', paddingVertical: 40 },
});

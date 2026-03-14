import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Trip, TripDay, Destination, tripService } from '@/services/tripService';

// ===== HELPERS =====
function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[s.getMonth()]} ${s.getDate()} – ${months[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
}

function getTripStatus(startDate: string, endDate: string) {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (now > end) return 'Completed';
  if (now >= start) return 'Active';
  const daysUntil = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return `In ${daysUntil} days`;
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

// ===== MAIN COMPONENT =====
export default function SummaryTab({ trip, days }: { trip: Trip; days: TripDay[] }) {
  const status = getTripStatus(trip.startDate, trip.endDate);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loadingDest, setLoadingDest] = useState(true);

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const data = await tripService.getDestinations(trip._id);
        setDestinations(data);
      } catch (error) {
        console.error('Error fetching destinations:', error);
      } finally {
        setLoadingDest(false);
      }
    };
    fetchDestinations();
  }, [trip._id]);

  // Group destinations by day
  const groupedByDay = destinations.reduce<Record<number, Destination[]>>((acc, dest) => {
    if (!acc[dest.day]) acc[dest.day] = [];
    acc[dest.day].push(dest);
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      {/* ===== OVERVIEW CARD ===== */}
      <View style={styles.overviewCard}>
        <View style={styles.overviewRow}>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewValue}>{status}</Text>
            <Text style={styles.overviewLabel}>Status</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewItem}>
            <Text style={styles.overviewValue}>{trip.totalDays}</Text>
            <Text style={styles.overviewLabel}>Days</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewItem}>
            <Text style={styles.overviewValue}>{destinations.length}</Text>
            <Text style={styles.overviewLabel}>Places</Text>
          </View>
        </View>
        <View style={styles.overviewDateRow}>
          <Feather name="calendar" size={13} color="#9CA3AF" />
          <Text style={styles.overviewDateText}>
            {formatDateRange(trip.startDate, trip.endDate)}
          </Text>
        </View>
      </View>

      {/* ===== PLACES TO VISIT ===== */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Places to Visit</Text>
          <Text style={styles.sectionCount}>{destinations.length} spots</Text>
        </View>

        {loadingDest ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#4A7CFF" />
          </View>
        ) : destinations.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="map-pin" size={28} color="#D1D5DB" />
            <Text style={styles.emptyText}>No places added yet</Text>
            <TouchableOpacity
              style={styles.addBtn}
              activeOpacity={0.7}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Text style={styles.addBtnText}>Add Place</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.placesList}>
            {Object.keys(groupedByDay)
              .sort((a, b) => Number(a) - Number(b))
              .map((dayNum) => {
                const dayDests = groupedByDay[Number(dayNum)];
                const dayDate = dayDests[0]?.date;
                return (
                  <View key={dayNum} style={styles.dayGroup}>
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayLabel}>Day {dayNum}</Text>
                      {dayDate && <Text style={styles.dayDate}>{formatDayLabel(dayDate)}</Text>}
                    </View>
                    {dayDests
                      .sort((a, b) => a.place.order - b.place.order)
                      .map((dest, idx) => (
                      <TouchableOpacity
                        key={dest.place._id}
                        style={[
                          styles.placeItem,
                          idx === dayDests.length - 1 && styles.placeItemLast,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          if (dest.place.mapUrl) Linking.openURL(dest.place.mapUrl);
                        }}
                      >
                        {dest.place.photo ? (
                          <Image source={{ uri: dest.place.photo }} style={styles.placeImage} />
                        ) : (
                          <View style={[styles.placeImage, styles.placeImagePlaceholder]}>
                            <Feather name="map-pin" size={16} color="#D1D5DB" />
                          </View>
                        )}
                        <View style={styles.placeInfo}>
                          <Text style={styles.placeName} numberOfLines={1}>{dest.place.name}</Text>
                          <Text style={styles.placeAddress} numberOfLines={1}>{dest.place.address}</Text>
                        </View>
                        {dest.place.rating && (
                          <View style={styles.ratingBadge}>
                            <Feather name="star" size={11} color="#F59E0B" />
                            <Text style={styles.ratingText}>{dest.place.rating}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })}
          </View>
        )}
      </View>

      {/* ===== ACCOMMODATION ===== */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Accommodation</Text>
        </View>
        <View style={styles.emptyState}>
          <Feather name="home" size={28} color="#D1D5DB" />
          <Text style={styles.emptyText}>No accommodation added</Text>
          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.7}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Text style={styles.addBtnText}>Add Accommodation</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== NOTES ===== */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TouchableOpacity onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
            <Feather name="plus" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        {trip.description ? (
          <View style={styles.noteHint}>
            <Text style={styles.noteText}>{trip.description}</Text>
          </View>
        ) : (
          <View style={styles.noteHint}>
            <Text style={styles.noteHintText}>Tap + to add travel notes</Text>
          </View>
        )}
      </View>

      {/* ===== BUDGET ===== */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Budget</Text>
          <Text style={styles.budgetAmount}>
            ${trip.budget?.toLocaleString() || '0'}
          </Text>
        </View>

        {!trip.budget ? (
          <View style={styles.emptyState}>
            <Feather name="credit-card" size={28} color="#D1D5DB" />
            <Text style={styles.emptyText}>No budget set</Text>
            <TouchableOpacity
              style={styles.addBtn}
              activeOpacity={0.7}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Text style={styles.addBtnText}>Set Budget</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.budgetBreakdown}>
            <BudgetRow label="Accommodation" amount={0} total={trip.budget} />
            <BudgetRow label="Food & Drinks" amount={0} total={trip.budget} />
            <BudgetRow label="Transportation" amount={0} total={trip.budget} />
            <BudgetRow label="Activities" amount={0} total={trip.budget} />
          </View>
        )}
      </View>
    </View>
  );
}

// ===== BUDGET ROW =====
function BudgetRow({ label, amount, total }: { label: string; amount: number; total: number }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <View style={styles.budgetRow}>
      <View style={styles.budgetRowTop}>
        <Text style={styles.budgetRowLabel}>{label}</Text>
        <Text style={styles.budgetRowAmount}>${amount.toLocaleString()}</Text>
      </View>
      <View style={styles.budgetBarBg}>
        <View style={[styles.budgetBarFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },

  // Overview Card
  overviewCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB',
  },
  overviewRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    marginBottom: 12,
  },
  overviewItem: { alignItems: 'center', gap: 2 },
  overviewValue: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  overviewLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  overviewDivider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: '#E5E7EB' },
  overviewDateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
  },
  overviewDateText: { fontSize: 13, color: '#6B7280' },

  // Section
  section: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#F3F4F6',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  sectionCount: { fontSize: 13, fontWeight: '500', color: '#9CA3AF' },

  // Loading
  loadingBox: { paddingVertical: 24, alignItems: 'center' },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  addBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 8, backgroundColor: '#4A7CFF', marginTop: 4,
  },
  addBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },

  // Places List — grouped by day
  placesList: { gap: 0 },
  dayGroup: { marginBottom: 12 },
  dayHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8, paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  dayLabel: { fontSize: 13, fontWeight: '600', color: '#4A7CFF' },
  dayDate: { fontSize: 12, color: '#9CA3AF' },

  placeItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  placeItemLast: { borderBottomWidth: 0 },
  placeImage: {
    width: 42, height: 42, borderRadius: 10, backgroundColor: '#F3F4F6',
  },
  placeImagePlaceholder: {
    justifyContent: 'center', alignItems: 'center',
  },
  placeInfo: { flex: 1, gap: 2 },
  placeName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  placeAddress: { fontSize: 12, color: '#9CA3AF' },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFFBEB', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
  },
  ratingText: { fontSize: 12, fontWeight: '600', color: '#D97706' },

  // Notes
  noteHint: {
    backgroundColor: '#F9FAFB', borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 14,
  },
  noteHintText: { fontSize: 14, color: '#9CA3AF' },
  noteText: { fontSize: 14, color: '#1A1A1A', lineHeight: 20 },

  // Budget
  budgetAmount: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  budgetBreakdown: { gap: 12 },
  budgetRow: { gap: 4 },
  budgetRowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetRowLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  budgetRowAmount: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  budgetBarBg: { height: 4, borderRadius: 2, backgroundColor: '#F3F4F6' },
  budgetBarFill: { height: 4, borderRadius: 2, backgroundColor: '#4A7CFF' },
});

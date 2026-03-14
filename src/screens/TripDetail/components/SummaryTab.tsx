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

const BRAND = '#4A7CFF';
const BRAND_LIGHT = '#EBF5FF';

// ===== HELPERS =====
function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (s.getFullYear() === e.getFullYear()) {
    return `${months[s.getMonth()]} ${s.getDate()} – ${months[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
  }
  return `${months[s.getMonth()]} ${s.getDate()}, ${s.getFullYear()} – ${months[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
}

function formatDayShort(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
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

// ===== SECTION HEADER (matches reference) =====
function SectionHeader({
  icon,
  title,
  right,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionIconBox}>
          <Feather name={icon} size={14} color={BRAND} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

// ===== MAIN COMPONENT =====
export default function SummaryTab({ trip, days }: { trip: Trip; days: TripDay[] }) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loadingDest, setLoadingDest] = useState(true);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await tripService.getDestinations(trip._id);
        setDestinations(data);
      } catch (e) {
        console.error('Error fetching destinations:', e);
      } finally {
        setLoadingDest(false);
      }
    };
    fetch();
  }, [trip._id]);

  const handleImageError = (id: string) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  };

  // Group by day for display
  const groupedByDay = destinations.reduce<Record<number, Destination[]>>((acc, dest) => {
    if (!acc[dest.day]) acc[dest.day] = [];
    acc[dest.day].push(dest);
    return acc;
  }, {});

  // Running index across all days
  let placeIndex = 0;

  return (
    <View style={styles.container}>

      {/* ===== 1. ACCOMMODATION (first, like reference) ===== */}
      <View style={styles.card}>
        <SectionHeader icon="home" title="Accommodation" />

        {/* TODO: khi có accommodation API, hiển thị card với ảnh + tên + giá */}
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Feather name="home" size={24} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>No accommodation yet</Text>
          <Text style={styles.emptyHint}>Add your hotel, resort or homestay</Text>
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Feather name="plus" size={14} color="#FFF" />
            <Text style={styles.actionBtnText}>Add Accommodation</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== 2. PLACES TO VISIT ===== */}
      <View style={styles.card}>
        <SectionHeader
          icon="map-pin"
          title="Places to Visit"
          right={
            <Text style={styles.countText}>
              {loadingDest ? '...' : `${destinations.length} spots`}
            </Text>
          }
        />

        {loadingDest ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={BRAND} />
          </View>
        ) : destinations.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="compass" size={24} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>No places added</Text>
            <Text style={styles.emptyHint}>Discover and add amazing destinations</Text>
          </View>
        ) : (
          <View>
            {Object.keys(groupedByDay)
              .sort((a, b) => Number(a) - Number(b))
              .map((dayNum, groupIdx) => {
                const dayDests = groupedByDay[Number(dayNum)];
                const dayDate = dayDests[0]?.date;

                return (
                  <View key={dayNum}>
                    {/* Day header divider */}
                    {Object.keys(groupedByDay).length > 1 && (
                      <View style={[styles.dayDivider, groupIdx === 0 && { marginTop: 0 }]}>
                        <Text style={styles.dayLabel}>Day {dayNum}</Text>
                        {dayDate && (
                          <Text style={styles.dayDate}>{formatDayShort(dayDate)}</Text>
                        )}
                      </View>
                    )}

                    {dayDests
                      .sort((a, b) => a.place.order - b.place.order)
                      .map((dest, idx) => {
                        placeIndex++;
                        const hasPhoto = dest.place.photo && !imgErrors[dest.place._id];

                        return (
                          <TouchableOpacity
                            key={dest.place._id}
                            style={styles.placeRow}
                            activeOpacity={0.7}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              if (dest.place.mapUrl) Linking.openURL(dest.place.mapUrl);
                            }}
                          >
                            {/* Blue numbered circle (like reference) */}
                            <View style={styles.placeNum}>
                              <Text style={styles.placeNumText}>{placeIndex}</Text>
                            </View>

                            {/* Place info */}
                            <View style={styles.placeContent}>
                              <Text style={styles.placeName} numberOfLines={1}>
                                {dest.place.name}
                              </Text>
                              {dest.place.address ? (
                                <Text style={styles.placeAddr} numberOfLines={1}>
                                  {dest.place.address}
                                </Text>
                              ) : null}
                            </View>

                            {/* Right side: rating or photo thumbnail */}
                            {hasPhoto ? (
                              <Image
                                source={{ uri: dest.place.photo }}
                                style={styles.placeThumb}
                                onError={() => handleImageError(dest.place._id)}
                              />
                            ) : dest.place.rating ? (
                              <View style={styles.ratingPill}>
                                <Feather name="star" size={10} color="#F59E0B" />
                                <Text style={styles.ratingText}>{dest.place.rating}</Text>
                              </View>
                            ) : (
                              <Feather name="chevron-right" size={16} color="#D1D5DB" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                );
              })}
          </View>
        )}
      </View>

      {/* ===== 3. NOTES (individual cards like reference) ===== */}
      <View style={styles.card}>
        <SectionHeader
          icon="file-text"
          title="Notes"
          right={
            <TouchableOpacity
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="plus" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          }
        />

        {trip.description ? (
          <View style={styles.notesList}>
            {trip.description.split('\n').filter(Boolean).map((line, i) => (
              <View key={i} style={styles.noteItem}>
                <Text style={styles.noteText}>{line}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noteItem}>
            <Text style={styles.noteHintText}>Tap + to add your travel notes</Text>
          </View>
        )}
      </View>

      {/* ===== 4. BUDGET ===== */}
      <View style={styles.card}>
        <SectionHeader
          icon="credit-card"
          title="Budget"
          right={
            <Text style={styles.budgetTotal}>
              ${trip.budget?.toLocaleString() || '0'}
            </Text>
          }
        />

        {!trip.budget ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="credit-card" size={24} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>No budget set</Text>
            <Text style={styles.emptyHint}>Track your trip expenses</Text>
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.7}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Text style={styles.actionBtnText}>Set Budget</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.budgetRows}>
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
      <View style={styles.budgetRowHeader}>
        <Text style={styles.budgetLabel}>{label}</Text>
        <Text style={styles.budgetValue}>${amount.toLocaleString()}</Text>
      </View>
      <View style={styles.budgetBarBg}>
        <View style={[styles.budgetBarFill, { width: `${Math.max(pct, 2)}%` }]} />
      </View>
    </View>
  );
}

// ===== STYLES =====
const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },

  // Card — clean white card like reference
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },

  // Section Header with icon box
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: BRAND_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  countText: { fontSize: 13, fontWeight: '500', color: '#9CA3AF' },

  // Loading
  loadingBox: { paddingVertical: 20, alignItems: 'center' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 16, gap: 4 },
  emptyIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#4B5563' },
  emptyHint: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },

  // Action button
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: BRAND,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, marginTop: 10,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },

  // Places list — like reference: numbered circles + name
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  placeNum: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: BRAND_LIGHT,
    justifyContent: 'center', alignItems: 'center',
  },
  placeNumText: { fontSize: 14, fontWeight: '700', color: BRAND },
  placeContent: { flex: 1, gap: 1 },
  placeName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  placeAddr: { fontSize: 12, color: '#9CA3AF', lineHeight: 16 },
  placeThumb: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: '#F3F4F6',
  },

  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
  },
  ratingText: { fontSize: 11, fontWeight: '600', color: '#D97706' },

  // Day dividers
  dayDivider: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8, marginBottom: 4,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
  },
  dayLabel: { fontSize: 12, fontWeight: '700', color: BRAND },
  dayDate: { fontSize: 11, color: '#9CA3AF' },

  // Notes — individual cards like reference
  notesList: { gap: 8 },
  noteItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  noteText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  noteHintText: { fontSize: 14, color: '#9CA3AF' },

  // Budget
  budgetTotal: { fontSize: 17, fontWeight: '800', color: BRAND },
  budgetRows: { gap: 14 },
  budgetRow: { gap: 6 },
  budgetRowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  budgetValue: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  budgetBarBg: { height: 5, borderRadius: 3, backgroundColor: '#F3F4F6' },
  budgetBarFill: { height: 5, borderRadius: 3, backgroundColor: BRAND },
});

import React, { useEffect, useState, useCallback } from 'react';
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
import AddPlaceModal from './AddPlaceModal';

const BRAND = '#4A7CFF';
const BRAND_LIGHT = '#EBF5FF';

// ===== HELPERS =====
function formatDayDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function getTimeOfDay(order: number): { label: string; color: string } {
  if (order <= 2) return { label: 'Morning', color: '#F59E0B' };
  if (order <= 4) return { label: 'Afternoon', color: '#3B82F6' };
  return { label: 'Evening', color: '#8B5CF6' };
}

// ===== MAIN COMPONENT =====
export default function ItineraryTab({ trip, days }: { trip: Trip; days: TripDay[] }) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  // Add Place Modal state
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState('');
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);

  const fetchDestinations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tripService.getDestinations(trip._id);
      setDestinations(data);
      // Auto-expand first day or day with activities
      if (data.length > 0) {
        const firstDay = Math.min(...data.map((d) => d.day));
        setExpandedDays((prev) => ({ ...prev, [firstDay]: true }));
      } else if (days.length > 0) {
        setExpandedDays((prev) => ({ ...prev, [days[0].day]: true }));
      }
    } catch (e) {
      console.error('Error fetching destinations:', e);
    } finally {
      setLoading(false);
    }
  }, [trip._id, days]);

  useEffect(() => { fetchDestinations(); }, [fetchDestinations]);

  // Group destinations by day
  const destByDay = destinations.reduce<Record<number, Destination[]>>((acc, dest) => {
    if (!acc[dest.day]) acc[dest.day] = [];
    acc[dest.day].push(dest);
    return acc;
  }, {});

  const toggleDay = (dayNum: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedDays((prev) => ({ ...prev, [dayNum]: !prev[dayNum] }));
  };

  const handleImageError = (id: string) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  };

  const openAddModal = (dayId: string, dayNumber: number) => {
    setSelectedDayId(dayId);
    setSelectedDayNumber(dayNumber);
    setAddModalVisible(true);
  };

  const handlePlaceAdded = () => {
    // Refresh destinations after adding a place
    fetchDestinations();
  };

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  // Running index across all days
  let placeIndex = 0;

  return (
    <View style={styles.container}>
      {days.map((day) => {
        const dayDests = (destByDay[day.day] || []).sort((a, b) => a.place.order - b.place.order);
        const isExpanded = expandedDays[day.day] ?? false;
        const activityCount = dayDests.length;

        return (
          <View key={day.day} style={styles.dayCard}>
            {/* ===== DAY HEADER ===== */}
            <TouchableOpacity
              style={styles.dayHeader}
              activeOpacity={0.7}
              onPress={() => toggleDay(day.day)}
            >
              <View style={styles.dayNumCircle}>
                <Text style={styles.dayNumText}>{day.day}</Text>
              </View>
              <View style={styles.dayHeaderInfo}>
                <Text style={styles.dayTitle}>Day {day.day}</Text>
                <Text style={styles.dayMeta}>
                  {formatDayDate(day.date)}
                  {activityCount > 0 ? ` · ${activityCount} activit${activityCount > 1 ? 'ies' : 'y'}` : ''}
                </Text>
              </View>
              <Feather
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>

            {/* ===== EXPANDED CONTENT — TIMELINE ===== */}
            {isExpanded && (
              <View style={styles.timelineContainer}>
                {dayDests.length === 0 ? (
                  <View style={styles.emptyDay}>
                    <Feather name="compass" size={24} color="#D1D5DB" />
                    <Text style={styles.emptyDayText}>No activities planned</Text>
                    <Text style={styles.emptyDayHint}>Tap below to add your first spot</Text>
                  </View>
                ) : (
                  dayDests.map((dest, idx) => {
                    placeIndex++;
                    const isLast = idx === dayDests.length - 1;
                    const tod = getTimeOfDay(dest.place.order);
                    const hasPhoto = dest.place.photo && !imgErrors[dest.place._id];

                    return (
                      <View key={dest.place._id} style={styles.timelineItem}>
                        {/* Timeline line + dot */}
                        <View style={styles.timelineTrack}>
                          <View style={styles.timelineDot} />
                          {!isLast && <View style={styles.timelineLine} />}
                        </View>

                        {/* Activity card */}
                        <TouchableOpacity
                          style={styles.activityCard}
                          activeOpacity={0.7}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            if (dest.place.mapUrl) Linking.openURL(dest.place.mapUrl);
                          }}
                        >
                          {/* Thumbnail */}
                          {hasPhoto ? (
                            <Image
                              source={{ uri: dest.place.photo }}
                              style={styles.activityThumb}
                              onError={() => handleImageError(dest.place._id)}
                            />
                          ) : (
                            <View style={[styles.activityThumb, styles.activityThumbPlaceholder]}>
                              <Feather name="map-pin" size={18} color="#D1D5DB" />
                            </View>
                          )}

                          {/* Info */}
                          <View style={styles.activityInfo}>
                            <Text style={styles.activityName} numberOfLines={1}>
                              {dest.place.name}
                            </Text>
                            <View style={styles.activityMeta}>
                              {dest.place.rating ? (
                                <>
                                  <Feather name="star" size={11} color="#F59E0B" />
                                  <Text style={styles.activityRating}>{dest.place.rating}</Text>
                                  <Text style={styles.activityDot}>·</Text>
                                </>
                              ) : null}
                              <Text style={[styles.activityTag, { color: tod.color }]}>
                                {tod.label}
                              </Text>
                            </View>
                            {dest.place.address ? (
                              <Text style={styles.activityAddr} numberOfLines={1}>
                                {dest.place.address}
                              </Text>
                            ) : null}
                          </View>

                          {/* Check-in button */}
                          <TouchableOpacity
                            style={styles.checkinBtn}
                            activeOpacity={0.7}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              // TODO: check-in logic
                            }}
                          >
                            <Text style={styles.checkinText}>Check in</Text>
                          </TouchableOpacity>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}

                {/* + Add Activity — uses dayId from TripDay */}
                <TouchableOpacity
                  style={styles.addActivityBtn}
                  activeOpacity={0.7}
                  onPress={() => openAddModal(day.dayId, day.day)}
                >
                  <Feather name="plus" size={16} color={BRAND} />
                  <Text style={styles.addActivityText}>Add Activity</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      {/* ADD PLACE MODAL */}
      <AddPlaceModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        dayId={selectedDayId}
        dayNumber={selectedDayNumber}
        onPlaceAdded={handlePlaceAdded}
      />
    </View>
  );
}

// ===== STYLES =====
const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  loadingBox: { paddingVertical: 60, alignItems: 'center' },

  // Day Card
  dayCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },

  // Day Header
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  dayNumCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: BRAND_LIGHT,
    justifyContent: 'center', alignItems: 'center',
  },
  dayNumText: { fontSize: 15, fontWeight: '700', color: BRAND },
  dayHeaderInfo: { flex: 1, gap: 1 },
  dayTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  dayMeta: { fontSize: 13, color: '#9CA3AF' },

  // Timeline container
  timelineContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Empty day
  emptyDay: {
    alignItems: 'center', paddingVertical: 16, gap: 4,
    marginLeft: 36,
  },
  emptyDayText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  emptyDayHint: { fontSize: 12, color: '#9CA3AF' },

  // Timeline item
  timelineItem: {
    flexDirection: 'row',
    gap: 0,
  },

  // Timeline track (dot + line)
  timelineTrack: {
    width: 36,
    alignItems: 'center',
    paddingTop: 18,
  },
  timelineDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: BRAND,
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: -1,
  },

  // Activity card
  activityCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  activityThumb: {
    width: 48, height: 48, borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  activityThumbPlaceholder: {
    justifyContent: 'center', alignItems: 'center',
  },
  activityInfo: { flex: 1, gap: 2 },
  activityName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  activityMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  activityRating: { fontSize: 12, fontWeight: '600', color: '#D97706' },
  activityDot: { fontSize: 12, color: '#9CA3AF' },
  activityTag: { fontSize: 12, fontWeight: '500' },
  activityAddr: { fontSize: 11, color: '#9CA3AF', lineHeight: 14 },

  // Check-in button
  checkinBtn: {
    backgroundColor: BRAND,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8,
  },
  checkinText: { fontSize: 12, fontWeight: '600', color: '#FFF' },

  // Add Activity
  addActivityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginLeft: 36,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  addActivityText: { fontSize: 14, fontWeight: '600', color: BRAND },
});

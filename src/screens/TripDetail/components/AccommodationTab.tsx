import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Trip } from '@/services/tripService';
import { accommodationService, Accommodation } from '@/services/accommodationService';
import StayDatePickerModal from './StayDatePickerModal';

const BRAND = '#4A7CFF';

interface AccommodationTabProps {
  trip: Trip;
}

export default function AccommodationTab({ trip }: AccommodationTabProps) {
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHotel, setSelectedHotel] = useState<Accommodation | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const fetchAccommodations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await accommodationService.getAll();
      setAccommodations(data);
    } catch (e) {
      console.error('Error fetching accommodations:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccommodations(); }, [fetchAccommodations]);

  const handleSelectHotel = (hotel: Accommodation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedHotel(hotel);
    setCalendarVisible(true);
  };

  const handleDateConfirm = (checkIn: Date, checkOut: Date) => {
    setCalendarVisible(false);
    if (!selectedHotel) return;

    const nights = Math.round(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalCost = nights * selectedHotel.pricePerNight;

    const formatDate = (d: Date) =>
      `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

    Alert.alert(
      '🎉 Booking Confirmed!',
      `${selectedHotel.name}\n${formatDate(checkIn)} → ${formatDate(checkOut)}\n${nights} night${nights > 1 ? 's' : ''} · ${formatCurrency(totalCost)}`,
      [{ text: 'OK' }]
    );
  };

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('vi-VN') + '₫';
  };

  const handleImageError = (id: string) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  };

  const renderHotelCard = ({ item }: { item: Accommodation }) => {
    const hasImage = item.images && !imgErrors[item.id];
    const displayAmenities = item.amenities?.slice(0, 3) ?? [];
    const extraCount = (item.amenities?.length ?? 0) - 3;

    return (
      <TouchableOpacity
        style={styles.hotelCard}
        activeOpacity={0.85}
        onPress={() => handleSelectHotel(item)}
      >
        {/* Image */}
        <View style={styles.imageContainer}>
          {hasImage ? (
            <Image
              source={{ uri: item.images }}
              style={styles.hotelImage}
              onError={() => handleImageError(item.id)}
            />
          ) : (
            <View style={[styles.hotelImage, styles.imagePlaceholder]}>
              <Feather name="image" size={32} color="#D1D5DB" />
            </View>
          )}

          {/* Rating badge */}
          {item.rating > 0 && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingValue}>{item.rating.toFixed(1)}</Text>
              <Text style={styles.ratingMax}>/10</Text>
            </View>
          )}

          {/* Favorite btn */}
          <TouchableOpacity style={styles.favBtn} activeOpacity={0.7}>
            <Feather name="heart" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          {/* Stars */}
          <View style={styles.starsRow}>
            {Array.from({ length: Math.round(item.rating / 2) }).map((_, i) => (
              <Feather key={i} name="star" size={12} color="#F59E0B" />
            ))}
          </View>

          <Text style={styles.hotelName} numberOfLines={1}>{item.name}</Text>

          <View style={styles.addressRow}>
            <Feather name="map-pin" size={12} color="#9CA3AF" />
            <Text style={styles.addressText} numberOfLines={1}>{item.address}</Text>
          </View>

          {/* Amenities chips */}
          {displayAmenities.length > 0 && (
            <View style={styles.amenitiesRow}>
              {displayAmenities.map((a, i) => (
                <View key={i} style={styles.amenityChip}>
                  <Text style={styles.amenityText}>{a}</Text>
                </View>
              ))}
              {extraCount > 0 && (
                <Text style={styles.amenityMore}>+{extraCount}</Text>
              )}
            </View>
          )}

          {/* Price + book */}
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceValue}>
                {formatCurrency(item.pricePerNight)}
              </Text>
              <Text style={styles.priceUnit}>/night</Text>
            </View>
            <TouchableOpacity
              style={styles.bookBtn}
              activeOpacity={0.7}
              onPress={() => handleSelectHotel(item)}
            >
              <Feather name="calendar" size={18} color={BRAND} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND} />
        <Text style={styles.loadingText}>Finding accommodations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={accommodations}
        keyExtractor={(item) => item.id}
        renderItem={renderHotelCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="home" size={44} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Accommodations</Text>
            <Text style={styles.emptySubtitle}>
              No places to stay found. Try again later.
            </Text>
          </View>
        }
      />

      {/* Calendar Modal */}
      {selectedHotel && (
        <StayDatePickerModal
          visible={calendarVisible}
          onClose={() => { setCalendarVisible(false); setSelectedHotel(null); }}
          hotelName={selectedHotel.name}
          tripStartDate={trip.startDate}
          tripEndDate={trip.endDate}
          onConfirm={handleDateConfirm}
        />
      )}
    </View>
  );
}

// ===== STYLES =====
const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 16 },

  // Loading
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12,
    paddingVertical: 80,
  },
  loadingText: { fontSize: 14, color: '#9CA3AF' },

  // Empty
  emptyContainer: {
    alignItems: 'center', gap: 8, paddingVertical: 80,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF' },

  // Hotel card
  hotelCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 4 },
    }),
  },

  imageContainer: { position: 'relative' },
  hotelImage: { width: '100%', height: 200, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  imagePlaceholder: {
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },

  ratingBadge: {
    position: 'absolute', left: 12, bottom: 12,
    flexDirection: 'row', alignItems: 'baseline',
    backgroundColor: BRAND, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  ratingValue: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  ratingMax: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },

  favBtn: {
    position: 'absolute', right: 12, top: 12,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },

  infoSection: { padding: 14, gap: 6 },

  starsRow: { flexDirection: 'row', gap: 2 },

  hotelName: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },

  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addressText: { fontSize: 13, color: '#6B7280', flex: 1 },

  amenitiesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  amenityChip: {
    backgroundColor: '#F3F4F6', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  amenityText: { fontSize: 11, fontWeight: '500', color: '#6B7280' },
  amenityMore: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },

  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 6,
  },
  priceValue: { fontSize: 18, fontWeight: '800', color: BRAND },
  priceUnit: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },

  bookBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center', alignItems: 'center',
  },
});

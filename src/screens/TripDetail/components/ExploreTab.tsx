import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { placesService, Place } from '@/services/placesService';
import { Trip, TripDay, tripService, AddPlaceBody } from '@/services/tripService';

/* ─── Brand ─── */
const BRAND = '#4A90E2';

/* ─── Categories ─── */
interface Category {
  key: string;
  label: string;
  emoji: string;
  apiType: string;           // what to send to API
  matchTypes: string[];       // client-side filter: place.types must include one of these
}

const CATEGORIES: Category[] = [
  {
    key: 'all', label: 'All', emoji: '📍', apiType: 'restaurant,cafe,lodging,tourist_attraction',
    matchTypes: [],
  },
  {
    key: 'restaurant', label: 'Restaurants', emoji: '🍽️', apiType: 'restaurant',
    matchTypes: ['restaurant', 'food', 'meal_delivery', 'meal_takeaway'],
  },
  {
    key: 'cafe', label: 'Cafés', emoji: '☕', apiType: 'cafe',
    matchTypes: ['cafe', 'coffee', 'bakery'],
  },
  {
    key: 'attraction', label: 'Attractions', emoji: '🏛️', apiType: 'tourist_attraction',
    matchTypes: ['tourist_attraction', 'museum', 'park', 'temple', 'church', 'monument', 'historic', 'artwork', 'place_of_worship', 'reservoir'],
  },
  {
    key: 'lodging', label: 'Hotels', emoji: '🏨', apiType: 'lodging',
    matchTypes: ['lodging', 'hotel', 'resort', 'motel', 'hostel'],
  },
  {
    key: 'shopping', label: 'Shopping', emoji: '🛍️', apiType: 'shopping_mall',
    matchTypes: ['shopping_mall', 'store', 'shop', 'market', 'shopping'],
  },
];

/* ─── Helpers ─── */
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
};

/* ─── Component ─── */
interface ExploreTabProps {
  trip: Trip;
  days: TripDay[];
}

export default function ExploreTab({ trip, days }: ExploreTabProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedPlaces, setSavedPlaces] = useState<Set<string>>(new Set());
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Add to trip modal
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [addingToDay, setAddingToDay] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ─── Already-added place IDs (to mark them) ─── */
  const addedPlaceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const day of days) {
      for (const p of day.places || []) {
        ids.add(p.placeId);
      }
    }
    return ids;
  }, [days]);

  /* ─── Extract coordinates from trip data ─── */
  useEffect(() => {
    for (const day of days) {
      if (day.places && day.places.length > 0) {
        const p = day.places[0];
        if (p.latitude && p.longitude) {
          setCoords({ lat: p.latitude, lng: p.longitude });
          return;
        }
      }
    }
    (async () => {
      try {
        const results = await placesService.searchText({
          q: trip.destination || trip.province,
          limit: 1,
        });
        if (results.length > 0) {
          setCoords({ lat: results[0].latitude, lng: results[0].longitude });
        }
      } catch {
        console.warn('Could not geocode trip destination');
      }
    })();
  }, [days, trip.destination, trip.province]);

  /* ─── Fetch places ─── */
  const fetchPlaces = useCallback(async (query?: string) => {
    if (!coords) return;
    setLoading(true);
    try {
      let result: Place[];
      if (query && query.trim().length > 0) {
        result = await placesService.searchText({
          q: query,
          lat: coords.lat,
          lng: coords.lng,
          radius: 5000,
          limit: 30,
        });
      } else {
        // Fetch broad results, filter client-side
        result = await placesService.searchNearby({
          lat: coords.lat,
          lng: coords.lng,
          radius: 5000,
          type: 'restaurant,cafe,lodging,tourist_attraction',
        });
      }
      setAllPlaces(result);
    } catch (error) {
      console.error('Error fetching explore places:', error);
      setAllPlaces([]);
    } finally {
      setLoading(false);
    }
  }, [coords]);

  /* ─── Client-side filtered places ─── */
  const filteredPlaces = useMemo(() => {
    if (activeCategory === 'all') return allPlaces;
    const cat = CATEGORIES.find(c => c.key === activeCategory);
    if (!cat || cat.matchTypes.length === 0) return allPlaces;

    return allPlaces.filter(place => {
      if (!place.types || place.types.length === 0) return false;
      return place.types.some(t =>
        cat.matchTypes.some(mt => t.toLowerCase().includes(mt.toLowerCase()))
      );
    });
  }, [allPlaces, activeCategory]);

  /* ─── Category counts ─── */
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allPlaces.length };
    for (const cat of CATEGORIES) {
      if (cat.key === 'all') continue;
      counts[cat.key] = allPlaces.filter(place =>
        place.types?.some(t =>
          cat.matchTypes.some(mt => t.toLowerCase().includes(mt.toLowerCase()))
        )
      ).length;
    }
    return counts;
  }, [allPlaces]);

  /* ─── Auto-fetch on coords change ─── */
  useEffect(() => {
    if (coords) fetchPlaces();
  }, [coords, fetchPlaces]);

  /* ─── Debounced search ─── */
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPlaces(text.trim().length > 0 ? text : undefined);
    }, 500);
  }, [fetchPlaces]);

  /* ─── Category select ─── */
  const handleCategoryPress = useCallback((key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveCategory(key);
  }, []);

  /* ─── Bookmark toggle ─── */
  const toggleSave = useCallback((placeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSavedPlaces(prev => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }, []);

  /* ─── Add to trip ─── */
  const handleAddToTrip = useCallback((place: Place) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPlace(place);
    setShowDayPicker(true);
  }, []);

  const handleConfirmAddToDay = useCallback(async (dayId: string) => {
    if (!selectedPlace) return;
    setAddingToDay(dayId);
    try {
      const body: AddPlaceBody = {
        placeId: selectedPlace.placeId,
        name: selectedPlace.name,
        address: selectedPlace.address,
        latitude: selectedPlace.latitude,
        longitude: selectedPlace.longitude,
        rating: selectedPlace.rating,
        photo: selectedPlace.photo || undefined,
        mapUrl: selectedPlace.mapUrl,
      };
      await tripService.addPlaceToDay(dayId, body);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Added! ✅', `${selectedPlace.name} has been added to your itinerary.`);
      setShowDayPicker(false);
      setSelectedPlace(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to add place. Please try again.');
    } finally {
      setAddingToDay(null);
    }
  }, [selectedPlace]);

  /* ─── Pull to refresh ─── */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPlaces(searchQuery || undefined);
    setRefreshing(false);
  }, [fetchPlaces, searchQuery]);

  /* ─── Image error ─── */
  const handleImageError = useCallback((id: string) => {
    setFailedImages(prev => new Set(prev).add(id));
  }, []);

  /* ─── Section title ─── */
  const sectionTitle = useMemo(() => {
    if (searchQuery.trim().length > 0) return `Results for "${searchQuery}"`;
    const cat = CATEGORIES.find(c => c.key === activeCategory);
    const count = filteredPlaces.length;
    return `${cat?.emoji || '📍'} ${count} ${cat?.label || 'Places'} near ${trip.destination || trip.province}`;
  }, [searchQuery, activeCategory, trip.destination, trip.province, filteredPlaces.length]);

  /* ─── Render Place Card ─── */
  const renderPlaceCard = useCallback(({ item }: { item: Place }) => {
    const hasPhoto = item.photo && !failedImages.has(item.placeId);
    const isSaved = savedPlaces.has(item.placeId);
    const isAdded = addedPlaceIds.has(item.placeId);

    return (
      <View style={styles.placeCard}>
        {/* Image */}
        {hasPhoto ? (
          <Image
            source={{ uri: item.photo! }}
            style={styles.placeImage}
            onError={() => handleImageError(item.placeId)}
          />
        ) : (
          <View style={[styles.placeImage, styles.placeImagePlaceholder]}>
            <Feather name="image" size={24} color="#D1D5DB" />
          </View>
        )}

        {/* Info */}
        <View style={styles.placeInfo}>
          <Text style={styles.placeName} numberOfLines={1}>{item.name}</Text>

          {/* Rating row */}
          {(item.rating ?? 0) > 0 && (
            <View style={styles.ratingRow}>
              <Feather name="star" size={13} color="#F59E0B" />
              <Text style={styles.ratingText}>{item.rating!.toFixed(1)}</Text>
              {(item.totalReviews ?? 0) > 0 && (
                <Text style={styles.reviewCount}>({item.totalReviews} reviews)</Text>
              )}
            </View>
          )}

          {/* Address */}
          <View style={styles.addressRow}>
            <Feather name="map-pin" size={11} color="#9CA3AF" />
            <Text style={styles.addressText} numberOfLines={1}>{item.address}</Text>
          </View>

          {/* Action row: Add to Trip OR Already Added */}
          <View style={styles.actionRow}>
            {isAdded ? (
              <View style={styles.addedBadge}>
                <Feather name="check" size={12} color="#10B981" />
                <Text style={styles.addedText}>In itinerary</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => handleAddToTrip(item)}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={13} color="#FFF" />
                <Text style={styles.addBtnText}>Add to Trip</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => toggleSave(item.placeId)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather
                name="bookmark"
                size={20}
                color={isSaved ? BRAND : '#D1D5DB'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [failedImages, savedPlaces, addedPlaceIds, toggleSave, handleImageError, handleAddToTrip]);

  /* ─── Empty state ─── */
  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <Feather name="map-pin" size={40} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No places found</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery ? 'Try a different search term' : 'Try another category or search'}
        </Text>
      </View>
    );
  };

  /* ─── Header (search + categories) ─── */
  const renderListHeader = () => (
    <View>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search places, activities..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={handleSearchChange}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearchChange('')}>
            <Feather name="x-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryContainer}
        style={styles.categoryScroll}
      >
        {CATEGORIES.map(cat => {
          const isActive = cat.key === activeCategory;
          const count = categoryCounts[cat.key] ?? 0;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              onPress={() => handleCategoryPress(cat.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                {cat.label}
              </Text>
              {!loading && cat.key !== 'all' && (
                <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                  <Text style={[styles.countText, isActive && styles.countTextActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Section header */}
      <Text style={styles.sectionTitle}>{sectionTitle}</Text>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={BRAND} />
          <Text style={styles.loadingText}>Finding places...</Text>
        </View>
      )}
    </View>
  );

  /* ─── No coords ─── */
  if (!coords && !loading) {
    return (
      <View style={styles.emptyState}>
        <Feather name="compass" size={40} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Locating destination...</Text>
        <Text style={styles.emptySubtitle}>
          Add places to your itinerary to explore nearby
        </Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={loading ? [] : filteredPlaces}
        keyExtractor={item => item.placeId}
        renderItem={renderPlaceCard}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BRAND} />
        }
      />

      {/* ═══ Day Picker Modal ═══ */}
      <Modal visible={showDayPicker} transparent animationType="fade" onRequestClose={() => setShowDayPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDayPicker(false)}>
          <View style={styles.dayPickerSheet}>
            {/* Handle bar */}
            <View style={styles.sheetHandle} />

            <Text style={styles.dayPickerTitle}>Add to which day?</Text>
            {selectedPlace && (
              <Text style={styles.dayPickerSubtitle} numberOfLines={1}>
                {selectedPlace.name}
              </Text>
            )}

            <ScrollView style={styles.dayList} showsVerticalScrollIndicator={false}>
              {days.map((day) => {
                const isAdding = addingToDay === day.dayId;
                const placeCount = day.places?.length || 0;
                return (
                  <TouchableOpacity
                    key={day.dayId}
                    style={styles.dayOption}
                    onPress={() => handleConfirmAddToDay(day.dayId)}
                    disabled={isAdding}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dayCircle}>
                      <Text style={styles.dayCircleText}>{day.day}</Text>
                    </View>
                    <View style={styles.dayOptionInfo}>
                      <Text style={styles.dayOptionTitle}>Day {day.day}</Text>
                      <Text style={styles.dayOptionDate}>
                        {formatDate(day.date)} · {placeCount} place{placeCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    {isAdding ? (
                      <ActivityIndicator size="small" color={BRAND} />
                    ) : (
                      <Feather name="plus-circle" size={22} color={BRAND} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowDayPicker(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

/* ═══════════════════ Styles ═══════════════════ */
const styles = StyleSheet.create({
  listContent: { paddingBottom: 100 },

  /* ── Search ── */
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 16, marginBottom: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
  },
  searchInput: {
    flex: 1, fontSize: 15, color: '#1A1A1A',
    paddingVertical: 0,
  },

  /* ── Categories ── */
  categoryScroll: { marginBottom: 16 },
  categoryContainer: { paddingHorizontal: 16, gap: 8 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  categoryEmoji: { fontSize: 15 },
  categoryLabel: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  categoryLabelActive: { color: '#FFFFFF' },
  countBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 8, minWidth: 20, alignItems: 'center',
  },
  countBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  countText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  countTextActive: { color: '#FFF' },

  /* ── Section header ── */
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: '#1A1A1A',
    paddingHorizontal: 16, marginBottom: 14,
  },

  /* ── Loading ── */
  loadingContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 32,
  },
  loadingText: { fontSize: 14, color: '#9CA3AF' },

  /* ── Place card ── */
  placeCard: {
    flexDirection: 'row',
    marginHorizontal: 16, marginBottom: 12,
    paddingVertical: 14, paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1, borderColor: '#F3F4F6',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  placeImage: {
    width: 80, height: 80,
    borderRadius: 12,
  },
  placeImagePlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
  },
  placeInfo: {
    flex: 1, marginLeft: 14, gap: 3,
  },
  placeName: {
    fontSize: 15, fontWeight: '600', color: '#1A1A1A',
  },
  ratingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  ratingText: {
    fontSize: 13, fontWeight: '700', color: '#F59E0B',
  },
  reviewCount: {
    fontSize: 12, color: '#9CA3AF',
  },
  addressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  addressText: {
    fontSize: 12, color: '#6B7280', flex: 1,
  },

  /* ── Action row ── */
  actionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 6,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: BRAND,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  addedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8,
  },
  addedText: { fontSize: 12, fontWeight: '600', color: '#10B981' },

  /* ── Empty state ── */
  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 60, gap: 8,
  },
  emptyTitle: {
    fontSize: 17, fontWeight: '600', color: '#1A1A1A',
  },
  emptySubtitle: {
    fontSize: 14, color: '#9CA3AF', textAlign: 'center',
    paddingHorizontal: 40,
  },

  /* ── Day Picker Modal ── */
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  dayPickerSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingBottom: 34,
    maxHeight: '60%',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB', alignSelf: 'center',
    marginBottom: 16,
  },
  dayPickerTitle: {
    fontSize: 18, fontWeight: '700', color: '#1A1A1A',
    paddingHorizontal: 20, marginBottom: 4,
  },
  dayPickerSubtitle: {
    fontSize: 14, color: '#6B7280',
    paddingHorizontal: 20, marginBottom: 16,
  },
  dayList: { paddingHorizontal: 20 },
  dayOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  dayCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center', alignItems: 'center',
  },
  dayCircleText: { fontSize: 15, fontWeight: '700', color: BRAND },
  dayOptionInfo: { flex: 1, gap: 2 },
  dayOptionTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  dayOptionDate: { fontSize: 13, color: '#9CA3AF' },
  cancelBtn: {
    marginHorizontal: 20, marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
});

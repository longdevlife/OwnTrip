import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { placesService, Place } from '@/services/placesService';
import { tripService, AddPlaceBody } from '@/services/tripService';

const BRAND = '#4A7CFF';

// Suggested popular places cho testing — dùng khi search API hết quota
const SUGGESTED_PLACES: Place[] = [
  {
    placeId: 'ChIJ5T-k5YBtcTERonwbdDhPzUg',
    name: 'Mongo Land - Đà Lạt',
    address: 'Tổ 16 thôn 1, Tà Nung, Đà Lạt, Lâm Đồng 670000',
    latitude: 11.9157314,
    longitude: 108.3392217,
    rating: 4.5,
    types: ['tourist_attraction'],
    mapUrl: 'https://maps.google.com/?cid=5245936244841217186',
    photo: null,
    photos: [],
  },
  {
    placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    name: 'Hồ Xuân Hương - Đà Lạt',
    address: 'Trần Quốc Toản, Phường 1, Đà Lạt, Lâm Đồng',
    latitude: 11.9404,
    longitude: 108.4383,
    rating: 4.6,
    types: ['lake', 'natural_feature'],
    mapUrl: 'https://maps.google.com/?cid=123',
    photo: null,
    photos: [],
  },
  {
    placeId: 'ChIJH123_test01',
    name: 'Chợ Đà Lạt',
    address: 'Nguyễn Thị Minh Khai, Phường 1, Đà Lạt, Lâm Đồng',
    latitude: 11.9418,
    longitude: 108.4422,
    rating: 4.3,
    types: ['market', 'point_of_interest'],
    mapUrl: 'https://maps.google.com/?cid=456',
    photo: null,
    photos: [],
  },
  {
    placeId: 'ChIJH123_test02',
    name: 'Thác Datanla',
    address: 'Đèo Prenn, Phường 3, Đà Lạt, Lâm Đồng',
    latitude: 11.9089,
    longitude: 108.4503,
    rating: 4.4,
    types: ['waterfall', 'tourist_attraction'],
    mapUrl: 'https://maps.google.com/?cid=789',
    photo: null,
    photos: [],
  },
];

interface AddPlaceModalProps {
  visible: boolean;
  onClose: () => void;
  dayId: string;
  dayNumber: number;
  onPlaceAdded: () => void;
}

export default function AddPlaceModal({
  visible,
  onClose,
  dayId,
  dayNumber,
  onPlaceAdded,
}: AddPlaceModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [searchError, setSearchError] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    setSearchError(false);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.trim().length < 2) {
      setResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        setSearching(true);
        const places = await placesService.search(text.trim());
        setResults(places);
      } catch (e: any) {
        console.error('Search error:', e);
        setSearchError(true);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  const handleAddPlace = async (place: Place) => {
    try {
      setAdding(place.placeId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const body: AddPlaceBody = {
        placeId: place.placeId,
        name: place.name,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        rating: place.rating,
        photo: place.photo || undefined,
        mapUrl: place.mapUrl,
      };

      await tripService.addPlaceToDay(dayId, body);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `"${place.name}" added to Day ${dayNumber}!`);
      onPlaceAdded();
      handleClose();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to add place';
      Alert.alert('Error', msg);
    } finally {
      setAdding(null);
    }
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setSearching(false);
    setSearchError(false);
    onClose();
  };

  const renderPlaceItem = (item: Place) => {
    const isAdding = adding === item.placeId;

    return (
      <TouchableOpacity
        key={item.placeId}
        style={styles.placeItem}
        activeOpacity={0.7}
        onPress={() => handleAddPlace(item)}
        disabled={!!adding}
      >
        {item.photo ? (
          <Image source={{ uri: item.photo }} style={styles.placeThumb} />
        ) : (
          <View style={[styles.placeThumb, styles.placeThumbEmpty]}>
            <Feather name="map-pin" size={16} color="#D1D5DB" />
          </View>
        )}

        <View style={styles.placeInfo}>
          <Text style={styles.placeName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.placeAddr} numberOfLines={1}>{item.address}</Text>
          {item.rating ? (
            <View style={styles.ratingRow}>
              <Feather name="star" size={10} color="#F59E0B" />
              <Text style={styles.ratingText}>{item.rating}</Text>
              {item.totalReviews ? (
                <Text style={styles.reviewCount}>({item.totalReviews})</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {isAdding ? (
          <ActivityIndicator size="small" color={BRAND} />
        ) : (
          <View style={styles.addIcon}>
            <Feather name="plus" size={16} color={BRAND} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Show search results or suggested places
  const showSuggested = query.length < 2 || searchError;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Add to Day {dayNumber}</Text>
            <Text style={styles.headerSubtitle}>Search or pick from suggestions</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <Feather name="x" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* SEARCH INPUT */}
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search restaurants, attractions..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={handleSearch}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Feather name="x-circle" size={18} color="#D1D5DB" />
            </TouchableOpacity>
          )}
        </View>

        {/* API Error Banner */}
        {searchError && (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={14} color="#D97706" />
            <Text style={styles.errorText}>
              Search unavailable (API quota exceeded). Use suggestions below.
            </Text>
          </View>
        )}

        {/* CONTENT */}
        {searching ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={BRAND} />
            <Text style={styles.searchingText}>Searching...</Text>
          </View>
        ) : results.length > 0 ? (
          <FlatList
            data={results}
            keyExtractor={(item) => item.placeId}
            renderItem={({ item }) => renderPlaceItem(item)}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <ScrollView
            style={styles.suggestedScroll}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* No results message for typed queries */}
            {query.length >= 2 && !searchError && (
              <View style={styles.noResultsBanner}>
                <Text style={styles.noResultsText}>No results for "{query}"</Text>
              </View>
            )}

            {/* Suggested Places */}
            <Text style={styles.suggestedTitle}>Suggested Places</Text>
            <Text style={styles.suggestedHint}>
              Tap a place to add it to your itinerary
            </Text>
            {SUGGESTED_PLACES.map((place) => renderPlaceItem(place))}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 16 : 20,
    paddingBottom: 12,
  },
  headerLeft: { gap: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  headerSubtitle: { fontSize: 13, color: '#9CA3AF' },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
  },

  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: '#F3F4F6', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  searchInput: {
    flex: 1, fontSize: 15, color: '#1A1A1A',
    paddingVertical: 0,
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: '#FFFBEB', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  errorText: { fontSize: 13, color: '#D97706', flex: 1 },

  // No results
  noResultsBanner: {
    paddingVertical: 10, paddingHorizontal: 4,
    marginBottom: 8,
  },
  noResultsText: { fontSize: 14, color: '#9CA3AF' },

  // Suggested
  suggestedScroll: { flex: 1 },
  suggestedTitle: {
    fontSize: 16, fontWeight: '700', color: '#1A1A1A',
    marginBottom: 2,
  },
  suggestedHint: {
    fontSize: 13, color: '#9CA3AF', marginBottom: 12,
  },

  // List
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },

  // Place item
  placeItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  placeThumb: {
    width: 52, height: 52, borderRadius: 12, backgroundColor: '#F3F4F6',
  },
  placeThumbEmpty: {
    justifyContent: 'center', alignItems: 'center',
  },
  placeInfo: { flex: 1, gap: 2 },
  placeName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  placeAddr: { fontSize: 12, color: '#9CA3AF', lineHeight: 16 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  ratingText: { fontSize: 12, fontWeight: '600', color: '#D97706' },
  reviewCount: { fontSize: 11, color: '#9CA3AF' },

  addIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: BRAND + '14',
    justifyContent: 'center', alignItems: 'center',
  },

  // Center content
  centerBox: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 40, gap: 6,
  },
  searchingText: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
});

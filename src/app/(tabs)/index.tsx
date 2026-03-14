import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
  Linking,
  Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { placesService, Place } from '../../services/placesService';
import { tripService, Trip, TripDetailResponse } from '../../services/tripService';
import { userService, UserProfile } from '../../services/userService';

export default function HomeScreen() {
  const router = useRouter();
  const [trendingPlaces, setTrendingPlaces] = useState<Place[]>([]);
  const [recommendedTrips, setRecommendedTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const [selectedTripDetail, setSelectedTripDetail] = useState<TripDetailResponse | null>(null);
  const [loadingTripDetail, setLoadingTripDetail] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const { width } = Dimensions.get('window');
  
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<any>(null);
  const [isLooping, setIsLooping] = useState(false);

  const ITEM_WIDTH = width * 0.65;
  const ITEM_SPACING = 0;
  const ITEM_SIZE = ITEM_WIDTH + ITEM_SPACING;
  const SPACER_SIZE = (width - ITEM_WIDTH) / 2;

  useFocusEffect(
    useCallback(() => {
      const fetchTrending = async () => {
      try {
        setLoading(true);
        const places = await placesService.searchTrending();
        // Để làm loop vô tận ảo, ta nhân 3 mảng dữ liệu (Triple buffer)
        if (places && places.length > 0) {
          setTrendingPlaces([...places, ...places, ...places]);
          setIsLooping(true);
        } else {
          setTrendingPlaces([]);
        }
      } finally {
        setLoading(false);
      }
    };
    
    const fetchTrips = async () => {
      try {
        setLoadingTrips(true);
        const trips = await tripService.getPublishedTrips(1, 10);
        setRecommendedTrips(trips);
      } finally {
        setLoadingTrips(false);
      }
    };

    const fetchUserInfo = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (userId) {
          const profile = await userService.getMyProfile(userId);
          if (profile) {
            setUserProfile(profile);
          }
        }
      } catch (error) {
        console.error('Error fetching user info in Home:', error);
      }
    };

    fetchTrending();
    fetchTrips();
    fetchUserInfo();
  }, [])
  );

  const handleTripPress = async (id: string) => {
    setLoadingTripDetail(true);
    const detail = await tripService.getTripById(id);
    if (detail) {
      setSelectedTripDetail(detail);
    }
    setLoadingTripDetail(false);
  };

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
            <Text style={styles.greeting}>Hi, {userProfile?.displayName || 'User'} 👋</Text>
            <Text style={styles.headerTitle}>Discover</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.pointsBadge}>
              <Feather name="award" size={16} color="#48BB78" />
              <Text style={styles.pointsText}>{userProfile?.points?.toLocaleString() || '0'}</Text>
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
          <TouchableOpacity 
            style={styles.bannerButton}
            onPress={() => router.push('/instant-plan')}
          >
            <Feather name="zap" size={16} color="#FFFFFF" />
            <Text style={styles.bannerButtonText}>Instant Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Trending Now */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending Now</Text>
          <Text style={styles.viewAll}>View all &gt;</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#4A7CFF" style={{ paddingVertical: 40 }} />
        ) : trendingPlaces.length === 0 ? (
          <Text style={styles.comingSoon}>No trending places found.</Text>
        ) : (
          <View style={{ marginHorizontal: -20 }}>
            <Animated.ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: SPACER_SIZE,
              }}
              snapToInterval={ITEM_SIZE}
              decelerationRate="fast"
              onLayout={() => {
                if (isLooping && trendingPlaces.length > 0) {
                  const originalLength = trendingPlaces.length / 3;
                  // Nhảy tới bản sao ở giữa khi vừa load, thêm delay nhỏ để đảm bảo Layout hoàn tất
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ x: originalLength * ITEM_SIZE, animated: false });
                  }, 100);
                }
              }}
              onMomentumScrollEnd={(e) => {
                const offsetX = e.nativeEvent.contentOffset.x;
                const originalLength = trendingPlaces.length / 3;
                const totalWidth = originalLength * ITEM_SIZE;
                
                // Nếu lướt quá bản sao ở giữa (về trước hoặc sau), nhảy về bản sao ở giữa ngay lập tức
                if (offsetX < (originalLength - 1) * ITEM_SIZE) {
                   scrollViewRef.current?.scrollTo({ x: offsetX + totalWidth, animated: false });
                } else if (offsetX >= 2 * originalLength * ITEM_SIZE) {
                   scrollViewRef.current?.scrollTo({ x: offsetX - totalWidth, animated: false });
                }
              }}
              bounces={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: true }
              )}
              scrollEventThrottle={16}
            >
            {trendingPlaces.map((place, index) => {
              const inputRange = [
                (index - 1) * ITEM_SIZE,
                index * ITEM_SIZE,
                (index + 1) * ITEM_SIZE,
              ];
              const scale = scrollX.interpolate({
                inputRange,
                outputRange: [0.8, 1, 0.8], 
                extrapolate: 'clamp',
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3], 
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  key={`${place.placeId}-${index}`}
                  style={{
                    width: ITEM_WIDTH,
                    marginRight: index === trendingPlaces.length - 1 ? 0 : ITEM_SPACING,
                    transform: [
                      { scale },
                    ],
                    opacity,
                  }}
                >
                  <TouchableOpacity
                    style={[styles.trendingCard, { width: ITEM_WIDTH }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedPlace(place);
                      setCurrentPhotoIndex(0);
                    }}
                  >
                    <View style={styles.trendingImageWrapper}>
                      {place.photo ? (
                        <Image
                          source={{ uri: place.photo }}
                          style={styles.trendingImage}
                        />
                      ) : (
                        <View style={styles.trendingImagePlaceholder}>
                          <Feather name="image" size={32} color="#CBD5E0" />
                        </View>
                      )}
                    </View>
                    <View style={styles.trendingInfo}>
                      <Text style={styles.trendingTitle} numberOfLines={1}>{place.name}</Text>
                      <View style={styles.trendingLocation}>
                        <Feather name="map-pin" size={12} color="#A0AEC0" />
                        <Text style={styles.trendingAddress} numberOfLines={1}>{place.address}</Text>
                      </View>
                      {place.rating != null && (
                        <View style={styles.trendingFooter}>
                          <View style={styles.trendingRatingContainer}>
                            <Feather name="star" size={14} color="#ECC94B" />
                            <Text style={styles.trendingRating}>{place.rating}</Text>
                            {place.totalReviews != null && (
                              <Text style={styles.trendingReviews}>({place.totalReviews.toLocaleString()})</Text>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </Animated.ScrollView>
          </View>
        )}

        {/* Recommended Plans */}
        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
          <Text style={styles.sectionTitle}>Recommended Plans</Text>
          <Text style={styles.viewAll}>View all &gt;</Text>
        </View>

        {loadingTrips ? (
          <ActivityIndicator size="large" color="#4A7CFF" style={{ paddingVertical: 40 }} />
        ) : recommendedTrips.length === 0 ? (
          <Text style={styles.comingSoon}>No recommended plans found.</Text>
        ) : (
          <View style={styles.tripsList}>
            {recommendedTrips.map((trip) => (
              <TouchableOpacity 
                key={trip._id} 
                style={styles.tripCard} 
                activeOpacity={0.9} 
                onPress={() => handleTripPress(trip._id)}
              >
                <Image
                  source={{ uri: trip.provinceImage || 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&q=80&w=800' }}
                  style={styles.tripImage}
                />
                
                {/* Gradient-like Overlay for text legibility */}
                <View style={styles.tripOverlay}>
                  <View style={styles.tripBadge}>
                    <Text style={styles.tripBadgeText}>{trip.totalDays} Days</Text>
                  </View>
                  
                  <View style={styles.tripInfo}>
                    <Text style={styles.tripTitle} numberOfLines={1}>{trip.title}</Text>
                    <View style={styles.tripLocationRow}>
                      <Feather name="map-pin" size={10} color="#E2E8F0" />
                      <Text style={styles.tripLocationText} numberOfLines={1}>{trip.destination}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!selectedPlace} animationType="slide" transparent={true} onRequestClose={() => setSelectedPlace(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseArea} activeOpacity={1} onPress={() => setSelectedPlace(null)} />
          <View style={styles.modalContent}>
            {selectedPlace && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Image Gallery */}
                <View style={styles.modalGallery}>
                  {selectedPlace.photos && selectedPlace.photos.length > 0 ? (
                    <ScrollView 
                      horizontal 
                      pagingEnabled 
                      showsHorizontalScrollIndicator={false}
                      scrollEventThrottle={16}
                      onScroll={(e) => {
                        const contentOffsetX = e.nativeEvent.contentOffset.x;
                        const currentIndex = Math.max(0, Math.floor((contentOffsetX + width / 2) / width));
                        if(currentPhotoIndex !== currentIndex) {
                          setCurrentPhotoIndex(currentIndex);
                        }
                      }}
                    >
                      {selectedPlace.photos.map((photoUrl, index) => (
                        <Image key={index} source={{ uri: photoUrl }} style={[styles.modalImage, { width }]} />
                      ))}
                    </ScrollView>
                  ) : selectedPlace.photo ? (
                    <Image source={{ uri: selectedPlace.photo }} style={[styles.modalImage, { width }]} />
                  ) : (
                    <View style={[styles.modalImage, styles.modalImagePlaceholder, { width }]}>
                      <Feather name="image" size={48} color="#CBD5E0" />
                    </View>
                  )}
                  {/* Close button overlay */}
                  <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelectedPlace(null)}>
                    <Feather name="x" size={24} color="#FFF" />
                  </TouchableOpacity>
                  {selectedPlace.photos && selectedPlace.photos.length > 1 && (
                    <View style={styles.galleryBadge}>
                      <Text style={styles.galleryBadgeText}>{currentPhotoIndex + 1}/{selectedPlace.photos.length}</Text>
                    </View>
                  )}
                </View>

                {/* Details */}
                <View style={styles.modalInfoContent}>
                  <View style={styles.modalHeaderRow}>
                    <Text style={styles.modalTitle}>{selectedPlace.name}</Text>
                    <TouchableOpacity style={styles.favButton}>
                      <Feather name="heart" size={20} color="#FF4D4D" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalLocationRow}>
                    <View style={styles.iconCircle}>
                      <Feather name="map-pin" size={14} color="#4A7CFF" />
                    </View>
                    <Text style={styles.modalAddress}>{selectedPlace.address}</Text>
                  </View>

                  <View style={styles.modalStatsRow}>
                    {selectedPlace.rating != null && (
                      <View style={styles.statItem}>
                        <Feather name="star" size={16} color="#FFD700" fill="#FFD700" />
                        <Text style={styles.statValue}>{selectedPlace.rating}</Text>
                        {selectedPlace.totalReviews != null && (
                           <Text style={styles.statLabel}>({selectedPlace.totalReviews.toLocaleString()})</Text>
                        )}
                      </View>
                    )}
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Feather name="camera" size={16} color="#4A7CFF" />
                      <Text style={styles.statValue}>{selectedPlace.photos?.length || 1}</Text>
                      <Text style={styles.statLabel}>Photos</Text>
                    </View>
                  </View>

                  {selectedPlace.types && selectedPlace.types.length > 0 && (
                    <View style={styles.modalTypesContainer}>
                       {selectedPlace.types.slice(0, 4).map((type, idx) => (
                         <View key={idx} style={styles.modalTypeBadge}>
                           <Text style={styles.modalTypeText}>{type.replace(/_/g, ' ')}</Text>
                         </View>
                       ))}
                    </View>
                  )}

                  <View style={styles.modalDivider} />

                  {/* Actions */}
                  {selectedPlace.mapUrl && (
                    <TouchableOpacity
                      style={styles.modalPrimaryButton}
                      activeOpacity={0.8}
                      onPress={() => Linking.openURL(selectedPlace.mapUrl)}
                    >
                      <Feather name="navigation" size={20} color="#FFF" />
                      <Text style={styles.modalPrimaryButtonText}>Chỉ đường đến đây</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Detail Trip Modal */}
      <Modal visible={!!selectedTripDetail || loadingTripDetail} animationType="slide" transparent={true} onRequestClose={() => setSelectedTripDetail(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseArea} activeOpacity={1} onPress={() => {
            if (!loadingTripDetail) setSelectedTripDetail(null);
          }} />
          <View style={styles.modalContent}>
            {loadingTripDetail ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#4A7CFF" />
                <Text style={{ marginTop: 16, color: '#718096', fontWeight: '500' }}>Loading plan...</Text>
              </View>
            ) : selectedTripDetail && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Header Image */}
                <View style={[styles.modalGallery, { height: 260 }]}>
                  <Image source={{ uri: selectedTripDetail.trip.provinceImage || 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&q=80&w=800' }} style={[styles.modalImage, { width, height: 260 }]} />
                  <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelectedTripDetail(null)}>
                    <Feather name="x" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>

                {/* Body Details */}
                <View style={[styles.modalInfoContent, { paddingTop: 28 }]}>
                  <View style={styles.tripDetailHeader}>
                    <Text style={styles.tripDetailTitle}>{selectedTripDetail.trip.title}</Text>
                    <View style={styles.tripDetailMeta}>
                      <View style={styles.metaBadge}>
                        <Feather name="map-pin" size={12} color="#4A7CFF" />
                        <Text style={styles.metaBadgeText}>{selectedTripDetail.trip.destination}</Text>
                      </View>
                      <View style={[styles.metaBadge, { backgroundColor: '#FFF5F5' }]}>
                        <Feather name="clock" size={12} color="#FF4D4D" />
                        <Text style={[styles.metaBadgeText, { color: '#FF4D4D' }]}>{selectedTripDetail.trip.totalDays} Ngày</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.modalSection}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={styles.sectionIconBox}>
                        <Feather name="align-left" size={16} color="#4A7CFF" />
                      </View>
                      <Text style={styles.modalSectionTitle}>Giới thiệu</Text>
                    </View>
                    <Text style={styles.modalSectionText}>
                      {selectedTripDetail.trip.description || 'Khám phá hành trình tuyệt vời này với những trải nghiệm thú vị và điểm đến độc đáo.'}
                    </Text>
                  </View>

                  <View style={styles.modalDivider} />

                  {/* Plan Itinerary */}
                  <View style={styles.modalSection}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={styles.sectionIconBox}>
                        <Feather name="calendar" size={16} color="#4A7CFF" />
                      </View>
                      <Text style={styles.modalSectionTitle}>Lịch trình chi tiết</Text>
                    </View>
                    
                    {selectedTripDetail.days.length === 0 ? (
                      <View style={styles.emptyStateContainer}>
                        <Feather name="info" size={24} color="#A0AEC0" />
                        <Text style={styles.emptyStateText}>Chưa có lịch trình cụ thể.</Text>
                      </View>
                    ) : (
                      <View style={styles.timelineContainer}>
                        {selectedTripDetail.days.map((dayPlan, index) => (
                          <View key={index} style={styles.timelineItem}>
                            <View style={styles.timelineLeft}>
                              <View style={styles.timelineDot} />
                              {index < selectedTripDetail.days.length - 1 && <View style={styles.timelineLine} />}
                            </View>
                            <View style={styles.timelineRight}>
                              <View style={styles.dayCard}>
                                <View style={styles.dayCardHeader}>
                                  <Text style={styles.dayNumberText}>NGÀY {dayPlan.day}</Text>
                                  <Text style={styles.dayStatusText}>
                                    {dayPlan.places && dayPlan.places.length > 0 ? `${dayPlan.places.length} địa điểm` : 'Ngày tự do'}
                                  </Text>
                                </View>
                                {dayPlan.places && dayPlan.places.length > 0 && (
                                  <View style={styles.dayPlacesList}>
                                    {dayPlan.places.map((p, pIdx) => (
                                      <View key={pIdx} style={pIdx === 0 ? styles.firstPlaceItem : styles.placeItem}>
                                        <View style={styles.placeDot} />
                                        <Text style={styles.placeNameText}>{p.name || 'Địa điểm tham quan'}</Text>
                                      </View>
                                    ))}
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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

  // Trending
  trendingList: { paddingRight: 20 },
  trendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#1A2B4A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    marginVertical: 10,
  },
  
  // Recommended Plans
  tripsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  tripCard: {
    width: '48%',
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#FFF',
    shadowColor: '#1A2B4A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  tripImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  tripOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    padding: 12,
  },
  tripBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tripBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  tripInfo: {
    gap: 2,
  },
  tripTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tripLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tripLocationText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  trendingImageWrapper: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  trendingImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F7FAFC',
  },
  trendingImagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingInfo: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
  },
  trendingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2B4A',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  trendingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  trendingAddress: {
    fontSize: 12,
    color: '#A0AEC0',
    flex: 1,
  },
  trendingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendingRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendingRating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  trendingReviews: {
    fontSize: 12,
    color: '#A0AEC0',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalCloseArea: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '92%',
    overflow: 'hidden',
  },
  modalInfoContent: {
    padding: 24,
  },
  modalGallery: {
    height: 300,
    backgroundColor: '#EDF2F7',
    position: 'relative',
  },
  modalImage: {
    height: 300,
    resizeMode: 'cover',
  },
  modalImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EDF2F7',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  galleryBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  galleryBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1A2B4A',
    flex: 1,
    lineHeight: 32,
  },
  favButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAddress: {
    fontSize: 14,
    color: '#718096',
    flex: 1,
    fontWeight: '500',
  },
  modalStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D3748',
  },
  statLabel: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 20,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#EDF2F7',
    marginVertical: 24,
  },
  modalTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalTypeBadge: {
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  modalTypeText: {
    fontSize: 12,
    color: '#4A5568',
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  modalPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#4A7CFF',
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: '#4A7CFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  modalPrimaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },

  // Trip Detail Specifics
  tripDetailHeader: {
    marginBottom: 24,
  },
  tripDetailTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1A2B4A',
    marginBottom: 12,
    lineHeight: 34,
  },
  tripDetailMeta: {
    flexDirection: 'row',
    gap: 10,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A7CFF',
  },
  modalSection: {
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F0F5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D3748',
  },
  modalSectionText: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 24,
    fontWeight: '400',
  },

  // Timeline UI
  timelineContainer: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4A7CFF',
    borderWidth: 3,
    borderColor: '#EBF4FF',
    marginTop: 6,
    zIndex: 2,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#EBF2FF',
    marginTop: -2,
    marginBottom: -6,
  },
  timelineRight: {
    flex: 1,
    paddingLeft: 16,
    paddingBottom: 24,
  },
  dayCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F5FF',
    shadowColor: '#4A7CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4A7CFF',
    letterSpacing: 1,
  },
  dayStatusText: {
    fontSize: 12,
    color: '#A0AEC0',
    fontWeight: '600',
  },
  dayPlacesList: {
    gap: 10,
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F7FAFC',
  },
  firstPlaceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  placeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E0',
  },
  placeNameText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  emptyStateContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F7FAFC',
    borderRadius: 20,
    gap: 12,
  },
  emptyStateText: {
    color: '#A0AEC0',
    fontSize: 14,
    fontWeight: '500',
  },
  tripDayEmpty: {
    fontSize: 14,
    color: '#A0AEC0',
    fontStyle: 'italic',
    paddingLeft: 46,
  },
  tripDayPlaces: {
    fontSize: 14,
    color: '#4A5568',
    paddingLeft: 46,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 90, 
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A7CFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A7CFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    zIndex: 9999,
  },
});

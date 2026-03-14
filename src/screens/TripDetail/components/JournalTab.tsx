import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  Modal,
  ActivityIndicator,
  StatusBar,
  Alert,
  PanResponder,
  LayoutAnimation,
  UIManager,
  Linking,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Trip, TripDay } from '@/services/tripService';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BRAND = '#4A7CFF';

/* ─── Mock data ─── */
const MOCK_MEMORIES = [
  'Amazing atmosphere early in the morning. Got some beautiful silk lanterns!',
  'Iconic bridge — less crowded before noon.',
  'Absolutely magical at sunset. Must come back!',
  'Great local food, very affordable prices.',
  'The architecture here is stunning, worth every minute.',
  'Perfect spot for photos. Highly recommend!',
  'Hidden gem — not many tourists know about this place.',
  'Beautiful garden and peaceful atmosphere.',
];

const MOCK_TIMES = [
  '9:15 AM', '10:45 AM', '12:30 PM', '2:00 PM',
  '3:30 PM', '5:00 PM', '6:30 PM', '8:00 PM',
];

const MOCK_PLACES: { name: string; lat: number; lng: number; photo: string }[] = [
  { name: 'Ancient Town Market', lat: 15.8794, lng: 108.3350, photo: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=200' },
  { name: 'Japanese Covered Bridge', lat: 15.8775, lng: 108.3263, photo: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=200' },
  { name: 'Lantern Street', lat: 15.8780, lng: 108.3280, photo: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=200' },
];

/* ─── Helpers ─── */
function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateTravelTime(distKm: number): string {
  const mins = Math.round((distKm / 30) * 60);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

interface TimelineEntry {
  id: string;
  name: string;
  photo?: string;
  latitude: number;
  longitude: number;
  dayDate: string;
  mockTime: string;
  mockMemory: string;
}

interface JournalTabProps {
  trip: Trip;
  days: TripDay[];
  onScrollToMap?: () => void;
}

// ═══════════════════════════════════════
// MAP HTML GENERATOR
// ═══════════════════════════════════════
function generateMapHtml(timeline: TimelineEntry[], brand: string): string {
  let centerLat = 15.8794;
  let centerLng = 108.3350;
  const zoomLevel = 13;
  if (timeline.length > 0) {
    const lats = timeline.map(e => e.latitude);
    const lngs = timeline.map(e => e.longitude);
    centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  }

  const esc = (s: string) => s.replace(/'/g, "\\'").replace(/"/g, '&quot;');

  const markersJs = timeline.map((m, idx) => {
    return `
      var icon${idx} = L.divIcon({
        className: 'custom-div-icon',
        html: '<div class="marker-pin"><span class="marker-num">${idx + 1}</span></div>',
        iconSize: [32, 44], iconAnchor: [16, 44], popupAnchor: [0, -44]
      });
      markers[${idx}] = L.marker([${m.latitude}, ${m.longitude}], {icon: icon${idx}}).addTo(map)
        .bindPopup('<div class="popup-content"><strong>${esc(m.name)}</strong><p>${esc(m.mockMemory)}</p></div>', {className: 'branded-popup'});
      markers[${idx}].on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerTap', index: ${idx}}));
        highlightMarker(${idx});
      });
    `;
  }).join('\n');

  const distanceLabelsJs = timeline.length > 1
    ? timeline.slice(0, -1).map((m, idx) => {
        const next = timeline[idx + 1];
        const dist = haversineDistance(m.latitude, m.longitude, next.latitude, next.longitude);
        const midLat = (m.latitude + next.latitude) / 2;
        const midLng = (m.longitude + next.longitude) / 2;
        return `
          L.marker([${midLat}, ${midLng}], {
            icon: L.divIcon({
              className: 'distance-label',
              html: '<div class="dist-badge">🚗 ${formatDistance(dist)} · ${estimateTravelTime(dist)}</div>',
              iconSize: [120, 28], iconAnchor: [60, 14]
            }), interactive: false
          }).addTo(map);
        `;
      }).join('\n')
    : '';

  const routeCoords = timeline.map(m => `[${m.latitude}, ${m.longitude}]`).join(',');
  const routeJs = timeline.length > 1
    ? `var latlngs = [${routeCoords}];
       L.polyline(latlngs, {color: '${brand}', weight: 8, opacity: 0.12}).addTo(map);
       var polyline = L.polyline(latlngs, {color: '${brand}', weight: 3.5, opacity: 0.85, dashArray: '8 5', lineCap: 'round'}).addTo(map);
       map.fitBounds(polyline.getBounds(), {padding: [50, 50]});`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
#map{width:100%;height:100%}
.map-controls{position:absolute;bottom:14px;left:14px;z-index:1000;display:flex;flex-direction:column;gap:8px}
.map-btn{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.95);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.12);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transition:transform 0.15s ease}
.map-btn:active{transform:scale(0.92)}
.map-btn svg{width:18px;height:18px}
.map-btn.active{background:${brand};color:white}
.map-btn.active svg{stroke:white}
.custom-div-icon{background:none!important;border:none!important}
.marker-pin{width:32px;height:32px;border-radius:50% 50% 50% 0;background:linear-gradient(135deg,${brand},${brand}dd);position:relative;transform:rotate(-45deg);border:2.5px solid #fff;box-shadow:0 3px 10px rgba(74,124,255,0.4);transition:transform 0.2s ease;display:flex;align-items:center;justify-content:center}
.marker-pin .marker-num{transform:rotate(45deg);font-size:13px;font-weight:800;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.2);line-height:1}
.marker-active .marker-pin{transform:rotate(-45deg) scale(1.25);box-shadow:0 4px 16px rgba(74,124,255,0.55)}
.branded-popup .leaflet-popup-content-wrapper{background:rgba(255,255,255,0.97);border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,0.12);border:1px solid rgba(0,0,0,0.04)}
.branded-popup .leaflet-popup-tip{background:rgba(255,255,255,0.97)}
.branded-popup .leaflet-popup-content{margin:10px 14px;font-size:13px;line-height:1.4}
.popup-content strong{font-size:14px;color:#1A1A1A;display:block;margin-bottom:3px}
.popup-content p{color:#6B7280;margin:0;font-size:12px}
.distance-label{background:none!important;border:none!important}
.dist-badge{background:rgba(255,255,255,0.92);border-radius:20px;padding:4px 10px;font-size:11px;font-weight:600;color:#374151;box-shadow:0 2px 8px rgba(0,0,0,0.1);white-space:nowrap;text-align:center;border:1px solid rgba(0,0,0,0.06)}
.leaflet-control-attribution{background:rgba(255,255,255,0.7)!important;font-size:9px!important;border-radius:6px 0 0 0!important;padding:2px 6px!important}
.brand-watermark{position:absolute;top:12px;left:12px;z-index:1000;background:rgba(255,255,255,0.92);border-radius:10px;padding:6px 12px;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(0,0,0,0.08);font-size:13px;font-weight:700;color:#1A1A1A;border:1px solid rgba(0,0,0,0.04)}
.brand-dot{width:8px;height:8px;border-radius:50%;background:${brand}}
.user-location-marker{width:16px;height:16px;border-radius:50%;background:#4285F4;border:3px solid #fff;box-shadow:0 0 0 4px rgba(66,133,244,0.25),0 2px 6px rgba(0,0,0,0.2)}
</style>
</head>
<body>
<div id="map"></div>
<div class="brand-watermark"><div class="brand-dot"></div>OwnTrip</div>
<div class="map-controls">
  <button class="map-btn" id="layerToggle" onclick="toggleLayer()">
    <svg viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
  </button>
  <button class="map-btn" id="myLocationBtn" onclick="requestMyLocation()">
    <svg viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v4M12 18v4M2 12h4M18 12h4"></path></svg>
  </button>
</div>
<script>
var markers=[];var activeMarkerIdx=-1;var isSatellite=false;var userLocMarker=null;
var map=L.map('map',{zoomControl:false}).setView([${centerLat},${centerLng}],${zoomLevel});
var osmLayer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19});
var satLayer=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'© Esri',maxZoom:19});
osmLayer.addTo(map);
function toggleLayer(){var btn=document.getElementById('layerToggle');if(isSatellite){map.removeLayer(satLayer);osmLayer.addTo(map);btn.classList.remove('active')}else{map.removeLayer(osmLayer);satLayer.addTo(map);btn.classList.add('active')}isSatellite=!isSatellite}
function highlightMarker(idx){markers.forEach(function(m){var el=m.getElement();if(el)el.classList.remove('marker-active')});if(markers[idx]){var el=markers[idx].getElement();if(el)el.classList.add('marker-active');activeMarkerIdx=idx}}
function focusMarker(idx){if(markers[idx]){map.flyTo(markers[idx].getLatLng(),16,{duration:0.8});markers[idx].openPopup();highlightMarker(idx)}}
function fitAllBounds(){if(typeof polyline!=='undefined'){map.fitBounds(polyline.getBounds(),{padding:[50,50],animate:true})}}
function requestMyLocation(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'requestLocation'}))}
function showUserLocation(lat,lng){if(userLocMarker){map.removeLayer(userLocMarker)}var icon=L.divIcon({className:'',html:'<div class="user-location-marker"></div>',iconSize:[16,16],iconAnchor:[8,8]});userLocMarker=L.marker([lat,lng],{icon:icon,zIndexOffset:1000}).addTo(map);map.flyTo([lat,lng],15,{duration:1})}
${markersJs}
${routeJs}
${distanceLabelsJs}
</script>
</body>
</html>`;
}

// ═══════════════════════════════════════
// DRAGGABLE TIMELINE ITEM
// ═══════════════════════════════════════
interface DraggableTimelineItemProps {
  entry: TimelineEntry;
  idx: number;
  isHighlighted: boolean;
  isLast: boolean;
  dist: { distance: string; time: string } | null;
  onTap: (idx: number) => void;
  onDragStart: (idx: number) => void;
  onDragEnd: (fromIdx: number, dy: number) => void;
  itemHeight: number;
}

function DraggableTimelineItem({
  entry, idx, isHighlighted, isLast, dist,
  onTap, onDragStart, onDragEnd, itemHeight,
}: DraggableTimelineItemProps) {
  const hasPhoto = !!entry.photo;
  const isDragging = useRef(false);
  const dragStartY = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only activate for vertical drags on the drag handle area
        return Math.abs(gestureState.dy) > 8;
      },
      onPanResponderGrant: () => {
        isDragging.current = true;
        dragStartY.current = 0;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onDragStart(idx);
      },
      onPanResponderMove: (_, gestureState) => {
        dragStartY.current = gestureState.dy;
      },
      onPanResponderRelease: (_, gestureState) => {
        isDragging.current = false;
        onDragEnd(idx, gestureState.dy);
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
      },
    })
  ).current;

  return (
    <>
      <TouchableOpacity
        style={[styles.timelineItem, isHighlighted && styles.timelineItemHighlighted]}
        activeOpacity={0.7}
        onPress={() => onTap(idx)}
      >
        {/* Drag Handle */}
        <View style={styles.dragHandle} {...panResponder.panHandlers}>
          <Feather name="menu" size={16} color="#C5C8CE" />
        </View>

        {/* Step Number */}
        <View style={styles.timelineStepCol}>
          <View style={[styles.timelineStepDot, isHighlighted && styles.timelineStepDotActive]}>
            <Text style={[styles.timelineStepNum, isHighlighted && styles.timelineStepNumActive]}>
              {idx + 1}
            </Text>
          </View>
          {!isLast && <View style={styles.timelineConnector} />}
        </View>

        {/* Photo */}
        <View style={styles.timelineAvatar}>
          {hasPhoto ? (
            <Image source={{ uri: entry.photo }} style={styles.timelineAvatarImg} />
          ) : (
            <View style={[styles.timelineAvatarImg, styles.timelineAvatarPlaceholder]}>
              <Feather name="map-pin" size={16} color="#9CA3AF" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.timelineInfo}>
          <Text style={styles.timelinePlaceName} numberOfLines={1}>{entry.name}</Text>
          <View style={styles.timelineMetaRow}>
            <Feather name="clock" size={11} color="#9CA3AF" />
            <Text style={styles.timelineMetaText}>
              {entry.mockTime} · {formatShortDate(entry.dayDate)}
            </Text>
          </View>
          <Text style={styles.timelineMemory} numberOfLines={2}>{entry.mockMemory}</Text>
        </View>
      </TouchableOpacity>

      {/* Distance badge */}
      {dist && (
        <View style={styles.distanceBadge}>
          <View style={styles.distanceLine} />
          <View style={styles.distancePill}>
            <Feather name="navigation" size={10} color="#6B7280" />
            <Text style={styles.distanceText}>{dist.distance} · {dist.time}</Text>
          </View>
          <View style={styles.distanceLine} />
        </View>
      )}
    </>
  );
}

// ═══════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════
export default function JournalTab({ trip, days, onScrollToMap }: JournalTabProps) {
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);
  const [fullscreenMap, setFullscreenMap] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [reorderedTimeline, setReorderedTimeline] = useState<TimelineEntry[] | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ index: number; entry: TimelineEntry; distFromPrev: string | null } | null>(null);
  const [navigatingToPlace, setNavigatingToPlace] = useState(false);

  const webViewRef = useRef<WebView>(null);
  const fullscreenWebViewRef = useRef<WebView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Build timeline from itinerary OR use mock data
  const baseTimeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [];
    let globalIdx = 0;

    days.forEach(day => {
      if (!day.places || day.places.length === 0) return;
      day.places.forEach((place, idx) => {
        entries.push({
          id: place._id || `${day.dayId}-${idx}`,
          name: place.name,
          photo: place.photo,
          latitude: place.latitude,
          longitude: place.longitude,
          dayDate: day.date,
          mockTime: MOCK_TIMES[idx % MOCK_TIMES.length],
          mockMemory: MOCK_MEMORIES[globalIdx % MOCK_MEMORIES.length],
        });
        globalIdx++;
      });
    });

    if (entries.length === 0) {
      const startDate = trip.startDate || new Date().toISOString();
      MOCK_PLACES.forEach((mp, idx) => {
        entries.push({
          id: `mock-${idx}`,
          name: mp.name,
          photo: mp.photo,
          latitude: mp.lat,
          longitude: mp.lng,
          dayDate: startDate,
          mockTime: MOCK_TIMES[idx],
          mockMemory: MOCK_MEMORIES[idx],
        });
      });
    }

    return entries;
  }, [days, trip.startDate]);

  // Use reordered if user has reordered, otherwise base
  const timeline = reorderedTimeline || baseTimeline;
  const visitedCount = timeline.length;

  // Approx item height for drag calculation
  const ITEM_HEIGHT = 90;

  // Distances between consecutive points
  const distances = useMemo(() => {
    return timeline.slice(0, -1).map((entry, idx) => {
      const next = timeline[idx + 1];
      const km = haversineDistance(entry.latitude, entry.longitude, next.latitude, next.longitude);
      return { distance: formatDistance(km), time: estimateTravelTime(km) };
    });
  }, [timeline]);

  // Map HTML — memoized to prevent re-renders
  const mapHtml = useMemo(() => generateMapHtml(timeline, BRAND), [timeline]);

  // Bottom sheet snap points
  const snapPoints = useMemo(() => ['15%', '45%', '85%'], []);

  // ── Drag-and-drop handlers ──
  const handleDragStart = useCallback((_idx: number) => {
    // Visual feedback handled by PanResponder grant
  }, []);

  const handleDragEnd = useCallback((fromIdx: number, dy: number) => {
    // Calculate how many positions to move based on drag distance
    const steps = Math.round(dy / ITEM_HEIGHT);
    if (steps === 0) return;

    const toIdx = Math.max(0, Math.min(timeline.length - 1, fromIdx + steps));
    if (toIdx === fromIdx) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    LayoutAnimation.configureNext(LayoutAnimation.create(250, 'easeInEaseOut', 'opacity'));
    const newTimeline = [...timeline];
    const [removed] = newTimeline.splice(fromIdx, 1);
    newTimeline.splice(toIdx, 0, removed);
    setReorderedTimeline(newTimeline);
    setHighlightedIdx(toIdx);
  }, [timeline]);

  // ── GPS Location ──
  const handleMyLocation = useCallback(async (webRef: React.RefObject<WebView | null>) => {
    try {
      setLocatingUser(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location services to use this feature.');
        setLocatingUser(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      webRef.current?.injectJavaScript(`showUserLocation(${latitude}, ${longitude}); true;`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Location Error', 'Unable to get your current location.');
    } finally {
      setLocatingUser(false);
    }
  }, []);

  // ── Directions: get user GPS → open Google Maps ──
  const handleDirections = useCallback(async (destLat: number, destLng: number, destName: string) => {
    try {
      setNavigatingToPlace(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location to get directions.');
        setNavigatingToPlace(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: origLat, longitude: origLng } = loc.coords;
      const url = Platform.select({
        ios: `maps://app?saddr=${origLat},${origLng}&daddr=${destLat},${destLng}`,
        android: `https://www.google.com/maps/dir/?api=1&origin=${origLat},${origLng}&destination=${destLat},${destLng}&destination_place_id=&travelmode=driving`,
      }) || `https://www.google.com/maps/dir/?api=1&origin=${origLat},${origLng}&destination=${destLat},${destLng}`;
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Unable to open directions.');
    } finally {
      setNavigatingToPlace(false);
    }
  }, []);

  const handleNavigate = useCallback(async (destLat: number, destLng: number) => {
    try {
      setNavigatingToPlace(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location to navigate.');
        setNavigatingToPlace(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: origLat, longitude: origLng } = loc.coords;
      const url = Platform.select({
        ios: `maps://app?saddr=${origLat},${origLng}&daddr=${destLat},${destLng}&dirflg=d`,
        android: `google.navigation:q=${destLat},${destLng}&mode=d`,
      }) || `https://www.google.com/maps/dir/?api=1&origin=${origLat},${origLng}&destination=${destLat},${destLng}&travelmode=driving`;
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Unable to start navigation.');
    } finally {
      setNavigatingToPlace(false);
    }
  }, []);

  // ── Show direction card for a marker ──
  const showDirectionCard = useCallback((idx: number) => {
    const entry = timeline[idx];
    if (!entry) return;
    let distFromPrev: string | null = null;
    if (idx > 0) {
      const prev = timeline[idx - 1];
      const km = haversineDistance(prev.latitude, prev.longitude, entry.latitude, entry.longitude);
      distFromPrev = formatDistance(km) + ' · ' + estimateTravelTime(km);
    }
    setSelectedPlace({ index: idx, entry, distFromPrev });
    setHighlightedIdx(idx);
  }, [timeline]);

  // ── Map ↔ Timeline sync ──
  const handleWebViewMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerTap' && typeof data.index === 'number') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showDirectionCard(data.index);
      }
      if (data.type === 'requestLocation') {
        handleMyLocation(webViewRef);
      }
    } catch { /* ignore */ }
  }, [handleMyLocation, showDirectionCard]);

  const handleTimelineTap = useCallback((idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showDirectionCard(idx);
    onScrollToMap?.();
    setTimeout(() => {
      webViewRef.current?.injectJavaScript(`focusMarker(${idx}); true;`);
    }, 300);
  }, [onScrollToMap, showDirectionCard]);

  const handleFocusMap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHighlightedIdx(null);
    setSelectedPlace(null);
    webViewRef.current?.injectJavaScript(`fitAllBounds(); true;`);
  }, []);

  // ── Fullscreen ──
  const openFullscreen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFullscreenMap(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFullscreenMap(false);
  }, []);

  const handleFullscreenMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerTap' && typeof data.index === 'number') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showDirectionCard(data.index);
        bottomSheetRef.current?.snapToIndex(1);
      }
      if (data.type === 'requestLocation') {
        handleMyLocation(fullscreenWebViewRef);
      }
    } catch { /* ignore */ }
  }, [handleMyLocation, showDirectionCard]);

  const handleFullscreenTimelineTap = useCallback((idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showDirectionCard(idx);
    fullscreenWebViewRef.current?.injectJavaScript(`focusMarker(${idx}); true;`);
    bottomSheetRef.current?.snapToIndex(0);
  }, [showDirectionCard]);

  return (
    <View style={styles.container}>

      {/* ═══════ 1. EMBEDDED MAP ═══════ */}
      <View style={styles.mapCard}>
        <View style={styles.mapHeader}>
          <View style={styles.mapLocationRow}>
            <View style={styles.mapPin}>
              <Feather name="map-pin" size={12} color={BRAND} />
            </View>
            <Text style={styles.mapLocationText}>{trip.destination}</Text>
          </View>
          <View style={styles.mapHeaderRight}>
            {visitedCount > 0 && (
              <View style={styles.visitedBadge}>
                <View style={styles.visitedDot} />
                <Text style={styles.visitedText}>{visitedCount} spots</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.expandBtn}
              onPress={openFullscreen}
              activeOpacity={0.7}
            >
              <Feather name="maximize-2" size={14} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.mapContainer}>
          {mapLoading && (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator size="small" color={BRAND} />
              <Text style={styles.mapLoadingText}>Loading map...</Text>
            </View>
          )}
          <WebView
            ref={webViewRef}
            source={{ html: mapHtml }}
            style={styles.map}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            originWhitelist={['*']}
            androidLayerType="software"
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            onMessage={handleWebViewMessage}
            onLoadEnd={() => setMapLoading(false)}
            startInLoadingState={false}
          />

          {/* My Location floating button */}
          <TouchableOpacity
            style={styles.myLocationBtn}
            onPress={() => handleMyLocation(webViewRef)}
            activeOpacity={0.8}
            disabled={locatingUser}
          >
            {locatingUser
              ? <ActivityIndicator size="small" color={BRAND} />
              : <Feather name="crosshair" size={16} color={BRAND} />
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.recenterBtn}
            onPress={handleFocusMap}
            activeOpacity={0.8}
          >
            <Feather name="navigation" size={15} color={BRAND} />
          </TouchableOpacity>

          {/* ── Direction Bottom Card (Grab-style) ── */}
          {selectedPlace && (
            <View style={styles.directionCard}>
              <TouchableOpacity
                style={styles.directionCardClose}
                onPress={() => setSelectedPlace(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={14} color="#9CA3AF" />
              </TouchableOpacity>

              <View style={styles.directionCardContent}>
                {selectedPlace.entry.photo ? (
                  <Image source={{ uri: selectedPlace.entry.photo }} style={styles.directionCardImg} />
                ) : (
                  <View style={[styles.directionCardImg, styles.directionCardImgPlaceholder]}>
                    <Feather name="map-pin" size={18} color="#9CA3AF" />
                  </View>
                )}
                <View style={styles.directionCardInfo}>
                  <Text style={styles.directionCardName} numberOfLines={1}>{selectedPlace.entry.name}</Text>
                  <View style={styles.directionCardMeta}>
                    <Feather name="clock" size={10} color="#9CA3AF" />
                    <Text style={styles.directionCardMetaText}>{selectedPlace.entry.mockTime}</Text>
                  </View>
                  {selectedPlace.distFromPrev && (
                    <View style={styles.directionCardMeta}>
                      <Feather name="navigation" size={10} color={BRAND} />
                      <Text style={[styles.directionCardMetaText, { color: BRAND, fontWeight: '600' }]}>
                        {selectedPlace.distFromPrev} from prev
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.directionCardBtns}>
                <TouchableOpacity
                  style={styles.directionBtn}
                  onPress={() => handleDirections(selectedPlace.entry.latitude, selectedPlace.entry.longitude, selectedPlace.entry.name)}
                  activeOpacity={0.8}
                  disabled={navigatingToPlace}
                >
                  {navigatingToPlace
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Feather name="map" size={14} color="#FFF" />
                  }
                  <Text style={styles.directionBtnText}>Directions</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.directionBtn, styles.navigateBtn]}
                  onPress={() => handleNavigate(selectedPlace.entry.latitude, selectedPlace.entry.longitude)}
                  activeOpacity={0.8}
                  disabled={navigatingToPlace}
                >
                  <Feather name="navigation" size={14} color={BRAND} />
                  <Text style={[styles.directionBtnText, styles.navigateBtnText]}>Navigate</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* ═══════ 2. TRAVEL TIMELINE ═══════ */}
      <View style={styles.timelineSection}>
        <View style={styles.timelineHeader}>
          <Text style={styles.timelineTitle}>Travel Timeline</Text>
          <View style={styles.timelineHeaderRight}>
            {reorderedTimeline && (
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setReorderedTimeline(null);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <Feather name="rotate-ccw" size={12} color="#EF4444" />
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.timelineCount}>{visitedCount} places</Text>
          </View>
        </View>

        <Text style={styles.dragHint}>
          <Feather name="info" size={11} color="#9CA3AF" /> Drag ≡ handle to reorder
        </Text>

        <View style={styles.timelineList}>
          {timeline.map((entry, idx) => (
            <DraggableTimelineItem
              key={entry.id}
              entry={entry}
              idx={idx}
              isHighlighted={highlightedIdx === idx}
              isLast={idx === timeline.length - 1}
              dist={idx < distances.length ? distances[idx] : null}
              onTap={handleTimelineTap}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              itemHeight={ITEM_HEIGHT}
            />
          ))}
        </View>
      </View>

      {/* ═══════ 3. FULLSCREEN MAP + BOTTOM SHEET ═══════ */}
      <Modal
        visible={fullscreenMap}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
      >
        <GestureHandlerRootView style={styles.fullscreenContainer}>
          <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

          {/* Full map */}
          <WebView
            ref={fullscreenWebViewRef}
            source={{ html: mapHtml }}
            style={styles.fullscreenMap}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            originWhitelist={['*']}
            androidLayerType="software"
            onMessage={handleFullscreenMessage}
          />

          {/* Top controls */}
          <View style={styles.fullscreenTopBar}>
            <TouchableOpacity
              style={styles.fullscreenTopBtn}
              onPress={closeFullscreen}
              activeOpacity={0.8}
            >
              <Feather name="x" size={20} color="#1A1A1A" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fullscreenTopBtn}
              onPress={() => handleMyLocation(fullscreenWebViewRef)}
              activeOpacity={0.8}
              disabled={locatingUser}
            >
              {locatingUser
                ? <ActivityIndicator size="small" color={BRAND} />
                : <Feather name="crosshair" size={18} color={BRAND} />
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fullscreenTopBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                fullscreenWebViewRef.current?.injectJavaScript(`fitAllBounds(); true;`);
              }}
              activeOpacity={0.8}
            >
              <Feather name="navigation" size={18} color={BRAND} />
            </TouchableOpacity>
          </View>

          {/* ── Fullscreen Direction Card ── */}
          {selectedPlace && (
            <View style={[styles.directionCard, { bottom: 280, left: 12, right: 12 }]}>
              <TouchableOpacity
                style={styles.directionCardClose}
                onPress={() => setSelectedPlace(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={14} color="#9CA3AF" />
              </TouchableOpacity>
              <View style={styles.directionCardContent}>
                {selectedPlace.entry.photo ? (
                  <Image source={{ uri: selectedPlace.entry.photo }} style={styles.directionCardImg} />
                ) : (
                  <View style={[styles.directionCardImg, styles.directionCardImgPlaceholder]}>
                    <Feather name="map-pin" size={18} color="#9CA3AF" />
                  </View>
                )}
                <View style={styles.directionCardInfo}>
                  <Text style={styles.directionCardName} numberOfLines={1}>{selectedPlace.entry.name}</Text>
                  <View style={styles.directionCardMeta}>
                    <Feather name="clock" size={10} color="#9CA3AF" />
                    <Text style={styles.directionCardMetaText}>{selectedPlace.entry.mockTime}</Text>
                  </View>
                  {selectedPlace.distFromPrev && (
                    <View style={styles.directionCardMeta}>
                      <Feather name="navigation" size={10} color={BRAND} />
                      <Text style={[styles.directionCardMetaText, { color: BRAND, fontWeight: '600' }]}>
                        {selectedPlace.distFromPrev} from prev
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.directionCardBtns}>
                <TouchableOpacity
                  style={styles.directionBtn}
                  onPress={() => handleDirections(selectedPlace.entry.latitude, selectedPlace.entry.longitude, selectedPlace.entry.name)}
                  activeOpacity={0.8}
                  disabled={navigatingToPlace}
                >
                  {navigatingToPlace
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Feather name="map" size={14} color="#FFF" />
                  }
                  <Text style={styles.directionBtnText}>Directions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.directionBtn, styles.navigateBtn]}
                  onPress={() => handleNavigate(selectedPlace.entry.latitude, selectedPlace.entry.longitude)}
                  activeOpacity={0.8}
                  disabled={navigatingToPlace}
                >
                  <Feather name="navigation" size={14} color={BRAND} />
                  <Text style={[styles.directionBtnText, styles.navigateBtnText]}>Navigate</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bottom Sheet — draggable timeline */}
          <BottomSheet
            ref={bottomSheetRef}
            index={0}
            snapPoints={snapPoints}
            enablePanDownToClose={false}
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={styles.sheetHandle}
            style={styles.sheetShadow}
          >
            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={styles.sheetBrandDot} />
                <Text style={styles.sheetTitle}>{trip.destination}</Text>
              </View>
              <Text style={styles.sheetCount}>{visitedCount} spots</Text>
            </View>

            {/* Scrollable Timeline inside Sheet */}
            <BottomSheetScrollView
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              {timeline.map((entry, idx) => {
                const hasPhoto = !!entry.photo;
                const isHighlighted = highlightedIdx === idx;
                const dist = idx < distances.length ? distances[idx] : null;

                return (
                  <React.Fragment key={entry.id}>
                    <TouchableOpacity
                      style={[styles.sheetItem, isHighlighted && styles.sheetItemHighlighted]}
                      activeOpacity={0.7}
                      onPress={() => handleFullscreenTimelineTap(idx)}
                    >
                      <View style={[styles.sheetStepDot, isHighlighted && styles.sheetStepDotActive]}>
                        <Text style={[styles.sheetStepNum, isHighlighted && styles.sheetStepNumActive]}>
                          {idx + 1}
                        </Text>
                      </View>

                      {hasPhoto ? (
                        <Image source={{ uri: entry.photo }} style={styles.sheetThumb} />
                      ) : (
                        <View style={[styles.sheetThumb, styles.sheetThumbPlaceholder]}>
                          <Feather name="map-pin" size={14} color="#9CA3AF" />
                        </View>
                      )}

                      <View style={styles.sheetItemInfo}>
                        <Text style={styles.sheetItemName} numberOfLines={1}>{entry.name}</Text>
                        <Text style={styles.sheetItemMeta}>{entry.mockTime} · {formatShortDate(entry.dayDate)}</Text>
                      </View>

                      <Feather name="chevron-right" size={14} color={isHighlighted ? BRAND : '#D1D5DB'} />
                    </TouchableOpacity>

                    {dist && (
                      <View style={styles.sheetDistBadge}>
                        <Text style={styles.sheetDistText}>🚗 {dist.distance} · {dist.time}</Text>
                      </View>
                    )}
                  </React.Fragment>
                );
              })}
            </BottomSheetScrollView>
          </BottomSheet>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════
// STYLES
// ═══════════════════════════════════════
const styles = StyleSheet.create({
  container: { paddingBottom: 40 },

  /* ── Map Card ── */
  mapCard: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#F0F1F3',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 4 },
    }),
  },
  mapHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  mapHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mapLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mapPin: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center',
  },
  mapLocationText: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  visitedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F0F7FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  visitedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: BRAND },
  visitedText: { fontSize: 12, fontWeight: '600', color: BRAND },
  expandBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },

  /* ── Map ── */
  mapContainer: { height: 240, position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 10,
    backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  mapLoadingText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  myLocationBtn: {
    position: 'absolute', bottom: 56, right: 12,
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  recenterBtn: {
    position: 'absolute', bottom: 12, right: 12,
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },

  /* ── Timeline Section ── */
  timelineSection: { marginHorizontal: 16, marginTop: 20 },
  timelineHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
  },
  timelineHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  timelineCount: {
    fontSize: 12, fontWeight: '600', color: '#9CA3AF',
    backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  resetBtnText: { fontSize: 11, fontWeight: '600', color: '#EF4444' },
  dragHint: { fontSize: 11, color: '#9CA3AF', marginBottom: 10 },
  timelineList: { gap: 0 },

  /* ── Timeline Item ── */
  timelineItem: {
    flexDirection: 'row', gap: 8,
    paddingVertical: 12, paddingLeft: 4, paddingRight: 12,
    backgroundColor: '#FFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#F3F4F6',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  timelineItemHighlighted: {
    borderColor: BRAND, backgroundColor: '#F8FAFF', borderWidth: 1.5,
    ...Platform.select({
      ios: { shadowColor: BRAND, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },

  /* ── Drag Handle ── */
  dragHandle: {
    width: 28, height: 44,
    justifyContent: 'center', alignItems: 'center',
  },

  timelineStepCol: { alignItems: 'center', width: 28 },
  timelineStepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  timelineStepDotActive: { backgroundColor: BRAND },
  timelineStepNum: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  timelineStepNumActive: { color: '#FFF' },
  timelineConnector: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginTop: 4 },
  timelineAvatar: { width: 44, height: 44 },
  timelineAvatarImg: { width: 44, height: 44, borderRadius: 10 },
  timelineAvatarPlaceholder: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  timelineInfo: { flex: 1, gap: 2 },
  timelinePlaceName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  timelineMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timelineMetaText: { fontSize: 12, color: '#9CA3AF' },
  timelineMemory: { fontSize: 12, color: '#6B7280', lineHeight: 17, marginTop: 1 },

  /* ── Distance Badge ── */
  distanceBadge: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4, gap: 8,
  },
  distanceLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  distancePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F9FAFB', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1, borderColor: '#F3F4F6',
  },
  distanceText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },

  /* ── Direction Bottom Card ── */
  directionCard: {
    position: 'absolute', bottom: 8, left: 8, right: 8,
    backgroundColor: '#FFF', borderRadius: 16,
    padding: 14, gap: 12, zIndex: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.12, shadowRadius: 10 },
      android: { elevation: 8 },
    }),
  },
  directionCardClose: {
    position: 'absolute', top: 10, right: 10, zIndex: 2,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  directionCardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  directionCardImg: { width: 52, height: 52, borderRadius: 12 },
  directionCardImgPlaceholder: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  directionCardInfo: { flex: 1, gap: 3 },
  directionCardName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  directionCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  directionCardMetaText: { fontSize: 11, color: '#9CA3AF' },
  directionCardBtns: { flexDirection: 'row', gap: 10 },
  directionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: BRAND, paddingVertical: 10, borderRadius: 12,
  },
  directionBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  navigateBtn: { backgroundColor: '#F0F4FF', borderWidth: 1, borderColor: BRAND },
  navigateBtnText: { color: BRAND },

  /* ── Fullscreen ── */
  fullscreenContainer: { flex: 1, backgroundColor: '#000' },
  fullscreenMap: { flex: 1 },
  fullscreenTopBar: {
    position: 'absolute', top: Platform.OS === 'ios' ? 54 : 40,
    right: 16, flexDirection: 'column', gap: 10,
  },
  fullscreenTopBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },

  /* ── Bottom Sheet ── */
  sheetBackground: {
    backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  sheetHandle: { backgroundColor: '#D1D5DB', width: 40 },
  sheetShadow: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
    }),
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  sheetHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetBrandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  sheetCount: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  sheetContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },

  /* ── Sheet Timeline Items ── */
  sheetItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: '#FFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 4,
  },
  sheetItemHighlighted: {
    borderColor: BRAND, backgroundColor: '#F8FAFF', borderWidth: 1.5,
  },
  sheetStepDot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  sheetStepDotActive: { backgroundColor: BRAND },
  sheetStepNum: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  sheetStepNumActive: { color: '#FFF' },
  sheetThumb: { width: 40, height: 40, borderRadius: 10 },
  sheetThumbPlaceholder: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  sheetItemInfo: { flex: 1, gap: 2 },
  sheetItemName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  sheetItemMeta: { fontSize: 11, color: '#9CA3AF' },
  sheetDistBadge: {
    alignItems: 'center', paddingVertical: 4, marginBottom: 4,
  },
  sheetDistText: {
    fontSize: 10, fontWeight: '600', color: '#9CA3AF',
    backgroundColor: '#F9FAFB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
});

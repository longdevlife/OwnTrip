import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  PanResponder,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TimelineEntry } from './types';
import { formatShortDate } from './helpers';
import { styles } from './styles';

export interface DraggableTimelineItemProps {
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

export function DraggableTimelineItem({
  entry, idx, isHighlighted, isLast, dist,
  onTap, onDragStart, onDragEnd, itemHeight,
}: DraggableTimelineItemProps) {
  const hasPhoto = !!entry.photo;
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const liftAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 8;
      },
      onPanResponderGrant: () => {
        isDragging.current = true;
        dragStartY.current = 0;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onDragStart(idx);
        // Lift animation
        Animated.spring(liftAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        dragStartY.current = gestureState.dy;
        translateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        isDragging.current = false;
        // Drop animation
        Animated.parallel([
          Animated.spring(liftAnim, { toValue: 0, useNativeDriver: true, friction: 8 }),
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }),
        ]).start();
        onDragEnd(idx, gestureState.dy);
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        Animated.parallel([
          Animated.spring(liftAnim, { toValue: 0, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
        ]).start();
      },
    })
  ).current;

  const animatedStyle = {
    transform: [
      { translateY },
      { scale: liftAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
    ],
    zIndex: liftAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 100] }) as any,
    shadowOpacity: liftAnim.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.18] }),
    shadowRadius: liftAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 16] }),
    elevation: liftAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 8] }) as any,
  };

  return (
    <>
      <Animated.View style={[{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 } }, animatedStyle]}>
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
      </Animated.View>

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

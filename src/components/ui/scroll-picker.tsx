import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { colors } from '../../constants/colors';

type Props = {
  min?: number;
  max?: number;
  value: number;
  onValueChange: (v: number) => void;
};

const ITEM_HEIGHT = 58;

export function ScrollPicker({ min = 1, max = 50, value, onValueChange }: Props) {
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const listRef = useRef<FlatList<number>>(null);
  const offsetRef = useRef(0);
  const items = useMemo(
    () => Array.from({ length: max - min + 1 }, (_, i) => min + i),
    [min, max]
  );
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, Math.min(items.length - 1, value - min))
  );

  useEffect(() => {
    const idx = Math.max(0, Math.min(items.length - 1, value - min));
    setActiveIndex(idx);
    listRef.current?.scrollToOffset({ offset: idx * ITEM_HEIGHT, animated: false });
  }, [value, min, items.length]);

  const commit = useCallback(() => {
    const idx = Math.round(offsetRef.current / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    setActiveIndex(clamped);
    const next = items[clamped];
    if (next !== value) onValueChange(next);
    listRef.current?.scrollToOffset({ offset: clamped * ITEM_HEIGHT, animated: true });
  }, [items, onValueChange, value]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetRef.current = e.nativeEvent.contentOffset.y;
    const idx = Math.round(offsetRef.current / ITEM_HEIGHT);
    setActiveIndex(Math.max(0, Math.min(items.length - 1, idx)));
  }, [items.length]);

  return (
    <View style={styles.wrap}>
      <View style={styles.indicator} pointerEvents="none" />
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(i) => String(i)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={commit}
        onScrollEndDrag={(e) => {
          if (e.nativeEvent.velocity?.y === 0) commit();
        }}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={9}
        renderItem={({ item, index }) => {
          const isActive = index === activeIndex;
          return (
            <View style={styles.item}>
              <Text
                style={[
                  styles.itemText,
                  isActive && styles.itemActive,
                  !isActive && styles.itemDim,
                  { fontSize: isActive ? (compact ? 52 : 60) : compact ? 24 : 26 },
                ]}
              >
                {item}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: ITEM_HEIGHT * 5,
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: colors.pureWhite,
    borderWidth: 1,
    borderColor: colors.line,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: '50%',
    height: ITEM_HEIGHT,
    marginTop: -ITEM_HEIGHT / 2,
    borderRadius: 14,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.forestGreenSoft,
    zIndex: 0,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontFamily: 'DMSans_500Medium',
    color: colors.midnightNavy,
  },
  itemActive: {
    fontFamily: 'Fraunces_600SemiBold',
    color: colors.forestGreen,
    fontWeight: '700',
  },
  itemDim: {
    color: colors.muted,
  },
});

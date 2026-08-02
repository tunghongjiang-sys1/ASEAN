import { useCallback, useEffect, useRef } from 'react';
import {
  FlatList,
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

const ITEM_HEIGHT = 52;

export function ScrollPicker({ min = 1, max = 50, value, onValueChange }: Props) {
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const listRef = useRef<FlatList>(null);
  const items = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  const initialIndex = value - min;

  useEffect(() => {
    if (listRef.current && initialIndex >= 0) {
      setTimeout(() => {
        listRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
          viewPosition: 0.5,
        });
      }, 100);
    }
  }, [initialIndex]);

  const onMomentumEnd = useCallback(
    (e: any) => {
      const y = e.nativeEvent.contentOffset.y;
      const idx = Math.round(y / ITEM_HEIGHT);
      const newVal = items[Math.max(0, Math.min(items.length - 1, idx))];
      onValueChange(newVal);
      listRef.current?.scrollToIndex({ index: newVal - min, animated: true, viewPosition: 0.5 });
    },
    [items, min, onValueChange]
  );

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
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        renderItem={({ item }) => {
          const isCenter = item === value;
          return (
            <View style={styles.item}>
              <Text
                style={[
                  styles.itemText,
                  { fontSize: compact ? 32 : 38 },
                  !isCenter && styles.itemDim,
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
    fontFamily: 'Fraunces_600SemiBold',
    color: colors.forestGreen,
  },
  itemDim: {
    color: colors.muted,
    fontSize: 26,
  },
});

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
import { addDays, toISODate } from '../../services/flights';

const ITEM_HEIGHT = 46;
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function label(d: Date): string {
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function Wheel({
  dates,
  value,
  onCommit,
}: {
  dates: Date[];
  value: Date;
  onCommit: (d: Date) => void;
}) {
  const listRef = useRef<FlatList<Date>>(null);
  const offsetRef = useRef(0);
  const indexOf = useCallback(
    (d: Date) => {
      const days = Math.round(
        (startOfDay(d).getTime() - startOfDay(dates[0]).getTime()) / 86400000
      );
      return Math.max(0, Math.min(dates.length - 1, days));
    },
    [dates]
  );
  const [activeIndex, setActiveIndex] = useState(() => indexOf(value));

  useEffect(() => {
    const idx = indexOf(value);
    setActiveIndex(idx);
    listRef.current?.scrollToOffset({ offset: idx * ITEM_HEIGHT, animated: false });
  }, [value, indexOf]);

  const commit = useCallback(() => {
    const idx = Math.round(offsetRef.current / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(dates.length - 1, idx));
    setActiveIndex(clamped);
    const next = dates[clamped];
    if (toISODate(next) !== toISODate(value)) onCommit(next);
    listRef.current?.scrollToOffset({ offset: clamped * ITEM_HEIGHT, animated: true });
  }, [dates, onCommit, value]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      offsetRef.current = e.nativeEvent.contentOffset.y;
      const idx = Math.round(offsetRef.current / ITEM_HEIGHT);
      setActiveIndex(Math.max(0, Math.min(dates.length - 1, idx)));
    },
    [dates.length]
  );

  return (
    <View style={styles.wheel}>
      <View style={styles.indicator} pointerEvents="none" />
      <FlatList
        ref={listRef}
        data={dates}
        keyExtractor={(d) => toISODate(d)}
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
        initialNumToRender={14}
        maxToRenderPerBatch={14}
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
                ]}
              >
                {label(item)}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

type Props = {
  start: Date;
  end: Date;
  minDate?: Date;
  maxDate?: Date;
  onChange: (start: Date, end: Date) => void;
};

/** Scroll-to-pick going + return dates (two wheels), instead of a calendar grid. */
export function ScrollDatePicker({ start, end, minDate, maxDate, onChange }: Props) {
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const min = startOfDay(minDate || new Date());
  const max = startOfDay(maxDate || addDays(min, 180));

  const dates = useMemo(() => {
    const out: Date[] = [];
    let d = min;
    while (d <= max) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }, [min, max]);

  const nights = Math.max(0, Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000));

  return (
    <View style={styles.wrap}>
      <View style={[styles.row, compact && styles.stack]}>
        <View style={styles.col}>
          <Text style={styles.colLabel}>going</Text>
          <Wheel
            dates={dates}
            value={start}
            onCommit={(d) => onChange(d, end > d ? end : addDays(d, 1))}
          />
        </View>
        <View style={styles.col}>
          <Text style={styles.colLabel}>back</Text>
          <Wheel
            dates={dates}
            value={end}
            onCommit={(d) => onChange(start < d ? start : start, d > start ? d : addDays(start, 1))}
          />
        </View>
      </View>
      <Text style={styles.summary}>
        going: {label(startOfDay(start))} → back: {label(startOfDay(end))} · {nights} night
        {nights === 1 ? '' : 's'}
      </Text>
      <Text style={styles.hint}>scroll each wheel to pick your going and return dates.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.pureWhite,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
  },
  row: { flexDirection: 'row', gap: 12 },
  stack: { flexDirection: 'column', gap: 10 },
  col: { flex: 1 },
  colLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
  },
  wheel: {
    height: ITEM_HEIGHT * 5,
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.line,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: '50%',
    height: ITEM_HEIGHT,
    marginTop: -ITEM_HEIGHT / 2,
    borderRadius: 12,
    backgroundColor: colors.subtleBlue,
    borderWidth: 1,
    borderColor: colors.aseanBlue,
    zIndex: 0,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: colors.midnightNavy,
  },
  itemActive: {
    fontFamily: 'Fraunces_600SemiBold',
    color: colors.aseanBlue,
    fontSize: 17,
  },
  itemDim: {
    color: colors.muted,
  },
  summary: {
    marginTop: 10,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.deepNavy,
  },
  hint: {
    marginTop: 3,
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: colors.muted,
  },
});

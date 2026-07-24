import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import type { Minigame } from '../../types/place';
import { Button } from '../ui/button';

type Props = {
  game: Minigame;
  onDone: (score: number) => void;
};

export function MinigameBoard({ game, onDone }: Props) {
  const [score, setScore] = useState(0);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [message, setMessage] = useState(game.rules || 'tap tiles to unlock simple facts');
  const [started, setStarted] = useState(false);

  const items = useMemo(() => {
    const base = game.facts.length ? game.facts : ['a quiet fact about this place'];
    return base.map((fact, i) => ({
      id: i,
      label: ['1', '2', '3', '4'][i % 4],
      fact,
    }));
  }, [game.facts]);

  const targets = useMemo(() => {
    if (game.type === 'sequence' || game.type === 'pattern' || game.type === 'layout') {
      return [0, 1, 2, 3].slice(0, Math.min(4, items.length));
    }
    return items.map((_, i) => i);
  }, [game.type, items]);

  const reveal = (index: number) => {
    if (!started) return;
    if (picked.includes(index)) return;
    const next = [...picked, index];
    setPicked(next);
    setScore((s) => s + 10);
    setMessage(items[index]?.fact || 'nice find');
    setStep((s) => s + 1);

    if (game.type === 'sequence' || game.type === 'pattern') {
      const expected = targets[next.length - 1];
      if (index !== expected) {
        setMessage('oops — try again in order');
        setPicked([]);
        setScore((s) => Math.max(0, s - 5));
        return;
      }
    }

    if (next.length >= Math.min(items.length, 4)) {
      setTimeout(() => onDone(score + 10), 600);
    }
  };

  if (!started) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.meta}>
          {game.category.toLowerCase()} · {game.type}
        </Text>
        <Text style={styles.title}>{game.title}</Text>
        <Text style={styles.desc}>{game.description}</Text>

        <View style={styles.rulesBox}>
          <Text style={styles.rulesLabel}>how to play</Text>
          <Text style={styles.rules}>{game.rules}</Text>
        </View>

        <Button label="start" onPress={() => setStarted(true)} style={{ marginTop: 18 }} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.meta}>
        {game.category.toLowerCase()} · {game.type}
      </Text>
      <Text style={styles.title}>{game.title}</Text>
      <Text style={styles.how}>{game.rules}</Text>

      <View style={styles.board}>
        {items.slice(0, 4).map((item, index) => {
          const on = picked.includes(index);
          return (
            <Pressable
              key={item.id}
              onPress={() => reveal(index)}
              style={[styles.cell, on && styles.cellOn]}
            >
              <Text style={[styles.cellText, on && styles.cellTextOn]}>
                {on ? 'unlocked' : `tap ${item.label}`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.factBox}>
        <Text style={styles.factLabel}>fact</Text>
        <Text style={styles.fact}>{message}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.score}>score {score}</Text>
        <Text style={styles.progress}>
          {picked.length}/{Math.min(items.length, 4)} · step {step}
        </Text>
      </View>

      <Button label="finish early" variant="ghost" onPress={() => onDone(score)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  meta: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.aseanBlue,
    marginBottom: 6,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 26,
    color: colors.deepNavy,
  },
  desc: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.ink,
    marginBottom: 12,
  },
  how: {
    marginTop: 8,
    marginBottom: 16,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.midnightNavy,
  },
  rulesBox: {
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.warmCream,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rulesLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.aseanBlue,
    marginBottom: 8,
  },
  rules: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cell: {
    width: '47%',
    minHeight: 88,
    borderRadius: 16,
    backgroundColor: colors.subtleBlue,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cellOn: {
    backgroundColor: colors.deepNavy,
    borderColor: colors.deepNavy,
  },
  cellText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: colors.deepNavy,
    textAlign: 'center',
  },
  cellTextOn: { color: colors.aseanYellow },
  factBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.warmCream,
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: 96,
  },
  factLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: colors.midnightNavy,
    marginBottom: 6,
  },
  fact: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.ink,
  },
  footer: {
    marginTop: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  score: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: colors.deepNavy,
  },
  progress: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.muted,
  },
});

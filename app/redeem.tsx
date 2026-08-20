import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../src/components/ui/back-button';
import { Button } from '../src/components/ui/button';
import { colors } from '../src/constants/colors';
import { useApp } from '../src/context/app-context';
import { convertAmount, detectUserCurrency } from '../src/services/currency';
import type { RedeemedVoucher, ShopVoucher } from '../src/types/place';

const VOUCHERS_RAW: Array<Omit<ShopVoucher, 'points'> & { pointsSGD: number }> = [
  { id: 'v-att-bali', category: 'attraction', title: 'Bali Temples Pass', description: '20% off entrance fees to 5 major Balinese temples', pointsSGD: 200, country: 'Indonesia' },
  { id: 'v-att-angkor', category: 'attraction', title: 'Angkor Wat 3-Day Pass', description: '15% discount on the 3-day Angkor Archaeological Park ticket', pointsSGD: 350, country: 'Cambodia' },
  { id: 'v-att-halong', category: 'attraction', title: 'Ha Long Bay Cruise', description: '10% off an overnight cruise in Ha Long Bay', pointsSGD: 500, country: 'Vietnam' },
  { id: 'v-food-bali', category: 'food', title: 'Bali Warung Voucher', description: 'Free local meal at a certified warung', pointsSGD: 100, country: 'Indonesia' },
  { id: 'v-food-saigon', category: 'food', title: 'Saigon Street Food Tour', description: '25% off a guided street food walking tour in Ho Chi Minh City', pointsSGD: 150, country: 'Vietnam' },
  { id: 'v-food-pp', category: 'food', title: 'Phnom Penh Dining Credit', description: 'Dining credit at partner restaurants in Phnom Penh', pointsSGD: 120, country: 'Cambodia' },
  { id: 'v-hotel-bali', category: 'hotel', title: 'Bali Resort Discount', description: '15% off 3-night stay at partner resorts in Bali', pointsSGD: 600, country: 'Indonesia' },
  { id: 'v-hotel-siemp', category: 'hotel', title: 'Siem Reap Hotel Deal', description: '20% off boutique hotel stays near Angkor', pointsSGD: 450, country: 'Cambodia' },
  { id: 'v-hotel-hanoi', category: 'hotel', title: 'Hanoi Old Quarter Stay', description: '10% off accommodations in Hanoi Old Quarter', pointsSGD: 350, country: 'Vietnam' },
  { id: 'v-trans-bus', category: 'transport', title: 'Intercity Bus Pass', description: 'Free bus ticket between major ASEAN cities', pointsSGD: 250, country: 'All' },
  { id: 'v-trans-train', category: 'transport', title: 'Vietnam Rail Discount', description: '20% off Vietnam Railways (Reunification Express)', pointsSGD: 300, country: 'Vietnam' },
  { id: 'v-ride-grab', category: 'ridehailing', title: 'Grab Ride Voucher', description: 'Ride voucher for Grab in any ASEAN country', pointsSGD: 80, country: 'All' },
  { id: 'v-ride-gojek', category: 'ridehailing', title: 'Gojek Credit', description: 'Gojek rides and delivery credit in Indonesia', pointsSGD: 70, country: 'Indonesia' },
  { id: 'v-tour-bali', category: 'tour', title: 'Bali Day Tour Package', description: '30% off a private driver + guide day tour in Bali', pointsSGD: 400, country: 'Indonesia' },
  { id: 'v-tour-cambodia', category: 'tour', title: 'Cambodia Temple Tour', description: '25% off guided temple circuit tour (Angkor + Banteay Srei)', pointsSGD: 450, country: 'Cambodia' },
  { id: 'v-tour-vietnam', category: 'tour', title: 'Vietnam Heritage Tour', description: '20% off a multi-day heritage tour across central Vietnam', pointsSGD: 700, country: 'Vietnam' },
];

const VOUCHER_CATEGORY_LABELS: Record<ShopVoucher['category'], string> = {
  attraction: '🎟 Attraction Tickets',
  food: '🍜 Food & Beverage',
  hotel: '🏨 Hotel / Accommodation',
  transport: '🚌 Public Transport',
  ridehailing: '🚗 Ride-Hailing',
  tour: '🧭 Tour Packages',
};

function formatReceiptDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function RedeemScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const wide = width >= 900;
  const { auth, onboarded, shopPoints, userLocation, redeemVoucher, isVoucherRedeemed } = useApp();
  const [filterCat, setFilterCat] = useState<ShopVoucher['category'] | 'all'>('all');
  const [receipt, setReceipt] = useState<RedeemedVoucher | null>(null);

  const currency = useMemo(() => detectUserCurrency(userLocation), [userLocation]);

  const vouchers: ShopVoucher[] = useMemo(
    () =>
      VOUCHERS_RAW.map((v) => ({
        ...v,
        points: Math.round(convertAmount(v.pointsSGD, 'SGD', currency.code)),
      })),
    [currency]
  );

  const filteredVouchers = useMemo(
    () => (filterCat === 'all' ? vouchers : vouchers.filter((v) => v.category === filterCat)),
    [filterCat, vouchers]
  );

  const handleRedeem = (v: ShopVoucher) => {
    Alert.alert(
      `Redeem ${v.title}?`,
      `${v.description}\n\nThis will cost ${v.points.toLocaleString()} points. You have ${shopPoints.toLocaleString()} points.\n\nYour voucher code will be shown after confirmation.`,
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'confirm redeem',
          style: 'default',
          onPress: () => {
            const result = redeemVoucher(v.id, v.points, v.title, v.category);
            if (result) {
              setReceipt(result);
            } else {
              Alert.alert(
                'Could not redeem',
                'You may not have enough points, or this voucher has already been redeemed.'
              );
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (!auth) return <Redirect href="/welcome" />;
  if (!onboarded) return <Redirect href="/welcome" />;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <BackButton />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pointsBanner}>
          <Text style={styles.pointsLabel}>your shop points</Text>
          <Text style={styles.pointsValue}>{shopPoints.toLocaleString()}</Text>
          <Text style={styles.pointsHint}>
            earn points by flying ASEAN airlines and playing minigames
          </Text>
          {currency.code !== 'SGD' && (
            <Text style={styles.currencyNote}>
              prices shown in {currency.code} ({currency.symbol})
            </Text>
          )}
        </View>

        <Text style={[styles.title, { fontSize: compact ? 28 : wide ? 48 : 36 }]}>shop</Text>
        <Text style={[styles.sub, { maxWidth: wide ? 640 : undefined }]}>
          Redeem Your Points For Travel Discounts, Vouchers, And Exclusive Deals Across Southeast
          ASIA.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={{ gap: 8 }}
        >
          {(['all', 'attraction', 'food', 'hotel', 'transport', 'ridehailing', 'tour'] as const).map(
            (cat) => (
              <Pressable
                key={cat}
                onPress={() => setFilterCat(cat)}
                style={[styles.filterChip, filterCat === cat && styles.filterChipOn]}
              >
                <Text style={[styles.filterText, filterCat === cat && styles.filterTextOn]}>
                  {cat === 'all'
                    ? 'all'
                    : VOUCHER_CATEGORY_LABELS[cat].split(' ').slice(0, 2).join(' ')}
                </Text>
              </Pressable>
            )
          )}
        </ScrollView>

        <View style={styles.grid}>
          {filteredVouchers.map((v) => {
            const redeemed = isVoucherRedeemed(v.id);
            const canAfford = shopPoints >= v.points;
            return (
              <View key={v.id} style={styles.card}>
                <Text style={styles.cardCategory}>{VOUCHER_CATEGORY_LABELS[v.category]}</Text>
                <Text style={styles.cardTitle}>{v.title}</Text>
                <Text style={styles.cardDesc}>{v.description}</Text>
                <View style={styles.cardBottom}>
                  <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>{v.country}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.cardPoints}>
                      {v.points.toLocaleString()} pts
                    </Text>
                    {redeemed ? (
                      <View style={styles.redeemedBtn}>
                        <Text style={styles.redeemedText}>redeemed ✓</Text>
                      </View>
                    ) : canAfford ? (
                      <Button
                        label="redeem"
                        onPress={() => handleRedeem(v)}
                        style={{ minHeight: 34, paddingHorizontal: 14 }}
                      />
                    ) : (
                      <View style={styles.lockedBtn}>
                        <Text style={styles.lockedText}>locked</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal
        visible={!!receipt}
        transparent
        animationType="fade"
        onRequestClose={() => setReceipt(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.receiptCard, { width: wide ? 480 : '90%' }]}>
            <View style={styles.perfLine} />

            <Text style={styles.receiptTitle}>voucher redeemed</Text>
            <View style={styles.receiptDivider} />

            <Text style={styles.receiptVoucher}>{receipt?.title}</Text>
            <Text style={styles.receiptCategory}>
              {receipt ? VOUCHER_CATEGORY_LABELS[receipt.category] : ''}
            </Text>

            <View style={styles.receiptDivider} />

            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>code</Text>
              <Text style={styles.receiptValueCode}>{receipt?.code}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>points spent</Text>
              <Text style={styles.receiptValue}>
                {receipt?.pointsSpent.toLocaleString()} pts
              </Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>remaining balance</Text>
              <Text style={styles.receiptValue}>
                {shopPoints.toLocaleString()} pts
              </Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>date</Text>
              <Text style={styles.receiptValue}>
                {receipt ? formatReceiptDate(receipt.redeemedAt) : ''}
              </Text>
            </View>

            <View style={styles.receiptDivider} />
            <Text style={styles.receiptFooter}>
              present this code at any partner location. valid for one-time use. non-transferable.
            </Text>

            <Button
              label="done"
              onPress={() => setReceipt(null)}
              variant="secondary"
              style={{ marginTop: 18 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: 20 },
  content: { padding: 20, paddingBottom: 48 },
  pointsBanner: {
    backgroundColor: colors.forestGreen,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  pointsLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.7)',
  },
  pointsValue: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 48,
    color: colors.pureWhite,
    marginTop: 4,
  },
  pointsHint: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  currencyNote: {
    marginTop: 8,
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.8,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    color: colors.forestGreen,
    letterSpacing: -0.6,
  },
  sub: {
    marginTop: 12,
    marginBottom: 20,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    letterSpacing: 1.4,
    lineHeight: 20,
    color: colors.forestGreen,
  },
  filterRow: {
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.pureWhite,
  },
  filterChipOn: {
    borderColor: colors.forestGreen,
    backgroundColor: colors.forestGreen,
  },
  filterText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.midnightNavy,
  },
  filterTextOn: {
    color: colors.pureWhite,
  },
  grid: { gap: 12 },
  card: {
    backgroundColor: colors.pureWhite,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  cardCategory: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: colors.aseanBlue,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 18,
    color: colors.deepNavy,
    marginBottom: 6,
  },
  cardDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  cardBottom: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBadge: {
    backgroundColor: colors.subtleBlue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  cardBadgeText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: colors.aseanBlue,
  },
  cardPoints: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: colors.forestGreen,
  },
  lockedBtn: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 0.8,
  },
  redeemedBtn: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.forestGreenSoft,
    borderWidth: 1,
    borderColor: colors.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redeemedText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: colors.forestGreen,
    letterSpacing: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  receiptCard: {
    backgroundColor: colors.paper,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.line,
    maxHeight: '85%',
  },
  perfLine: {
    height: 1,
    borderWidth: 0.5,
    borderColor: colors.line,
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  receiptTitle: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 2,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 12,
  },
  receiptVoucher: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: colors.deepNavy,
    textAlign: 'center',
    marginBottom: 6,
  },
  receiptCategory: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.aseanBlue,
    textAlign: 'center',
    marginBottom: 4,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 16,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  receiptLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.muted,
  },
  receiptValue: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: colors.deepNavy,
  },
  receiptValueCode: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.forestGreen,
    letterSpacing: 0.6,
  },
  receiptFooter: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
});

import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { NeonCard } from "@/components/neon-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const ANALYTICS_COLOR = "#A855F7";

type Direction = "long" | "short" | "neutral";

interface TradeIdea {
  id: string;
  ticker: string;
  name: string;
  direction: Direction;
  entry: string;
  target: string;
  stopLoss: string;
  timeframe: string;
  date: string;
  description: string;
  tags: string[];
}

const TRADE_IDEAS: TradeIdea[] = [
  {
    id: "1",
    ticker: "SBER",
    name: "Сбербанк",
    direction: "long",
    entry: "290–295",
    target: "320",
    stopLoss: "280",
    timeframe: "Дневной",
    date: "28 мар 2026",
    description: "Формирование разворотного паттерна после коррекции. Объёмы подтверждают интерес покупателей.",
    tags: ["акции", "MOEX", "разворот"],
  },
  {
    id: "2",
    ticker: "GAZP",
    name: "Газпром",
    direction: "short",
    entry: "155–158",
    target: "140",
    stopLoss: "165",
    timeframe: "4 часа",
    date: "27 мар 2026",
    description: "Пробой уровня поддержки с объёмом. Ожидается продолжение нисходящего тренда.",
    tags: ["акции", "MOEX", "пробой"],
  },
  {
    id: "3",
    ticker: "USDRUB",
    name: "Доллар/Рубль",
    direction: "neutral",
    entry: "88–89",
    target: "92",
    stopLoss: "85",
    timeframe: "Недельный",
    date: "25 мар 2026",
    description: "Консолидация в диапазоне. Ожидаем выход из флэта по фундаментальным факторам.",
    tags: ["форекс", "валюта"],
  },
  {
    id: "4",
    ticker: "LKOH",
    name: "Лукойл",
    direction: "long",
    entry: "7 200–7 300",
    target: "7 800",
    stopLoss: "7 000",
    timeframe: "Дневной",
    date: "24 мар 2026",
    description: "Тест уровня поддержки с дивидендным гэпом. Ожидается закрытие гэпа.",
    tags: ["акции", "нефть", "дивиденды"],
  },
];

const MARKET_REVIEWS = [
  {
    id: "r1",
    title: "Обзор рынка: итоги недели",
    date: "29 мар 2026",
    preview: "Индекс МосБиржи завершил неделю ростом на 1.2%. Ключевые события и что ждать на следующей неделе.",
    readTime: "5 мин",
  },
  {
    id: "r2",
    title: "Нефть и рубль: корреляция в 2026",
    date: "26 мар 2026",
    preview: "Анализ взаимосвязи цен на нефть и курса рубля в текущих геополитических условиях.",
    readTime: "8 мин",
  },
];

const FILTERS = ["Все", "Long", "Short", "Нейтрально"];

function DirectionBadge({ direction }: { direction: Direction }) {
  const config = {
    long: { label: "LONG ↑", color: "#39FF14" },
    short: { label: "SHORT ↓", color: "#FF2D78" },
    neutral: { label: "НЕЙТРАЛЬНО", color: "#FBBF24" },
  };
  const { label, color } = config[direction];
  return (
    <View style={[styles.dirBadge, { backgroundColor: color + "22", borderColor: color + "66" }]}>
      <Text style={[styles.dirText, { color }]}>{label}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const colors = useColors();
  const [activeFilter, setActiveFilter] = useState("Все");

  const filtered = TRADE_IDEAS.filter((idea) => {
    if (activeFilter === "Все") return true;
    if (activeFilter === "Long") return idea.direction === "long";
    if (activeFilter === "Short") return idea.direction === "short";
    return idea.direction === "neutral";
  });

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <LinearGradient
          colors={[ANALYTICS_COLOR + "22", "transparent"]}
          style={styles.header}
        >
          <View style={[styles.headerIconBg, { backgroundColor: ANALYTICS_COLOR + "22" }]}>
            <IconSymbol name="chart.bar.fill" size={36} color={ANALYTICS_COLOR} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Аналитика</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            Торговые идеи и обзоры рынка от практикующих трейдеров. Без гарантий, только реальный анализ.
          </Text>
        </LinearGradient>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {FILTERS.map((f) => (
            <Pressable
              key={f}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveFilter(f);
              }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === f ? ANALYTICS_COLOR + "33" : colors.surface,
                  borderColor: activeFilter === f ? ANALYTICS_COLOR : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: activeFilter === f ? ANALYTICS_COLOR : colors.muted },
                ]}
              >
                {f}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Trade Ideas */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Торговые идеи</Text>
          {filtered.map((idea) => (
            <NeonCard key={idea.id} glowColor={ANALYTICS_COLOR} style={styles.ideaCard}>
              <View style={styles.ideaHeader}>
                <View>
                  <Text style={[styles.ideaTicker, { color: ANALYTICS_COLOR }]}>{idea.ticker}</Text>
                  <Text style={[styles.ideaName, { color: colors.muted }]}>{idea.name}</Text>
                </View>
                <DirectionBadge direction={idea.direction} />
              </View>

              <Text style={[styles.ideaDesc, { color: colors.foreground }]}>{idea.description}</Text>

              <View style={styles.ideaLevels}>
                {[
                  { label: "Вход", value: idea.entry, color: colors.foreground },
                  { label: "Цель", value: idea.target, color: "#39FF14" },
                  { label: "Стоп", value: idea.stopLoss, color: "#FF2D78" },
                ].map((lvl) => (
                  <View key={lvl.label} style={[styles.levelBox, { backgroundColor: colors.surfaceHigh ?? colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.levelLabel, { color: colors.muted }]}>{lvl.label}</Text>
                    <Text style={[styles.levelValue, { color: lvl.color }]}>{lvl.value}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.ideaFooter}>
                <View style={styles.tagRow}>
                  {idea.tags.map((tag) => (
                    <View key={tag} style={[styles.tag, { backgroundColor: ANALYTICS_COLOR + "18", borderColor: ANALYTICS_COLOR + "44" }]}>
                      <Text style={[styles.tagText, { color: ANALYTICS_COLOR }]}>#{tag}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { color: colors.muted }]}>{idea.timeframe}</Text>
                  <Text style={[styles.metaText, { color: colors.muted }]}>{idea.date}</Text>
                </View>
              </View>
            </NeonCard>
          ))}
        </View>

        {/* Market Reviews */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Обзоры рынка</Text>
          {MARKET_REVIEWS.map((review) => (
            <NeonCard key={review.id} glowColor={ANALYTICS_COLOR} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={[styles.reviewIconBg, { backgroundColor: ANALYTICS_COLOR + "22" }]}>
                  <IconSymbol name="doc.fill" size={18} color={ANALYTICS_COLOR} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reviewTitle, { color: colors.foreground }]}>{review.title}</Text>
                  <View style={styles.reviewMeta}>
                    <Text style={[styles.metaText, { color: colors.muted }]}>{review.date}</Text>
                    <Text style={[styles.metaText, { color: colors.muted }]}>· {review.readTime}</Text>
                  </View>
                </View>
              </View>
              <Text style={[styles.reviewPreview, { color: colors.muted }]}>{review.preview}</Text>
            </NeonCard>
          ))}
        </View>

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { borderColor: colors.border }]}>
          <IconSymbol name="info.circle.fill" size={16} color={colors.muted} />
          <Text style={[styles.disclaimerText, { color: colors.muted }]}>
            Материалы носят информационный характер и не являются инвестиционными рекомендациями.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    gap: 12,
  },
  headerIconBg: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  headerTitle: { fontSize: 28, fontWeight: "800" },
  headerSubtitle: { fontSize: 14, lineHeight: 21 },
  filtersRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: "600" },
  section: {
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  ideaCard: { gap: 12 },
  ideaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  ideaTicker: { fontSize: 22, fontWeight: "800" },
  ideaName: { fontSize: 12, marginTop: 2 },
  dirBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  dirText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  ideaDesc: { fontSize: 13, lineHeight: 19 },
  ideaLevels: {
    flexDirection: "row",
    gap: 8,
  },
  levelBox: {
    flex: 1,
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  levelLabel: { fontSize: 11 },
  levelValue: { fontSize: 14, fontWeight: "700" },
  ideaFooter: { gap: 8 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: { fontSize: 11, fontWeight: "600" },
  metaRow: { flexDirection: "row", gap: 8 },
  metaText: { fontSize: 12 },
  reviewCard: { gap: 10 },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  reviewIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewTitle: { fontSize: 15, fontWeight: "700", lineHeight: 20 },
  reviewMeta: { flexDirection: "row", gap: 4, marginTop: 4 },
  reviewPreview: { fontSize: 13, lineHeight: 19 },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 17 },
});

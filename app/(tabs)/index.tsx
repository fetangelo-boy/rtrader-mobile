import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  FlatList,
  Linking,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { NeonCard } from "@/components/neon-card";
import { NeonButton } from "@/components/neon-button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { SECTIONS, STATS } from "@/constants/sections";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.72;
const CARD_GAP = 12;

function SectionCarousel() {
  const colors = useColors();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef(false);

  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        setActiveIndex((prev) => {
          const next = (prev + 1) % SECTIONS.length;
          flatListRef.current?.scrollToIndex({ index: next, animated: true });
          return next;
        });
      }
    }, 3500);
  }, []);

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [startAutoPlay]);

  const handleCardPress = (section: typeof SECTIONS[0]) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(section.route as never);
  };

  const handleScrollBegin = () => {
    isPausedRef.current = true;
  };

  const handleScrollEnd = () => {
    setTimeout(() => {
      isPausedRef.current = false;
    }, 2500);
  };

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={SECTIONS}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 20, gap: CARD_GAP }}
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
        onViewableItemsChanged={({ viewableItems }) => {
          if (viewableItems.length > 0) {
            setActiveIndex(viewableItems[0].index ?? 0);
          }
        }}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        renderItem={({ item, index }) => {
          const isActive = index === activeIndex;
          return (
            <Pressable
              onPress={() => handleCardPress(item)}
              onPressIn={() => { isPausedRef.current = true; }}
              onPressOut={() => { setTimeout(() => { isPausedRef.current = false; }, 2000); }}
              style={({ pressed }) => [
                styles.sectionCard,
                {
                  width: CARD_WIDTH,
                  backgroundColor: colors.surface + "DD",
                  borderColor: item.color + (isActive ? "AA" : "44"),
                  shadowColor: item.color,
                  shadowOpacity: isActive ? 0.6 : 0.2,
                  transform: [
                    { scale: pressed ? 0.97 : isActive ? 1.02 : 1 },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={[item.color + "22", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.cardIconWrap}>
                <View style={[styles.cardIconBg, { backgroundColor: item.color + "22" }]}>
                  <IconSymbol name={item.icon as any} size={28} color={item.color} />
                </View>
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.cardDesc, { color: colors.muted }]}>{item.description}</Text>
              <View style={[styles.cardCta, { borderColor: item.color + "66" }]}>
                <Text style={[styles.cardCtaText, { color: item.color }]}>Перейти</Text>
                <IconSymbol name="chevron.right" size={14} color={item.color} />
              </View>
            </Pressable>
          );
        }}
      />
      {/* Dot indicators */}
      <View style={styles.dotsRow}>
        {SECTIONS.map((s, i) => (
          <Pressable
            key={s.id}
            onPress={() => {
              setActiveIndex(i);
              flatListRef.current?.scrollToIndex({ index: i, animated: true });
            }}
            style={[
              styles.dot,
              {
                backgroundColor: i === activeIndex ? colors.primary : colors.border,
                width: i === activeIndex ? 20 : 8,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function StatBadge({ value, label, icon }: { value: string; label: string; icon: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <IconSymbol name={icon as any} size={18} color={colors.primary} />
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

function SectionPreview({
  title,
  description,
  color,
  icon,
  route,
}: {
  title: string;
  description: string;
  color: string;
  icon: string;
  route: string;
}) {
  const colors = useColors();
  return (
    <NeonCard glowColor={color} style={styles.previewCard}>
      <View style={styles.previewHeader}>
        <View style={[styles.previewIconBg, { backgroundColor: color + "22" }]}>
          <IconSymbol name={icon as any} size={22} color={color} />
        </View>
        <Text style={[styles.previewTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      <Text style={[styles.previewDesc, { color: colors.muted }]}>{description}</Text>
      <NeonButton
        label="Подробнее"
        color={color}
        variant="outline"
        size="sm"
        onPress={() => router.push(route as never)}
        style={{ alignSelf: "flex-start", marginTop: 12 }}
      />
    </NeonCard>
  );
}

export default function HomeScreen() {
  const colors = useColors();

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* ── Hero ── */}
        <LinearGradient
          colors={["#0A0B0F", "#0D1020", "#0A0B0F"]}
          style={styles.hero}
        >
          {/* Neon grid lines */}
          <View style={styles.gridOverlay} pointerEvents="none">
            {[...Array(6)].map((_, i) => (
              <View
                key={i}
                style={[styles.gridLine, { top: `${(i + 1) * 14}%` as any, backgroundColor: colors.primary + "18" }]}
              />
            ))}
          </View>

          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <View style={[styles.heroBadgeDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.heroBadgeText, { color: colors.primary }]}>Трейдинговый супер-портал</Text>
            </View>

            <Text style={[styles.heroTitle, { color: colors.foreground }]}>
              R<Text style={{ color: colors.primary }}>Trader</Text>
            </Text>

            <Text style={[styles.heroSubtitle, { color: colors.muted }]}>
              Для тех, кто хочет понимать рынок, расти в трейдинге и принимать осознанные решения
            </Text>

            <View style={styles.heroCtas}>
              <NeonButton
                label="Комьюнити"
                color={colors.primary}
                variant="filled"
                size="md"
                onPress={() => router.push("/community" as never)}
                style={{ flex: 1 }}
              />
              <NeonButton
                label="VIP-клуб"
                color="#FFD700"
                variant="filled"
                size="md"
                onPress={() => router.push("/more" as never)}
                style={{ flex: 1 }}
              />
            </View>
            <NeonButton
              label="Перейти к обучению →"
              color={colors.muted}
              variant="ghost"
              size="sm"
              onPress={() => router.push("/more" as never)}
            />
          </View>
        </LinearGradient>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          {STATS.map((s) => (
            <StatBadge key={s.label} value={s.value} label={s.label} icon={s.icon} />
          ))}
        </View>

        {/* ── Section Carousel ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Разделы портала</Text>
        </View>
        <SectionCarousel />

        {/* ── Section Previews ── */}
        <View style={styles.previewsSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: 20 }]}>
            Что вас ждёт
          </Text>
          <View style={styles.previewsGrid}>
            {SECTIONS.map((s) => (
              <SectionPreview
                key={s.id}
                title={s.title}
                description={s.description}
                color={s.color}
                icon={s.icon}
                route={s.route}
              />
            ))}
          </View>
        </View>

        {/* ── Ecosystem ── */}
        <View style={[styles.ecosystemSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 4 }]}>
            Экосистема RTrader
          </Text>
          <Text style={[styles.ecosystemSubtitle, { color: colors.muted }]}>
            Мы присутствуем на всех ключевых площадках
          </Text>
          <View style={styles.ecosystemLinks}>
            {[
              { name: "Telegram", icon: "paperplane.fill", color: "#2AABEE", url: "https://t.me/" },
              { name: "Dzen", icon: "doc.fill", color: "#FF6900", url: "https://dzen.ru/" },
              { name: "VK", icon: "person.fill", color: "#4C75A3", url: "https://vk.com/" },
              { name: "RuTube", icon: "play.fill", color: "#FF3333", url: "https://rutube.ru/" },
            ].map((link) => (
              <Pressable
                key={link.name}
                onPress={() => Linking.openURL(link.url)}
                style={({ pressed }) => [
                  styles.ecoLink,
                  { backgroundColor: link.color + "22", borderColor: link.color + "55" },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <IconSymbol name={link.icon as any} size={22} color={link.color} />
                <Text style={[styles.ecoLinkText, { color: link.color }]}>{link.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.muted }]}>
            © 2026 RTrader. Материалы носят информационный характер и не являются инвестиционными рекомендациями.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: 24,
    paddingBottom: 32,
    overflow: "hidden",
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
  },
  heroContent: {
    paddingHorizontal: 24,
    gap: 12,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  heroBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: -1,
    lineHeight: 52,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
  },
  heroCtas: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  statBadge: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    textAlign: "center",
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 18,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
    gap: 8,
  },
  cardIconWrap: {
    marginBottom: 4,
  },
  cardIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  cardCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  cardCtaText: {
    fontSize: 13,
    fontWeight: "600",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    marginBottom: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  previewsSection: {
    marginTop: 24,
    gap: 0,
  },
  previewsGrid: {
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 0,
  },
  previewCard: {
    gap: 8,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  previewDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  ecosystemSection: {
    marginTop: 24,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  ecosystemSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  ecosystemLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  ecoLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  ecoLinkText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
});

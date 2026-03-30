import React from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { NeonCard } from "@/components/neon-card";
import { NeonButton } from "@/components/neon-button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const COMMUNITY_COLOR = "#00D4FF";

const CHATS = [
  {
    id: "main",
    name: "Основной чат RTrader",
    description: "Главный чат сообщества — обсуждение рынка, идеи, вопросы",
    members: "2 500+",
    icon: "message.fill",
    url: "https://t.me/",
  },
  {
    id: "signals",
    name: "Торговые сигналы",
    description: "Оперативные торговые идеи и сигналы от опытных трейдеров",
    members: "1 200+",
    icon: "bolt.fill",
    url: "https://t.me/",
  },
  {
    id: "education",
    name: "Обучение и разбор сделок",
    description: "Разбор ошибок, обучающие материалы, ответы на вопросы",
    members: "800+",
    icon: "book.fill",
    url: "https://t.me/",
  },
];

const VALUES = [
  { icon: "shield.fill", title: "Честность", desc: "Без обещаний лёгких денег и гарантий прибыли" },
  { icon: "person.3.fill", title: "Взаимопомощь", desc: "Опытные трейдеры помогают новичкам расти" },
  { icon: "chart.line.uptrend.xyaxis", title: "Практика", desc: "Реальные сделки и живой опыт, а не теория" },
  { icon: "brain.head.profile", title: "Психология", desc: "Работа над дисциплиной и эмоциональным контролем" },
];

export default function CommunityScreen() {
  const colors = useColors();

  const handleJoin = (url: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(url);
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <LinearGradient
          colors={[COMMUNITY_COLOR + "22", "transparent"]}
          style={styles.header}
        >
          <View style={styles.headerIconWrap}>
            <View style={[styles.headerIconBg, { backgroundColor: COMMUNITY_COLOR + "22" }]}>
              <IconSymbol name="person.3.fill" size={36} color={COMMUNITY_COLOR} />
            </View>
          </View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Комьюнити трейдеров</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            Живое сообщество из 2 500+ трейдеров — от новичков до профессионалов. Здесь делятся опытом, обсуждают рынок и растут вместе.
          </Text>
        </LinearGradient>

        {/* Chats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Наши чаты</Text>
          {CHATS.map((chat) => (
            <NeonCard key={chat.id} glowColor={COMMUNITY_COLOR} style={styles.chatCard}>
              <View style={styles.chatHeader}>
                <View style={[styles.chatIconBg, { backgroundColor: COMMUNITY_COLOR + "22" }]}>
                  <IconSymbol name={chat.icon as any} size={22} color={COMMUNITY_COLOR} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.chatName, { color: colors.foreground }]}>{chat.name}</Text>
                  <View style={styles.membersRow}>
                    <IconSymbol name="person.fill" size={12} color={COMMUNITY_COLOR} />
                    <Text style={[styles.membersText, { color: COMMUNITY_COLOR }]}>{chat.members} участников</Text>
                  </View>
                </View>
              </View>
              <Text style={[styles.chatDesc, { color: colors.muted }]}>{chat.description}</Text>
              <NeonButton
                label="Вступить в Telegram"
                color={COMMUNITY_COLOR}
                variant="filled"
                size="sm"
                onPress={() => handleJoin(chat.url)}
                style={{ marginTop: 8 }}
              />
            </NeonCard>
          ))}
        </View>

        {/* Values */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ценности комьюнити</Text>
          <View style={styles.valuesGrid}>
            {VALUES.map((v) => (
              <View
                key={v.title}
                style={[styles.valueCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={[styles.valueIconBg, { backgroundColor: COMMUNITY_COLOR + "22" }]}>
                  <IconSymbol name={v.icon as any} size={20} color={COMMUNITY_COLOR} />
                </View>
                <Text style={[styles.valueTitle, { color: colors.foreground }]}>{v.title}</Text>
                <Text style={[styles.valueDesc, { color: colors.muted }]}>{v.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Rules */}
        <View style={[styles.rulesSection, { backgroundColor: colors.surface, borderColor: COMMUNITY_COLOR + "33" }]}>
          <View style={styles.rulesHeader}>
            <IconSymbol name="shield.fill" size={20} color={COMMUNITY_COLOR} />
            <Text style={[styles.rulesTitle, { color: colors.foreground }]}>Правила сообщества</Text>
          </View>
          {[
            "Уважительное общение с участниками",
            "Запрет на рекламу и спам",
            "Не давать гарантии прибыли и «сигналы 100%»",
            "Делиться реальным опытом, а не выдумками",
            "Помогать новичкам без снисхождения",
          ].map((rule, i) => (
            <View key={i} style={styles.ruleItem}>
              <View style={[styles.ruleDot, { backgroundColor: COMMUNITY_COLOR }]} />
              <Text style={[styles.ruleText, { color: colors.muted }]}>{rule}</Text>
            </View>
          ))}
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
  headerIconWrap: { marginBottom: 4 },
  headerIconBg: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 21,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  chatCard: { gap: 10 },
  chatHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  chatIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chatName: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  membersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  membersText: {
    fontSize: 12,
    fontWeight: "600",
  },
  chatDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  valuesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  valueCard: {
    width: "47%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  valueIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  valueTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  valueDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  rulesSection: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  rulesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  rulesTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  ruleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  ruleText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});

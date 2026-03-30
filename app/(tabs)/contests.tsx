import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { NeonCard } from "@/components/neon-card";
import { NeonButton } from "@/components/neon-button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const CONTESTS_COLOR = "#39FF14";

interface Contest {
  id: string;
  title: string;
  status: "active" | "upcoming" | "finished";
  startDate: string;
  endDate: string;
  participants: number;
  prize: string;
  description: string;
  rules: string[];
}

const CONTESTS: Contest[] = [
  {
    id: "1",
    title: "Весенний турнир 2026",
    status: "active",
    startDate: "1 мар 2026",
    endDate: "31 мар 2026",
    participants: 87,
    prize: "Подписка VIP на 3 месяца",
    description: "Торговля на виртуальном счёте $100 000. Побеждает тот, кто покажет лучший результат за месяц.",
    rules: [
      "Стартовый капитал: $100 000 (виртуальный)",
      "Инструменты: акции MOEX и форекс",
      "Максимальный риск на сделку: 2%",
      "Минимум 10 сделок за турнир",
    ],
  },
  {
    id: "2",
    title: "Турнир по форексу",
    status: "upcoming",
    startDate: "1 апр 2026",
    endDate: "30 апр 2026",
    participants: 0,
    prize: "Денежный приз + VIP",
    description: "Специализированный турнир по валютным парам. Акцент на риск-менеджмент и дисциплину.",
    rules: [
      "Только валютные пары",
      "Стартовый капитал: $50 000 (виртуальный)",
      "Плечо не более 1:10",
      "Дневной лимит потерь: 3%",
    ],
  },
  {
    id: "3",
    title: "Зимний чемпионат 2025",
    status: "finished",
    startDate: "1 дек 2025",
    endDate: "31 дек 2025",
    participants: 124,
    prize: "VIP-подписка",
    description: "Завершённый турнир. Победитель показал доходность +47% на виртуальном счёте.",
    rules: [],
  },
];

const STATUS_CONFIG = {
  active: { label: "Идёт сейчас", color: CONTESTS_COLOR },
  upcoming: { label: "Скоро", color: "#FBBF24" },
  finished: { label: "Завершён", color: "#8B92A5" },
};

const TABS = ["Активные", "Предстоящие", "Завершённые"];

export default function ContestsScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState("Активные");

  const filtered = CONTESTS.filter((c) => {
    if (activeTab === "Активные") return c.status === "active";
    if (activeTab === "Предстоящие") return c.status === "upcoming";
    return c.status === "finished";
  });

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <LinearGradient
          colors={[CONTESTS_COLOR + "18", "transparent"]}
          style={styles.header}
        >
          <View style={[styles.headerIconBg, { backgroundColor: CONTESTS_COLOR + "22" }]}>
            <IconSymbol name="trophy.fill" size={36} color={CONTESTS_COLOR} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Конкурсы и турниры</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            Соревнования на виртуальных счетах — без финансового риска. Тренируй навыки и побеждай.
          </Text>
        </LinearGradient>

        {/* How it works */}
        <View style={[styles.howItWorks, { backgroundColor: colors.surface, borderColor: CONTESTS_COLOR + "33" }]}>
          <Text style={[styles.howTitle, { color: colors.foreground }]}>Как это работает?</Text>
          {[
            { icon: "person.fill", text: "Регистрируешься в турнире через наш Telegram" },
            { icon: "dollarsign.circle.fill", text: "Получаешь виртуальный торговый счёт" },
            { icon: "chart.line.uptrend.xyaxis", text: "Торгуешь в течение периода турнира" },
            { icon: "trophy.fill", text: "Лучшие результаты получают призы" },
          ].map((step, i) => (
            <View key={i} style={styles.howStep}>
              <View style={[styles.howStepNum, { backgroundColor: CONTESTS_COLOR + "22", borderColor: CONTESTS_COLOR + "44" }]}>
                <Text style={[styles.howStepNumText, { color: CONTESTS_COLOR }]}>{i + 1}</Text>
              </View>
              <View style={styles.howStepContent}>
                <IconSymbol name={step.icon as any} size={16} color={CONTESTS_COLOR} />
                <Text style={[styles.howStepText, { color: colors.foreground }]}>{step.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {TABS.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab);
              }}
              style={[
                styles.tab,
                {
                  backgroundColor: activeTab === tab ? CONTESTS_COLOR + "22" : "transparent",
                  borderColor: activeTab === tab ? CONTESTS_COLOR : colors.border,
                },
              ]}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? CONTESTS_COLOR : colors.muted }]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Contest Cards */}
        <View style={styles.section}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="calendar" size={40} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>Нет турниров в этой категории</Text>
            </View>
          ) : (
            filtered.map((contest) => {
              const statusCfg = STATUS_CONFIG[contest.status];
              return (
                <NeonCard key={contest.id} glowColor={statusCfg.color} style={styles.contestCard}>
                  <View style={styles.contestHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.contestTitle, { color: colors.foreground }]}>{contest.title}</Text>
                      <View style={styles.contestDates}>
                        <IconSymbol name="calendar" size={12} color={colors.muted} />
                        <Text style={[styles.contestDateText, { color: colors.muted }]}>
                          {contest.startDate} — {contest.endDate}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + "22", borderColor: statusCfg.color + "66" }]}>
                      <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                    </View>
                  </View>

                  <Text style={[styles.contestDesc, { color: colors.muted }]}>{contest.description}</Text>

                  <View style={styles.contestStats}>
                    <View style={[styles.statBox, { backgroundColor: colors.surfaceHigh ?? colors.surface, borderColor: colors.border }]}>
                      <IconSymbol name="person.3.fill" size={14} color={statusCfg.color} />
                      <Text style={[styles.statBoxValue, { color: colors.foreground }]}>
                        {contest.participants > 0 ? contest.participants : "—"}
                      </Text>
                      <Text style={[styles.statBoxLabel, { color: colors.muted }]}>участников</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: colors.surfaceHigh ?? colors.surface, borderColor: colors.border }]}>
                      <IconSymbol name="trophy.fill" size={14} color="#FFD700" />
                      <Text style={[styles.statBoxValue, { color: colors.foreground }]} numberOfLines={2}>
                        {contest.prize}
                      </Text>
                      <Text style={[styles.statBoxLabel, { color: colors.muted }]}>приз</Text>
                    </View>
                  </View>

                  {contest.rules.length > 0 && (
                    <View style={[styles.rulesBlock, { borderColor: statusCfg.color + "33" }]}>
                      <Text style={[styles.rulesLabel, { color: statusCfg.color }]}>Правила</Text>
                      {contest.rules.map((rule, i) => (
                        <View key={i} style={styles.ruleRow}>
                          <View style={[styles.ruleDot, { backgroundColor: statusCfg.color }]} />
                          <Text style={[styles.ruleText, { color: colors.muted }]}>{rule}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {contest.status !== "finished" && (
                    <NeonButton
                      label={contest.status === "active" ? "Участвовать" : "Записаться"}
                      color={statusCfg.color}
                      variant="filled"
                      size="md"
                    />
                  )}
                </NeonCard>
              );
            })
          )}
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
  howItWorks: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  howTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  howStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  howStepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  howStepNumText: { fontSize: 13, fontWeight: "700" },
  howStepContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  howStepText: { flex: 1, fontSize: 13, lineHeight: 18 },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  tabText: { fontSize: 12, fontWeight: "600" },
  section: {
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 14,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: { fontSize: 14 },
  contestCard: { gap: 14 },
  contestHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  contestTitle: { fontSize: 17, fontWeight: "700", lineHeight: 22 },
  contestDates: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  contestDateText: { fontSize: 12 },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  contestDesc: { fontSize: 13, lineHeight: 19 },
  contestStats: {
    flexDirection: "row",
    gap: 10,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  statBoxValue: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  statBoxLabel: { fontSize: 11, textAlign: "center" },
  rulesBlock: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  rulesLabel: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  ruleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  ruleDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 7,
  },
  ruleText: { flex: 1, fontSize: 13, lineHeight: 18 },
});

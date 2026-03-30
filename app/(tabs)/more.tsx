import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet,
  Linking,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { NeonCard } from "@/components/neon-card";
import { NeonButton } from "@/components/neon-button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

// ─── Data ───────────────────────────────────────────────────────────────────

const VIP_BENEFITS = [
  { icon: "bolt.fill", title: "Эксклюзивные сигналы", desc: "Торговые идеи с детальным разбором до публикации в общем доступе", color: "#FFD700" },
  { icon: "lock.fill", title: "Закрытый чат VIP", desc: "Прямой доступ к автору и топ-трейдерам сообщества", color: "#FFD700" },
  { icon: "waveform", title: "Еженедельные разборы", desc: "Видеоразборы рынка и сделок в закрытом формате", color: "#FFD700" },
  { icon: "shield.fill", title: "Приоритетная поддержка", desc: "Ответы на вопросы в течение 24 часов", color: "#FFD700" },
  { icon: "star.fill", title: "Ранний доступ", desc: "Первыми узнаёте о новых материалах и турнирах", color: "#FFD700" },
];

const REFLECTIONS = [
  {
    id: "r1",
    title: "Почему трейдеры теряют деньги: психологические ловушки",
    date: "27 мар 2026",
    readTime: "7 мин",
    tags: ["психология", "ошибки"],
    preview: "Разбираем 5 главных когнитивных искажений, которые мешают торговать прибыльно.",
  },
  {
    id: "r2",
    title: "Дисциплина vs интуиция: что важнее в трейдинге",
    date: "20 мар 2026",
    readTime: "5 мин",
    tags: ["дисциплина", "система"],
    preview: "Как выработать торговую систему и не отступать от неё под давлением эмоций.",
  },
  {
    id: "r3",
    title: "Торговый журнал: зачем и как вести",
    date: "15 мар 2026",
    readTime: "6 мин",
    tags: ["журнал", "анализ"],
    preview: "Практическое руководство по ведению торгового журнала для роста результатов.",
  },
];

const EDUCATION_CATEGORIES = [
  { id: "basics", title: "Основы трейдинга", icon: "book.fill", color: "#FF8C00", count: 12 },
  { id: "ta", title: "Технический анализ", icon: "chart.bar.fill", color: "#FF8C00", count: 18 },
  { id: "risk", title: "Риск-менеджмент", icon: "shield.fill", color: "#FF8C00", count: 8 },
  { id: "psychology", title: "Психология", icon: "brain.head.profile", color: "#FF8C00", count: 10 },
  { id: "strategies", title: "Торговые стратегии", icon: "chart.line.uptrend.xyaxis", color: "#FF8C00", count: 15 },
  { id: "glossary", title: "Глоссарий", icon: "list.bullet", color: "#FF8C00", count: 50 },
];

const REVIEWS = [
  { id: "1", nick: "Александр К.", status: "Трейдер 3 года", rating: 5, text: "Лучшее сообщество трейдеров, которое я встречал. Реальный опыт, без воды и обещаний лёгких денег." },
  { id: "2", nick: "Мария Т.", status: "Новичок", rating: 5, text: "Начала с нуля, за 6 месяцев освоила основы ТА и риск-менеджмент. Спасибо за терпение и поддержку!" },
  { id: "3", nick: "Дмитрий В.", status: "VIP-участник", rating: 5, text: "VIP-клуб окупился за первый месяц. Сигналы качественные, разборы подробные." },
  { id: "4", nick: "Елена С.", status: "Трейдер 1 год", rating: 4, text: "Отличный контент по психологии трейдинга. Помог справиться с эмоциональными решениями." },
];

const FAQ_ITEMS = [
  { q: "Нужен ли опыт для вступления в комьюнити?", a: "Нет, мы принимаем всех — от новичков до опытных трейдеров. Главное — желание учиться и уважительное общение." },
  { q: "Что такое VIP-клуб и сколько он стоит?", a: "VIP-клуб — это закрытое сообщество с эксклюзивными сигналами и разборами. Стоимость и условия уточняйте в Telegram." },
  { q: "Конкурсы проводятся на реальные деньги?", a: "Нет, все турниры проводятся на виртуальных счетах. Это позволяет тренироваться без финансового риска." },
  { q: "Являются ли материалы инвестиционными рекомендациями?", a: "Нет. Все материалы носят информационный и образовательный характер. Торговые решения вы принимаете самостоятельно." },
  { q: "Как связаться с автором?", a: "Через Telegram-чат сообщества или напрямую — ссылки в разделе Экосистема." },
];

// ─── Sub-screens ─────────────────────────────────────────────────────────────

type Screen = "menu" | "vip" | "reflections" | "education" | "reviews" | "about" | "faq";

function MenuScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const colors = useColors();
  const items = [
    { id: "vip" as Screen, title: "VIP-клуб", desc: "Эксклюзивный контент и сигналы", icon: "crown.fill", color: "#FFD700" },
    { id: "reflections" as Screen, title: "Рефлексии", desc: "Психология и дисциплина трейдера", icon: "brain.head.profile", color: "#FF2D78" },
    { id: "education" as Screen, title: "Обучение", desc: "База знаний и курсы", icon: "book.fill", color: "#FF8C00" },
    { id: "reviews" as Screen, title: "Отзывы", desc: "Что говорят участники", icon: "star.fill", color: "#A855F7" },
    { id: "about" as Screen, title: "Об авторе", desc: "Кто стоит за RTrader", icon: "person.fill", color: "#00D4FF" },
    { id: "faq" as Screen, title: "FAQ и контакты", desc: "Частые вопросы и связь", icon: "questionmark.circle.fill", color: "#8B92A5" },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.menuHeader}>
        <Text style={[styles.menuTitle, { color: colors.foreground }]}>Ещё</Text>
        <Text style={[styles.menuSubtitle, { color: colors.muted }]}>Дополнительные разделы портала</Text>
      </View>
      <View style={styles.menuList}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onNavigate(item.id);
            }}
            style={({ pressed }) => [
              styles.menuItem,
              { backgroundColor: colors.surface, borderColor: item.color + "44" },
              pressed && { opacity: 0.75 },
            ]}
          >
            <View style={[styles.menuItemIcon, { backgroundColor: item.color + "22" }]}>
              <IconSymbol name={item.icon as any} size={24} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.menuItemDesc, { color: colors.muted }]}>{item.desc}</Text>
            </View>
            <IconSymbol name="chevron.right" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function VIPScreen({ onBack }: { onBack: () => void }) {
  const colors = useColors();
  const VIP_COLOR = "#FFD700";
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <LinearGradient colors={[VIP_COLOR + "22", "transparent"]} style={styles.subHeader}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={20} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Назад</Text>
        </Pressable>
        <View style={[styles.subIconBg, { backgroundColor: VIP_COLOR + "22" }]}>
          <IconSymbol name="crown.fill" size={36} color={VIP_COLOR} />
        </View>
        <Text style={[styles.subTitle, { color: colors.foreground }]}>VIP-клуб</Text>
        <Text style={[styles.subSubtitle, { color: colors.muted }]}>
          Закрытое сообщество для серьёзных трейдеров. Эксклюзивный контент, сигналы и прямой доступ к автору.
        </Text>
      </LinearGradient>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Что входит в VIP</Text>
        {VIP_BENEFITS.map((b) => (
          <NeonCard key={b.title} glowColor={VIP_COLOR} style={styles.benefitCard}>
            <View style={styles.benefitRow}>
              <View style={[styles.benefitIcon, { backgroundColor: VIP_COLOR + "22" }]}>
                <IconSymbol name={b.icon as any} size={22} color={VIP_COLOR} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.benefitTitle, { color: colors.foreground }]}>{b.title}</Text>
                <Text style={[styles.benefitDesc, { color: colors.muted }]}>{b.desc}</Text>
              </View>
            </View>
          </NeonCard>
        ))}
        <NeonButton
          label="Узнать условия и вступить"
          color={VIP_COLOR}
          variant="filled"
          size="lg"
          onPress={() => Linking.openURL("https://t.me/")}
          style={{ marginTop: 8 }}
        />
        <Text style={[styles.vipNote, { color: colors.muted }]}>
          Переход в веб-приложение VIP-клуба через Telegram
        </Text>
      </View>
    </ScrollView>
  );
}

function ReflectionsScreen({ onBack }: { onBack: () => void }) {
  const colors = useColors();
  const COLOR = "#FF2D78";
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <LinearGradient colors={[COLOR + "22", "transparent"]} style={styles.subHeader}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={20} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Назад</Text>
        </Pressable>
        <View style={[styles.subIconBg, { backgroundColor: COLOR + "22" }]}>
          <IconSymbol name="brain.head.profile" size={36} color={COLOR} />
        </View>
        <Text style={[styles.subTitle, { color: colors.foreground }]}>Рефлексии трейдера</Text>
        <Text style={[styles.subSubtitle, { color: colors.muted }]}>
          Психология, дисциплина и осознанность — то, что отличает стабильного трейдера от азартного игрока.
        </Text>
      </LinearGradient>
      <View style={styles.section}>
        {REFLECTIONS.map((article) => (
          <NeonCard key={article.id} glowColor={COLOR} style={styles.articleCard}>
            <View style={styles.articleMeta}>
              <Text style={[styles.articleDate, { color: colors.muted }]}>{article.date}</Text>
              <Text style={[styles.articleRead, { color: COLOR }]}>· {article.readTime}</Text>
            </View>
            <Text style={[styles.articleTitle, { color: colors.foreground }]}>{article.title}</Text>
            <Text style={[styles.articlePreview, { color: colors.muted }]}>{article.preview}</Text>
            <View style={styles.tagRow}>
              {article.tags.map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: COLOR + "18", borderColor: COLOR + "44" }]}>
                  <Text style={[styles.tagText, { color: COLOR }]}>#{tag}</Text>
                </View>
              ))}
            </View>
          </NeonCard>
        ))}
      </View>
    </ScrollView>
  );
}

function EducationScreen({ onBack }: { onBack: () => void }) {
  const colors = useColors();
  const COLOR = "#FF8C00";
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <LinearGradient colors={[COLOR + "22", "transparent"]} style={styles.subHeader}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={20} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Назад</Text>
        </Pressable>
        <View style={[styles.subIconBg, { backgroundColor: COLOR + "22" }]}>
          <IconSymbol name="book.fill" size={36} color={COLOR} />
        </View>
        <Text style={[styles.subTitle, { color: colors.foreground }]}>Обучение</Text>
        <Text style={[styles.subSubtitle, { color: colors.muted }]}>
          База знаний и курсы для трейдеров. Обучение — один из модулей портала, не главный акцент.
        </Text>
      </LinearGradient>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Категории</Text>
        <View style={styles.eduGrid}>
          {EDUCATION_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              style={({ pressed }) => [
                styles.eduCard,
                { backgroundColor: colors.surface, borderColor: COLOR + "44" },
                pressed && { opacity: 0.75 },
              ]}
            >
              <View style={[styles.eduIconBg, { backgroundColor: COLOR + "22" }]}>
                <IconSymbol name={cat.icon as any} size={24} color={COLOR} />
              </View>
              <Text style={[styles.eduTitle, { color: colors.foreground }]}>{cat.title}</Text>
              <Text style={[styles.eduCount, { color: COLOR }]}>{cat.count} материалов</Text>
            </Pressable>
          ))}
        </View>
        <NeonCard glowColor={COLOR} style={styles.eduNote}>
          <View style={styles.eduNoteRow}>
            <IconSymbol name="info.circle.fill" size={18} color={COLOR} />
            <Text style={[styles.eduNoteTitle, { color: colors.foreground }]}>Подход к обучению</Text>
          </View>
          <Text style={[styles.eduNoteText, { color: colors.muted }]}>
            RTrader — не образовательная платформа в первую очередь. Обучение здесь — практическое, через реальный опыт и разбор сделок, а не академические курсы.
          </Text>
        </NeonCard>
      </View>
    </ScrollView>
  );
}

function ReviewsScreen({ onBack }: { onBack: () => void }) {
  const colors = useColors();
  const COLOR = "#A855F7";
  const [activeTab, setActiveTab] = useState<"text" | "screenshots">("text");

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <LinearGradient colors={[COLOR + "22", "transparent"]} style={styles.subHeader}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={20} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Назад</Text>
        </Pressable>
        <View style={[styles.subIconBg, { backgroundColor: COLOR + "22" }]}>
          <IconSymbol name="star.fill" size={36} color={COLOR} />
        </View>
        <Text style={[styles.subTitle, { color: colors.foreground }]}>Отзывы</Text>
        <Text style={[styles.subSubtitle, { color: colors.muted }]}>
          Что говорят участники сообщества RTrader
        </Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.reviewTabsRow}>
        {(["text", "screenshots"] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.reviewTab,
              {
                backgroundColor: activeTab === tab ? COLOR + "22" : "transparent",
                borderColor: activeTab === tab ? COLOR : colors.border,
              },
            ]}
          >
            <Text style={[styles.reviewTabText, { color: activeTab === tab ? COLOR : colors.muted }]}>
              {tab === "text" ? "Текстовые" : "Скриншоты"}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === "text" ? (
        <View style={styles.section}>
          {REVIEWS.map((review) => (
            <NeonCard key={review.id} glowColor={COLOR} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={[styles.reviewAvatar, { backgroundColor: COLOR + "22", borderColor: COLOR + "44" }]}>
                  <Text style={[styles.reviewAvatarText, { color: COLOR }]}>
                    {review.nick[0]}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reviewNick, { color: colors.foreground }]}>{review.nick}</Text>
                  <Text style={[styles.reviewStatus, { color: colors.muted }]}>{review.status}</Text>
                </View>
                <View style={styles.starsRow}>
                  {[...Array(review.rating)].map((_, i) => (
                    <IconSymbol key={i} name="star.fill" size={14} color="#FFD700" />
                  ))}
                </View>
              </View>
              <Text style={[styles.reviewText, { color: colors.foreground }]}>{review.text}</Text>
            </NeonCard>
          ))}
        </View>
      ) : (
        <View style={styles.screenshotsPlaceholder}>
          <View style={[styles.screenshotPlaceholderBox, { backgroundColor: colors.surface, borderColor: COLOR + "44" }]}>
            <IconSymbol name="photo.fill" size={40} color={COLOR} />
            <Text style={[styles.screenshotPlaceholderText, { color: colors.muted }]}>
              Скриншоты отзывов из Telegram
            </Text>
            <Text style={[styles.screenshotPlaceholderSub, { color: colors.muted }]}>
              Галерея будет доступна после добавления контента
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function AboutScreen({ onBack }: { onBack: () => void }) {
  const colors = useColors();
  const COLOR = "#00D4FF";
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <LinearGradient colors={[COLOR + "22", "transparent"]} style={styles.subHeader}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={20} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Назад</Text>
        </Pressable>
        <View style={[styles.aboutAvatar, { backgroundColor: COLOR + "22", borderColor: COLOR + "44" }]}>
          <Text style={[styles.aboutAvatarText, { color: COLOR }]}>R</Text>
        </View>
        <Text style={[styles.subTitle, { color: colors.foreground }]}>Об авторе</Text>
        <Text style={[styles.subSubtitle, { color: colors.muted }]}>
          Основатель и идеолог RTrader — практикующий трейдер с 7-летним опытом на российском рынке.
        </Text>
      </LinearGradient>

      <View style={styles.section}>
        <View style={styles.factsGrid}>
          {[
            { icon: "clock.fill", label: "7 лет", desc: "на рынке" },
            { icon: "person.3.fill", label: "2 500+", desc: "в сообществе" },
            { icon: "chart.bar.fill", label: "MOEX", desc: "специализация" },
            { icon: "book.fill", label: "100+", desc: "материалов" },
          ].map((fact) => (
            <View key={fact.label} style={[styles.factCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name={fact.icon as any} size={22} color={COLOR} />
              <Text style={[styles.factValue, { color: colors.foreground }]}>{fact.label}</Text>
              <Text style={[styles.factDesc, { color: colors.muted }]}>{fact.desc}</Text>
            </View>
          ))}
        </View>

        <NeonCard glowColor={COLOR} style={styles.bioCard}>
          <Text style={[styles.bioTitle, { color: colors.foreground }]}>О проекте</Text>
          <Text style={[styles.bioText, { color: colors.muted }]}>
            RTrader создан как альтернатива «инфобизнесу» в трейдинге. Без обещаний лёгких денег, без гарантий прибыли — только реальный опыт, честная аналитика и живое сообщество.
          </Text>
          <Text style={[styles.bioText, { color: colors.muted, marginTop: 8 }]}>
            Специализация: акции Московской биржи, технический анализ, риск-менеджмент и психология трейдинга.
          </Text>
        </NeonCard>

        <View style={[styles.ecoSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.ecoTitle, { color: colors.foreground }]}>Экосистема RTrader</Text>
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
                styles.ecoRow,
                { borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={[styles.ecoIconBg, { backgroundColor: link.color + "22" }]}>
                <IconSymbol name={link.icon as any} size={20} color={link.color} />
              </View>
              <Text style={[styles.ecoName, { color: colors.foreground }]}>{link.name}</Text>
              <IconSymbol name="arrow.up.right" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function FAQScreen({ onBack }: { onBack: () => void }) {
  const colors = useColors();
  const COLOR = "#8B92A5";
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <LinearGradient colors={[COLOR + "22", "transparent"]} style={styles.subHeader}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={20} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Назад</Text>
        </Pressable>
        <View style={[styles.subIconBg, { backgroundColor: COLOR + "22" }]}>
          <IconSymbol name="questionmark.circle.fill" size={36} color={COLOR} />
        </View>
        <Text style={[styles.subTitle, { color: colors.foreground }]}>FAQ</Text>
        <Text style={[styles.subSubtitle, { color: colors.muted }]}>Частые вопросы и ответы</Text>
      </LinearGradient>

      <View style={styles.section}>
        {FAQ_ITEMS.map((item, i) => (
          <Pressable
            key={i}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setExpanded(expanded === i ? null : i);
            }}
            style={[
              styles.faqItem,
              {
                backgroundColor: colors.surface,
                borderColor: expanded === i ? colors.primary + "66" : colors.border,
              },
            ]}
          >
            <View style={styles.faqHeader}>
              <Text style={[styles.faqQuestion, { color: colors.foreground }]}>{item.q}</Text>
              <IconSymbol
                name={expanded === i ? "minus.circle.fill" : "plus.circle.fill"}
                size={20}
                color={expanded === i ? colors.primary : colors.muted}
              />
            </View>
            {expanded === i && (
              <Text style={[styles.faqAnswer, { color: colors.muted }]}>{item.a}</Text>
            )}
          </Pressable>
        ))}

        {/* Contacts */}
        <NeonCard glowColor={colors.primary} style={styles.contactsCard}>
          <View style={styles.contactsHeader}>
            <IconSymbol name="message.fill" size={20} color={colors.primary} />
            <Text style={[styles.contactsTitle, { color: colors.foreground }]}>Связаться с нами</Text>
          </View>
          <Text style={[styles.contactsText, { color: colors.muted }]}>
            Если не нашли ответ на свой вопрос — напишите нам в Telegram.
          </Text>
          <NeonButton
            label="Написать в Telegram"
            color={colors.primary}
            variant="filled"
            size="md"
            onPress={() => Linking.openURL("https://t.me/")}
            style={{ marginTop: 8 }}
          />
        </NeonCard>

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { borderColor: colors.border }]}>
          <IconSymbol name="info.circle.fill" size={16} color={colors.muted} />
          <Text style={[styles.disclaimerText, { color: colors.muted }]}>
            © 2026 RTrader. Материалы носят информационный характер и не являются инвестиционными рекомендациями.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function MoreScreen() {
  const [screen, setScreen] = useState<Screen>("menu");

  const renderScreen = () => {
    switch (screen) {
      case "vip": return <VIPScreen onBack={() => setScreen("menu")} />;
      case "reflections": return <ReflectionsScreen onBack={() => setScreen("menu")} />;
      case "education": return <EducationScreen onBack={() => setScreen("menu")} />;
      case "reviews": return <ReviewsScreen onBack={() => setScreen("menu")} />;
      case "about": return <AboutScreen onBack={() => setScreen("menu")} />;
      case "faq": return <FAQScreen onBack={() => setScreen("menu")} />;
      default: return <MenuScreen onNavigate={setScreen} />;
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      {renderScreen()}
    </ScreenContainer>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  menuHeader: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    gap: 4,
  },
  menuTitle: { fontSize: 32, fontWeight: "800" },
  menuSubtitle: { fontSize: 14 },
  menuList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  menuItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemTitle: { fontSize: 16, fontWeight: "700" },
  menuItemDesc: { fontSize: 13, marginTop: 2 },
  subHeader: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  backText: { fontSize: 15, fontWeight: "600" },
  subIconBg: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  subTitle: { fontSize: 28, fontWeight: "800" },
  subSubtitle: { fontSize: 14, lineHeight: 21 },
  section: {
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  benefitCard: { gap: 0 },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTitle: { fontSize: 15, fontWeight: "700" },
  benefitDesc: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  vipNote: { fontSize: 12, textAlign: "center", marginTop: 4 },
  articleCard: { gap: 8 },
  articleMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  articleDate: { fontSize: 12 },
  articleRead: { fontSize: 12, fontWeight: "600" },
  articleTitle: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  articlePreview: { fontSize: 13, lineHeight: 19 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: { fontSize: 11, fontWeight: "600" },
  eduGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  eduCard: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    alignItems: "flex-start",
  },
  eduIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  eduTitle: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
  eduCount: { fontSize: 12 },
  eduNote: { gap: 8 },
  eduNoteRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eduNoteTitle: { fontSize: 15, fontWeight: "700" },
  eduNoteText: { fontSize: 13, lineHeight: 19 },
  reviewTabsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 10,
  },
  reviewTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  reviewTabText: { fontSize: 14, fontWeight: "600" },
  reviewCard: { gap: 10 },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reviewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAvatarText: { fontSize: 18, fontWeight: "800" },
  reviewNick: { fontSize: 15, fontWeight: "700" },
  reviewStatus: { fontSize: 12, marginTop: 2 },
  starsRow: { flexDirection: "row", gap: 2 },
  reviewText: { fontSize: 13, lineHeight: 19 },
  screenshotsPlaceholder: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  screenshotPlaceholderBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  screenshotPlaceholderText: { fontSize: 15, fontWeight: "600", textAlign: "center" },
  screenshotPlaceholderSub: { fontSize: 13, textAlign: "center" },
  aboutAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  aboutAvatarText: { fontSize: 36, fontWeight: "900" },
  factsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  factCard: {
    width: "47%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  factValue: { fontSize: 20, fontWeight: "800" },
  factDesc: { fontSize: 12 },
  bioCard: { gap: 8 },
  bioTitle: { fontSize: 16, fontWeight: "700" },
  bioText: { fontSize: 13, lineHeight: 19 },
  ecoSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  ecoTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  ecoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  ecoIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  ecoName: { flex: 1, fontSize: 15, fontWeight: "600" },
  faqItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  faqAnswer: { fontSize: 13, lineHeight: 19 },
  contactsCard: { gap: 8 },
  contactsHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  contactsTitle: { fontSize: 16, fontWeight: "700" },
  contactsText: { fontSize: 13, lineHeight: 19 },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    marginTop: 8,
  },
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 17 },
});

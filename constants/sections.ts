export interface Section {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  route: string;
}

export const SECTIONS: Section[] = [
  {
    id: "community",
    title: "Комьюнити",
    description: "Сообщество трейдеров, чаты и взаимная поддержка",
    icon: "person.3.fill",
    color: "#00D4FF",
    route: "/(tabs)/community",
  },
  {
    id: "analytics",
    title: "Аналитика",
    description: "Торговые идеи и обзоры рынка от практикующих трейдеров",
    icon: "chart.bar.fill",
    color: "#A855F7",
    route: "/(tabs)/analytics",
  },
  {
    id: "reflections",
    title: "Рефлексии",
    description: "Психология трейдинга, дисциплина и осознанность",
    icon: "brain.head.profile",
    color: "#FF2D78",
    route: "/(tabs)/more",
  },
  {
    id: "contests",
    title: "Конкурсы",
    description: "Турниры на виртуальных счетах без финансового риска",
    icon: "trophy.fill",
    color: "#39FF14",
    route: "/(tabs)/contests",
  },
  {
    id: "vip",
    title: "VIP-клуб",
    description: "Эксклюзивные сигналы, закрытые чаты и премиум-контент",
    icon: "crown.fill",
    color: "#FFD700",
    route: "/(tabs)/more",
  },
  {
    id: "education",
    title: "Обучение",
    description: "База знаний, курсы и материалы для роста в трейдинге",
    icon: "book.fill",
    color: "#FF8C00",
    route: "/(tabs)/more",
  },
];

export const STATS = [
  { value: "2 500+", label: "трейдеров", icon: "person.3.fill" },
  { value: "7 лет", label: "на рынке", icon: "clock.fill" },
  { value: "6", label: "разделов", icon: "grid" },
];

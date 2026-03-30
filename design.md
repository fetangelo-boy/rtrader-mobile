# RTrader Mobile — Design Plan

## Brand Identity

**App Name:** RTrader  
**Tagline:** Трейдинговый супер-портал  
**Visual Style:** Dark retro-wave / cyberpunk neon — тёмный фон, неоновые акценты cyan/violet/pink, glassmorphism-карточки  
**Orientation:** Portrait (9:16), one-handed usage

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#0A0B0F` | Основной фон экранов |
| `surface` | `#111318` | Поверхности карточек |
| `foreground` | `#E8EAED` | Основной текст |
| `muted` | `#8B92A5` | Второстепенный текст |
| `primary` | `#00D4FF` | Cyan — основной акцент |
| `accent` | `#A855F7` | Violet — вторичный акцент |
| `neonPink` | `#FF2D78` | Pink — третичный акцент |
| `neonGreen` | `#39FF14` | Зелёный для успеха/роста |
| `border` | `#1E2435` | Границы |
| `success` | `#39FF14` | Успех |
| `warning` | `#FBBF24` | Предупреждение |
| `error` | `#FF2D78` | Ошибка |

### Section Neon Colors (for cards/glow)
- Комьюнити: cyan `#00D4FF`
- Аналитика: violet `#A855F7`
- Рефлексии: pink `#FF2D78`
- Конкурсы: green `#39FF14`
- VIP-клуб: gold `#FFD700`
- Обучение: orange `#FF8C00`

---

## Screen List

1. **Home** (Главная) — Hero, статистика, карусель разделов, превью блоков
2. **Community** (Комьюнити) — Чаты, поддержка, ссылки на группы
3. **Analytics** (Аналитика) — Торговые идеи, обзоры рынка
4. **Reflections** (Рефлексии) — Психология трейдинга, дисциплина
5. **Contests** (Конкурсы) — Турниры на демо/виртуале
6. **VIP** (VIP-клуб) — Преимущества, внешняя ссылка
7. **Education** (Обучение) — База знаний, курсы
8. **Reviews** (Отзывы) — Текстовые отзывы + галерея скринов
9. **About** (Об авторе) — Профиль, факты
10. **FAQ** — Частые вопросы + контакты

---

## Primary Content and Functionality

### Home Screen
- **Hero block**: Заголовок "RTrader — трейдинговый супер-портал", подзаголовок, 3 CTA-кнопки (Комьюнити, VIP, Обучение), фоновый неоновый градиент с силуэтом Москвы
- **Stats row**: 2500+ трейдеров, 7 лет на рынке, 6 разделов
- **Section Carousel**: Горизонтальный слайдер с 6 glassmorphism-карточками разделов, автопрокрутка
- **Section Previews**: Компактные блоки для каждого раздела с CTA

### Community Screen
- Описание сообщества трейдеров
- Карточки чатов (Telegram-группы)
- Правила и ценности комьюнити
- CTA для вступления

### Analytics Screen
- Список торговых идей (карточки с тикером, направлением, датой)
- Фильтры по инструментам
- Превью обзоров рынка

### Reflections Screen
- Список статей по психологии трейдинга
- Карточки с заголовком, превью, датой
- Теги: дисциплина, психология, риск-менеджмент

### Contests Screen
- Активные и прошедшие турниры
- Карточка турнира: название, даты, участники, призы
- Правила виртуальной торговли

### VIP Screen
- Список преимуществ VIP-клуба
- Карточки с иконками и описаниями
- CTA-кнопка (внешняя ссылка на веб-приложение)

### Education Screen
- Категории обучения (карточки)
- Список материалов/курсов
- База знаний с поиском

### Reviews Screen
- Текстовые отзывы (карточки: ник, статус, текст, рейтинг)
- Галерея скринов из Telegram
- Вкладки: Текстовые / Скриншоты

### About Screen
- Аватар/фото автора
- Ник и краткое bio
- 3-4 ключевых факта
- Экосистема RTrader (Telegram, Dzen, VK, RuTube)

### FAQ Screen
- Аккордеон с вопросами и ответами
- Блок контактов
- Дисклеймер

---

## Key User Flows

### Flow 1: Знакомство с порталом
Home → Hero CTA "К комьюнити" → Community Screen → вступление в чат

### Flow 2: VIP-клуб
Home → Hero CTA "Войти в VIP" → VIP Screen → внешняя ссылка в браузере

### Flow 3: Изучение аналитики
Home → Carousel → Analytics Card → Analytics Screen → торговая идея

### Flow 4: Участие в конкурсе
Home → Contests Preview → Contests Screen → карточка турнира → правила

### Flow 5: Чтение рефлексий
Home → Reflections Preview → Reflections Screen → статья

---

## Navigation Architecture

**Bottom Tab Bar** (5 вкладок):
1. 🏠 Главная (Home)
2. 📊 Аналитика (Analytics)
3. 👥 Комьюнити (Community)
4. 🏆 Конкурсы (Contests)
5. ☰ Ещё (More) → VIP, Обучение, Отзывы, Об авторе, FAQ

**Stack Navigation** внутри каждой вкладки для детальных экранов.

---

## Component Library

- **NeonCard**: Glassmorphism-карточка с неоновой рамкой и glow-эффектом
- **SectionCarousel**: Горизонтальный слайдер с автопрокруткой
- **StatBadge**: Плитка статистики с иконкой и числом
- **HeroSection**: Полноэкранный hero с градиентным фоном
- **SectionPreview**: Компактный блок раздела с CTA
- **TabBarIcon**: Иконка с неоновым активным состоянием
- **ReviewCard**: Карточка отзыва
- **AccordionItem**: Элемент FAQ

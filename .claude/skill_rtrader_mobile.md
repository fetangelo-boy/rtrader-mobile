# Skill: rTrader Mobile MVP Development

## 📚 Обзор проекта

**rTrader Mobile** - React Native приложение на Expo для трейдинга с чатами, аутентификацией и загрузкой медиа-файлов.

**Stack**: TypeScript, React Native, Expo SDK 54, Supabase, tRPC, NativeWind/Tailwind

---

## 🎯 Ключевые паттерны

### 1. Photo Upload в чаты (Supabase Storage)

**Файл**: `app/chat/[id].tsx`

#### Шаг 1: State и импорты
```typescript
import * as ImagePicker from "expo-image-picker";
import { v4 as uuidv4 } from "uuid";

const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
const [uploadingImage, setUploadingImage] = useState(false);
```

#### Шаг 2: Выбор изображения
```typescript
const handlePickImage = async () => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0]);
    }
  } catch (error) {
    console.error("Error picking image:", error);
    Alert.alert("Ошибка", "Не удалось выбрать изображение");
  }
};
```

#### Шаг 3: Загрузка в Supabase Storage
```typescript
const uploadImageToSupabase = async (asset: ImagePicker.ImagePickerAsset): Promise<string | null> => {
  try {
    setUploadingImage(true);
    
    // Генерируем уникальное имя файла
    const fileExt = asset.uri.split('.').pop() || 'jpg';
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `chats/${chatId}/${fileName}`;
    
    // Получаем blob из URI
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    
    // Загружаем в bucket 'receipts'
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });
    
    if (uploadError) throw uploadError;
    
    // Получаем публичный URL
    const { data: publicData } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath);
    
    return publicData.publicUrl;
  } catch (error) {
    console.error("Error uploading image:", error);
    Alert.alert("Ошибка", "Не удалось загрузить изображение");
    return null;
  } finally {
    setUploadingImage(false);
  }
};
```

#### Шаг 4: Интеграция с sendMessage
```typescript
const handleSendMessage = async () => {
  if (selectedImage) {
    const mediaUrl = await uploadImageToSupabase(selectedImage);
    if (!mediaUrl) return;
    
    sendMessageMutation.mutate({
      chatId: String(chatId),
      content: newMessage.trim() || "📷 фото",
      replyToId: replyingTo?.id ? String(replyingTo.id) : undefined,
      mediaUrl: mediaUrl,
      mediaType: "image",
    });
    
    setSelectedImage(null);
  } else {
    sendMessageMutation.mutate({
      chatId: String(chatId),
      content: newMessage.trim(),
      replyToId: replyingTo?.id ? String(replyingTo.id) : undefined,
    });
  }
};
```

#### Шаг 5: UI компоненты

**Кнопка выбора фото в input bar:**
```typescript
<Pressable
  onPress={handlePickImage}
  disabled={uploadingImage || sendMessageMutation.isPending}
  style={({ pressed }) => [
    {
      opacity: uploadingImage || sendMessageMutation.isPending ? 0.3 : pressed ? 0.7 : 1,
      padding: 8,
    },
  ]}
>
  <Text className="text-xl">
    {uploadingImage ? "⏳" : "📷"}
  </Text>
</Pressable>
```

**Preview выбранного фото:**
```typescript
{selectedImage && (
  <View className="px-4 py-2 border-b flex-row items-center justify-between">
    <View className="flex-1 flex-row items-center gap-2">
      <Image
        source={{ uri: selectedImage.uri }}
        style={{ width: 40, height: 40, borderRadius: 4 }}
        resizeMode="cover"
      />
      <View className="flex-1">
        <Text className="text-xs text-muted">Выбранное фото</Text>
        <Text className="text-sm text-foreground" numberOfLines={1}>
          {selectedImage.fileName || "Изображение"}
        </Text>
      </View>
    </View>
    <Pressable onPress={() => setSelectedImage(null)}>
      <Text className="text-lg text-foreground">✕</Text>
    </Pressable>
  </View>
)}
```

### 2. Аутентификация (Email + Telegram OAuth)

**Файлы**: `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`

- Email/пароль с bcryptjs
- Telegram OAuth через deep linking
- Автозагрузка при открытии ссылки в Telegram
- Сохранение сессии в AsyncStorage (мобиль) и localStorage (веб)

### 3. Realtime чаты с Supabase

**Файлы**: `app/chat/[id].tsx`, `app/chats.tsx`

- Supabase Realtime subscriptions на таблицу messages
- Real-time обновления при новых сообщениях других пользователей
- Поддержка reply-to сообщений
- Пагинация старых сообщений

---

## 🐛 Решение проблем

### Проблема: Git push блокирован (403 Permission denied)

**Причина**: Локальный прокси блокирует write доступ

**Решения по приоритету:**
1. **GitHub Token** (Рекомендуется)
   ```bash
   git config --global user.email "your-email@example.com"
   git config credential.helper store
   git push -u origin branch-name
   # При запросе пароля вводим GitHub Personal Token
   ```

2. **Patch файлы** (Fallback)
   ```bash
   git format-patch origin/main -o patches/
   # Отправляем patch файлы манально через GUI GitHub
   ```

3. **GitHub CLI**
   ```bash
   gh auth login
   gh pr create --title "..." --body "..."
   ```

### Проблема: TypeScript ошибки

```bash
npm run check
# или
tsc --noEmit
```

Исправляем типы перед коммитом!

---

## 📦 Зависимости для загрузки фото

```json
{
  "expo-image-picker": "~17.0.10",
  "uuid": "^14.0.0",
  "@supabase/supabase-js": "^2.103.3"
}
```

---

## ✅ Чеклист для добавления новой фичи

- [ ] Создать ветку: `git checkout -b feature/описание`
- [ ] Реализовать фичу
- [ ] Запустить `npm run check` (TypeScript)
- [ ] Запустить `npm run lint` (ESLint)
- [ ] Протестировать локально: `npm run dev`
- [ ] Закоммитить: `git commit -m "feat: описание"`
- [ ] Запушить: `git push -u origin feature/описание`
- [ ] Создать PR на GitHub
- [ ] Merge после review

---

## 🔗 Полезные ссылки

- **Supabase Docs**: https://supabase.com/docs
- **Expo Docs**: https://docs.expo.dev
- **React Native**: https://reactnative.dev
- **Telegram Bot API**: https://core.telegram.org/bots
- **tRPC**: https://trpc.io

---

## 📝 Последний обновл: 2026-05-10

Добавлена фича загрузки фото в чаты с полной интеграцией в UI и Supabase Storage.

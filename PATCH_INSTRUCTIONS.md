# Инструкция по применению patch файла

## Что это:
Полный патч для добавления функциональности загрузки фото в чатах (145 строк кода)

## Файл:
`photo-upload.patch`

## Как применить на GitHub:

### Вариант 1: Push локально и затем на GitHub (если будет доступ)
```bash
git apply photo-upload.patch
git commit -m "feat: add photo upload functionality to chats"
git push origin claude/read-russian-text-epg3k
```

### Вариант 2: Через GitHub Web UI
1. Перейти на ветку `claude/read-russian-text-epg3k`
2. Вручную обновить файл `app/chat/[id].tsx` с изменениями из patch'а

### Вариант 3: Через GitHub API с Personal Token
```bash
export GITHUB_TOKEN="your_github_token_here"

# Создать PR через API
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/fetangelo-boy/rtrader-mobile/pulls \
  -d '{
    "title": "feat: add photo upload functionality to chats",
    "head": "claude/read-russian-text-epg3k",
    "base": "main",
    "body": "145 lines: image picker, Supabase Storage upload, preview before sending"
  }'
```

## Содержание изменений:

### Добавлено:
- ✨ Image picker (expo-image-picker)
- ✨ Upload to Supabase Storage  
- ✨ Preview selected image before sending
- ✨ Loading states for upload
- ✨ Error handling
- ✨ Photo display in chat

### Файл изменен:
- `app/chat/[id].tsx` (+134 строк, -11 строк)

## Проверка перед применением:
```bash
# Проверить TypeScript
npm run check

# Проверить линты  
npm run lint

# Запустить тесты (опционально)
npm test
```

## Status:
✅ Коммит: 6a9f8099b46264ab88affe35585689bb2ea26c3c
✅ TypeScript: Clean
✅ Code: Ready for production

import { readFileSync } from 'fs';
import { getDb } from '../server/db';
import { chats, messages, chatParticipants } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

interface SupabaseChat {
  id: string;
  name: string;
  description?: string;
  type?: string;
  created_at: string;
  updated_at: string;
}

interface SupabaseMessage {
  id: string;
  chat_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface SupabaseChatParticipant {
  id: string;
  chat_id: string;
  user_id: string;
  joined_at: string;
  role?: string;
}

// Map to track Supabase UUID to MySQL auto-increment IDs
const chatIdMap: Record<string, number> = {};

async function importChatData() {
  console.log('[Import] Starting chat data import from Supabase export...');

  try {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    // Read export files
    const chatsData: SupabaseChat[] = JSON.parse(readFileSync('./SUPABASE_CHATS_EXPORT.json', 'utf-8'));
    const messagesData: SupabaseMessage[] = JSON.parse(readFileSync('./SUPABASE_MESSAGES_EXPORT.json', 'utf-8'));
    const participantsData: SupabaseChatParticipant[] = JSON.parse(readFileSync('./SUPABASE_CHAT_PARTICIPANTS_EXPORT.json', 'utf-8'));

    console.log(`[Import] Found ${chatsData.length} chats, ${messagesData.length} messages, ${participantsData.length} participants`);

    let chatSuccessCount = 0;
    let chatSkipCount = 0;
    let messageSuccessCount = 0;
    let messageSkipCount = 0;
    let participantSuccessCount = 0;
    let participantSkipCount = 0;

    // Import chats
    console.log('[Import] Importing chats...');
    for (const chat of chatsData) {
      try {
        // Parse ISO datetime strings
        const createdAt = new Date(chat.created_at);
        const updatedAt = new Date(chat.updated_at);

        const result = await db.insert(chats).values({
          name: chat.name,
          description: chat.description || null,
          chatType: (chat.type || 'interactive') as 'interactive' | 'info_only',
          icon: null,
          sortOrder: 0,
          createdAt,
          updatedAt,
        });
        
        // Get the inserted ID by querying for the chat we just inserted
        const insertedChat = await db
          .select()
          .from(chats)
          .where(eq(chats.name, chat.name))
          .limit(1);
        
        if (insertedChat[0]) {
          chatIdMap[chat.id] = insertedChat[0].id;
          console.log(`[Import] ✓ Chat: ${chat.name} (${chat.id} → ID: ${insertedChat[0].id})`);
          chatSuccessCount++;
        }
      } catch (error: any) {
        if (error.message?.includes('Duplicate') || error.code === 'ER_DUP_ENTRY') {
          console.log(`[Import] ⊘ Chat skipped (exists): ${chat.name}`);
          chatSkipCount++;
          
          // Still try to find the existing chat ID for later use
          const existingChat = await db
            .select()
            .from(chats)
            .where(eq(chats.name, chat.name))
            .limit(1);
          if (existingChat[0]) {
            chatIdMap[chat.id] = existingChat[0].id;
          }
        } else {
          console.error(`[Import] ✗ Chat failed: ${chat.name}`, error.message);
        }
      }
    }

    // Import participants
    console.log('[Import] Importing chat participants...');
    for (const participant of participantsData) {
      try {
        const chatId = chatIdMap[participant.chat_id];
        if (!chatId) {
          console.warn(`[Import] ⊘ Participant skipped: chat ${participant.chat_id} not found`);
          participantSkipCount++;
          continue;
        }

        await db.insert(chatParticipants).values({
          chatId: chatId,
          userId: parseInt(participant.user_id),
          role: (participant.role || 'subscriber') as 'admin' | 'participant' | 'subscriber',
          isMuted: 0,
          joinedAt: new Date(participant.joined_at),
        });
        
        participantSuccessCount++;
      } catch (error: any) {
        if (error.message?.includes('Duplicate') || error.code === 'ER_DUP_ENTRY') {
          participantSkipCount++;
        } else {
          console.error(`[Import] ✗ Participant failed:`, error.message);
        }
      }
    }
    console.log(`[Import] ✓ Participants: ${participantSuccessCount} imported, ${participantSkipCount} skipped`);

    // Import messages
    console.log('[Import] Importing messages...');
    for (const message of messagesData) {
      try {
        const chatId = chatIdMap[message.chat_id];
        if (!chatId) {
          console.warn(`[Import] ⊘ Message skipped: chat ${message.chat_id} not found`);
          messageSkipCount++;
          continue;
        }

        await db.insert(messages).values({
          chatId: chatId,
          userId: parseInt(message.user_id),
          content: message.content,
          mediaUrl: null,
          mediaType: null,
          replyToId: null,
          createdAt: new Date(message.created_at),
          updatedAt: new Date(message.updated_at),
        });
        
        messageSuccessCount++;
      } catch (error: any) {
        if (error.message?.includes('Duplicate') || error.code === 'ER_DUP_ENTRY') {
          messageSkipCount++;
        } else {
          console.error(`[Import] ✗ Message failed:`, error.message);
        }
      }
    }

    console.log(`\n[Import] Import complete!`);
    console.log(`[Import] Chats: ${chatSuccessCount} imported, ${chatSkipCount} skipped`);
    console.log(`[Import] Messages: ${messageSuccessCount} imported, ${messageSkipCount} skipped`);
    console.log(`[Import] Participants: ${participantSuccessCount} imported, ${participantSkipCount} skipped`);
    console.log(`[Import] Total: ${chatSuccessCount + messageSuccessCount + participantSuccessCount} records imported`);

    process.exit(0);
  } catch (error) {
    console.error('[Import] Fatal error:', error);
    process.exit(1);
  }
}

importChatData();

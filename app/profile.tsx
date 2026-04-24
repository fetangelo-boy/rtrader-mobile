import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { updatePassword } from "@/lib/supabase-auth";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Convert a local file URI to base64 string */
async function uriToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // strip "data:image/jpeg;base64," prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Get mime type from URI */
function getMimeType(uri: string): string {
  if (uri.endsWith(".png")) return "image/png";
  return "image/jpeg";
}

// ─── Avatar component ────────────────────────────────────────────────────────

function AvatarCircle({
  uri,
  size = 96,
  initials,
  colors,
}: {
  uri?: string | null;
  size?: number;
  initials: string;
  colors: ReturnType<typeof useColors>;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    );
  }
  return (
    <View
      style={[
        styles.avatarPlaceholder,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary,
        },
      ]}
    >
      <Text style={[styles.avatarInitials, { fontSize: size * 0.36 }]}>
        {initials}
      </Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Change Password state ────────────────────────────────────────────────
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ── tRPC queries & mutations ──────────────────────────────────────────────
  const utils = trpc.useUtils();

  const {
    data: profile,
    isLoading,
    error,
  } = trpc.profile.getProfile.useQuery();

  // Sync username input when profile loads
  useEffect(() => {
    if (profile && !isEditing) {
      setUsernameInput(profile.username ?? "");
    }
  }, [profile?.username]);

  const updateProfileMutation = trpc.profile.updateProfile.useMutation({
    onSuccess: () => {
      utils.profile.getProfile.invalidate();
    },
  });

  const uploadAvatarMutation = trpc.profile.uploadAvatar.useMutation({
    onSuccess: () => {
      utils.profile.getProfile.invalidate();
    },
  });

  // ── Derived values ────────────────────────────────────────────────────────
  const displayName = profile?.username || profile?.email?.split("@")[0] || "Пользователь";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const avatarUri = localAvatarUri || profile?.avatar_url;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePickAvatar = useCallback(async () => {
    if (!isEditing) return;

    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Нет доступа", "Разрешите доступ к галерее в настройках устройства.");
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLocalAvatarUri(result.assets[0].uri);
    }
  }, [isEditing]);

  const handleStartEdit = useCallback(() => {
    setUsernameInput(profile?.username ?? "");
    setLocalAvatarUri(null);
    setIsEditing(true);
  }, [profile]);

  const handleCancelEdit = useCallback(() => {
    setUsernameInput(profile?.username ?? "");
    setLocalAvatarUri(null);
    setIsEditing(false);
  }, [profile]);

  const handleSave = useCallback(async () => {
    setSavingProfile(true);
    try {
      // Upload avatar first if changed
      if (localAvatarUri) {
        setUploadingAvatar(true);
        const base64 = await uriToBase64(localAvatarUri);
        const mimeType = getMimeType(localAvatarUri);
        await uploadAvatarMutation.mutateAsync({ base64, mimeType });
        setLocalAvatarUri(null);
        setUploadingAvatar(false);
      }

      // Update username
      const trimmed = usernameInput.trim();
      if (trimmed !== (profile?.username ?? "")) {
        await updateProfileMutation.mutateAsync({ username: trimmed || undefined });
      }

      setIsEditing(false);
    } catch (err: any) {
      Alert.alert("Ошибка", err?.message || "Не удалось сохранить профиль");
    } finally {
      setUploadingAvatar(false);
      setSavingProfile(false);
    }
  }, [localAvatarUri, usernameInput, profile, uploadAvatarMutation, updateProfileMutation]);

  // ── Change Password handler ───────────────────────────────────────────────
  const handleChangePassword = useCallback(async () => {
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (trimmedNew.length < 6) {
      Alert.alert("Ошибка", "Пароль должен содержать минимум 6 символов.");
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      Alert.alert("Ошибка", "Пароли не совпадают.");
      return;
    }

    setChangingPassword(true);
    try {
      await updatePassword(trimmedNew);
      Alert.alert("Готово", "Пароль успешно изменён.");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err: any) {
      const msg = err?.message || "Не удалось сменить пароль";
      Alert.alert("Ошибка", msg);
    } finally {
      setChangingPassword(false);
    }
  }, [newPassword, confirmPassword]);

  const handleCancelPasswordChange = useCallback(() => {
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordForm(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            Загрузка профиля...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer className="p-4">
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            Не удалось загрузить профиль
          </Text>
          <Pressable
            onPress={() => utils.profile.getProfile.invalidate()}
            style={({ pressed }) => [
              styles.retryBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Повторить</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.backBtnText, { color: colors.primary }]}>← Назад</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Профиль</Text>
        {isEditing ? (
          <Pressable
            onPress={handleCancelEdit}
            style={({ pressed }) => [styles.headerAction, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.headerActionText, { color: colors.muted }]}>Отмена</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleStartEdit}
            style={({ pressed }) => [styles.headerAction, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.headerActionText, { color: colors.primary }]}>Изменить</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Avatar section ── */}
        <View style={styles.avatarSection}>
          <Pressable
            onPress={handlePickAvatar}
            style={({ pressed }) => [
              styles.avatarWrapper,
              isEditing && { opacity: pressed ? 0.7 : 1 },
            ]}
            disabled={!isEditing}
          >
            <AvatarCircle
              uri={avatarUri}
              size={100}
              initials={initials}
              colors={colors}
            />
            {isEditing && (
              <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarEditIcon}>✎</Text>
              </View>
            )}
          </Pressable>
          {uploadingAvatar && (
            <Text style={[styles.uploadingText, { color: colors.muted }]}>
              Загрузка фото...
            </Text>
          )}
        </View>

        {/* ── Fields ── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Username */}
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Имя пользователя</Text>
            {isEditing ? (
              <TextInput
                value={usernameInput}
                onChangeText={setUsernameInput}
                placeholder="Введите имя"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
                style={[
                  styles.fieldInput,
                  {
                    color: colors.foreground,
                    borderColor: colors.primary,
                    backgroundColor: colors.background,
                  },
                ]}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={64}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: colors.foreground }]}>
                {profile?.username || "—"}
              </Text>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Email (read-only) */}
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Email</Text>
            <Text style={[styles.fieldValue, { color: colors.foreground }]}>
              {profile?.email || "—"}
            </Text>
          </View>
        </View>

        {/* Email note */}
        <Text style={[styles.emailNote, { color: colors.muted }]}>
          Для изменения email обратитесь в службу поддержки.
        </Text>

        {/* ── Save button ── */}
        {isEditing && (
          <Pressable
            onPress={handleSave}
            disabled={savingProfile}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: savingProfile ? colors.muted : colors.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            {savingProfile ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Сохранить</Text>
            )}
          </Pressable>
        )}

        {/* ── Change Password section ── */}
        {!isEditing && (
          <View style={styles.passwordSection}>
            {!showPasswordForm ? (
              <Pressable
                onPress={() => setShowPasswordForm(true)}
                style={({ pressed }) => [
                  styles.changePasswordBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.changePasswordBtnText, { color: colors.foreground }]}>
                  🔑  Сменить пароль
                </Text>
              </Pressable>
            ) : (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.fieldRow}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>Новый пароль</Text>
                  <View style={styles.passwordInputRow}>
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Минимум 6 символов"
                      placeholderTextColor={colors.muted}
                      secureTextEntry={!showNewPassword}
                      returnKeyType="next"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={[
                        styles.fieldInput,
                        styles.passwordInput,
                        {
                          color: colors.foreground,
                          borderColor: colors.primary,
                          backgroundColor: colors.background,
                        },
                      ]}
                    />
                    <Pressable
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={({ pressed }) => [
                        styles.eyeBtn,
                        { opacity: pressed ? 0.5 : 1 },
                      ]}
                    >
                      <Text style={{ fontSize: 18 }}>{showNewPassword ? "🙈" : "👁"}</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.fieldRow}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>Подтвердите пароль</Text>
                  <View style={styles.passwordInputRow}>
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Повторите пароль"
                      placeholderTextColor={colors.muted}
                      secureTextEntry={!showConfirmPassword}
                      returnKeyType="done"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={[
                        styles.fieldInput,
                        styles.passwordInput,
                        {
                          color: colors.foreground,
                          borderColor: colors.primary,
                          backgroundColor: colors.background,
                        },
                      ]}
                    />
                    <Pressable
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={({ pressed }) => [
                        styles.eyeBtn,
                        { opacity: pressed ? 0.5 : 1 },
                      ]}
                    >
                      <Text style={{ fontSize: 18 }}>{showConfirmPassword ? "🙈" : "👁"}</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Password match indicator */}
                {confirmPassword.length > 0 && (
                  <View style={styles.matchIndicator}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: newPassword === confirmPassword ? colors.success : colors.error,
                      }}
                    >
                      {newPassword === confirmPassword ? "✓ Пароли совпадают" : "✗ Пароли не совпадают"}
                    </Text>
                  </View>
                )}

                {/* Buttons */}
                <View style={styles.passwordActions}>
                  <Pressable
                    onPress={handleCancelPasswordChange}
                    style={({ pressed }) => [
                      styles.passwordCancelBtn,
                      {
                        borderColor: colors.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.passwordCancelText, { color: colors.muted }]}>Отмена</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleChangePassword}
                    disabled={changingPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                    style={({ pressed }) => [
                      styles.passwordSaveBtn,
                      {
                        backgroundColor:
                          changingPassword || newPassword.length < 6 || newPassword !== confirmPassword
                            ? colors.muted
                            : colors.primary,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    {changingPassword ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.passwordSaveText}>Сменить</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  errorText: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  backBtn: {
    minWidth: 70,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: "500",
  },
  headerAction: {
    minWidth: 70,
    alignItems: "flex-end",
  },
  headerActionText: {
    fontSize: 15,
    fontWeight: "500",
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: "#fff",
    fontWeight: "700",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditIcon: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  uploadingText: {
    fontSize: 12,
    marginTop: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  fieldRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: "400",
  },
  fieldInput: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  emailNote: {
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  saveBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // ── Change Password styles ──
  passwordSection: {
    marginTop: 8,
  },
  changePasswordBtn: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  changePasswordBtnText: {
    fontSize: 15,
    fontWeight: "500",
  },
  passwordInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  passwordInput: {
    flex: 1,
  },
  eyeBtn: {
    padding: 8,
    marginTop: 4,
  },
  matchIndicator: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  passwordActions: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    paddingTop: 8,
  },
  passwordCancelBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  passwordCancelText: {
    fontSize: 15,
    fontWeight: "500",
  },
  passwordSaveBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  passwordSaveText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});

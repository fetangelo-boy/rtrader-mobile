import { useState } from "react";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import * as SupabaseAuth from "@/lib/supabase-auth";
import { useColors } from "@/hooks/use-colors";

const TELEGRAM_BOT_URL = "https://t.me/rtrader_mobapp_bot";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      Alert.alert("Ошибка", "Пожалуйста, заполните все поля");
      return;
    }

    try {
      setLoading(true);
      const result = await SupabaseAuth.signInWithEmail(email, password);
      console.log("[Login] Sign in successful:", result.user?.email);
      router.replace("/(tabs)/chats");
    } catch (error: any) {
      console.error("[Login] Error:", error);
      let msg = error.message || "Не удалось войти в аккаунт";
      if (msg.includes("Invalid login")) msg = "Неверный email или пароль.";
      Alert.alert("Ошибка входа", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGetAccess = () => {
    window.open(TELEGRAM_BOT_URL, "_blank");
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: colors.background,
      padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        {/* Logo / Title */}
        <div style={{ marginBottom: "32px", textAlign: "center" }}>
          <h1 style={{
            fontSize: "36px",
            fontWeight: "bold",
            color: colors.primary,
            margin: "0 0 8px 0",
          }}>RTrader</h1>
          <p style={{
            fontSize: "14px",
            color: colors.muted,
            margin: 0,
          }}>Трейдинговый супер-портал</p>
        </div>

        <form onSubmit={handleLogin as any}>
          {/* Email Input */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{
              fontSize: "14px",
              fontWeight: "600",
              color: colors.foreground,
              display: "block",
              marginBottom: "8px",
            }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.surface,
                color: colors.foreground,
                fontSize: "14px",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Password Input */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{
              fontSize: "14px",
              fontWeight: "600",
              color: colors.foreground,
              display: "block",
              marginBottom: "8px",
            }}>Пароль</label>
            <div style={{
              display: "flex",
              alignItems: "center",
              borderRadius: "8px",
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
            }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  border: "none",
                  backgroundColor: "transparent",
                  color: colors.foreground,
                  fontSize: "14px",
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  padding: "12px 16px",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              marginBottom: "24px",
              backgroundColor: colors.primary,
              color: colors.background,
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              fontFamily: "inherit",
            }}
          >
            {loading ? "Загрузка..." : "Войти"}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "24px",
        }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: colors.border }} />
          <span style={{ padding: "0 12px", fontSize: "12px", color: colors.muted }}>
            нет аккаунта?
          </span>
          <div style={{ flex: 1, height: "1px", backgroundColor: colors.border }} />
        </div>

        {/* Get Access via Telegram Bot */}
        <button
          type="button"
          onClick={handleGetAccess}
          style={{
            width: "100%",
            padding: "14px",
            backgroundColor: "#0088cc",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontSize: "15px",
            fontWeight: "600",
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "18px" }}>✈️</span>
          Получить доступ через Telegram
        </button>

        {/* Help text */}
        <p style={{
          fontSize: "12px",
          color: colors.muted,
          textAlign: "center",
          marginTop: "16px",
          lineHeight: "18px",
          padding: "0 16px",
        }}>
          Для получения доступа оплатите подписку через нашего Telegram-бота.
          После проверки оплаты вам будут отправлены логин и пароль.
        </p>
      </div>
    </div>
  );
}

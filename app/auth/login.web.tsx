import { useState } from "react";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import * as SupabaseAuth from "@/lib/supabase-auth";
import { useColors } from "@/hooks/use-colors";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    console.log("[Login] Button clicked!");
    
    if (!email.trim() || !password.trim()) {
      Alert.alert("Ошибка", "Пожалуйста, заполните все поля");
      return;
    }

    try {
      setLoading(true);
      console.log("[Login] Attempting to sign in with:", email);
      const result = await SupabaseAuth.signInWithEmail(email, password);
      console.log("[Login] Sign in successful:", result.user?.email);
      router.replace("/(tabs)/chats");
    } catch (error: any) {
      console.error("[Login] Error:", error);
      Alert.alert("Ошибка входа", error.message || "Не удалось войти в аккаунт");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    router.push("signup" as any);
  };

  const handleForgotPassword = () => {
    router.push("forgot-password" as any);
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
      <div style={{
        width: "100%",
        maxWidth: "400px",
      }}>
        {/* Logo / Title */}
        <div style={{
          marginBottom: "32px",
          textAlign: "center",
        }}>
          <h1 style={{
            fontSize: "36px",
            fontWeight: "bold",
            color: colors.primary,
            marginBottom: "8px",
            margin: 0,
          }}>RTrader</h1>
          <p style={{
            fontSize: "14px",
            color: colors.muted,
            margin: 0,
          }}>Трейдинговый супер-портал</p>
        </div>

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
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            marginBottom: "12px",
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

        {/* Forgot Password Link */}
        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={loading}
          style={{
            width: "100%",
            marginBottom: "24px",
            backgroundColor: "transparent",
            color: colors.primary,
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            fontFamily: "inherit",
          }}
        >
          Забыли пароль?
        </button>

        {/* Divider */}
        <div style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "24px",
        }}>
          <div style={{
            flex: 1,
            height: "1px",
            backgroundColor: colors.border,
          }} />
          <span style={{
            padding: "0 12px",
            fontSize: "12px",
            color: colors.muted,
          }}>или</span>
          <div style={{
            flex: 1,
            height: "1px",
            backgroundColor: colors.border,
          }} />
        </div>

        {/* Sign Up Link */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "4px",
        }}>
          <span style={{
            fontSize: "14px",
            color: colors.muted,
          }}>Нет аккаунта?</span>
          <button
            type="button"
            onClick={handleSignUp}
            disabled={loading}
            style={{
              backgroundColor: "transparent",
              color: colors.primary,
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              fontFamily: "inherit",
            }}
          >
            Зарегистрироваться
          </button>
        </div>
      </div>
    </div>
  );
}

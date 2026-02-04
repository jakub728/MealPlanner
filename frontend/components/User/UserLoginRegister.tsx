import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { api } from "../../api/client";
import { useAuthStore } from "../../store/useAuthStore";
import Colors from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import logoWhite from "../../assets/images/onion-meal-planner.png";
import logoBlack from "../../assets/images/onion-meal-planner-icon.png";

export default function UserLoginRegisterComponent() {
  const [authMode, setAuthMode] = useState<"login" | "register" | "reset">(
    "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);

  const setAuth = useAuthStore((state) => state.setAuth);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const isDark = colorScheme === "dark";

  // 1. Login
  const handleAuth = async () => {
    try {
      setLoading(true);
      if (authMode === "login") {
        const response = await api.post("/auth/login", { email, password });
        await setAuth(response.data.token, response.data.user);
      } else if (authMode === "register") {
        if (password !== confirmPassword) {
          Alert.alert("Błąd", "Hasła nie są identyczne!");
          return;
        }
        await api.post("/auth/register", { name, email, password });
        Alert.alert("Sukces", "Sprawdź maila, aby zweryfikować konto!");
        setAuthMode("login");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Coś poszło nie tak";
      Alert.alert("Błąd", message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Reset hasła
  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Błąd", "Wpisz adres e-mail, na który mamy wysłać link.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/forgot-password", { email });
      Alert.alert("Link wysłany", response.data.message);
      setAuthMode("login");
    } catch (error: any) {
      const message = error.response?.data?.message || "Błąd wysyłania";
      Alert.alert("Błąd", message);
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (authMode === "login") return "Zaloguj";
    if (authMode === "register") return "Zarejestruj";
    return "Wyślij link do resetu";
  };

  const handleMainAction = () => {
    if (authMode === "reset") handleForgotPassword();
    else handleAuth();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <View style={styles.container}>
        {colorScheme === "light" ? (
          <Image source={logoBlack} style={styles.logo} resizeMode="contain" />
        ) : (
          <Image source={logoWhite} style={styles.logo} resizeMode="contain" />
        )}

        <Text style={[styles.title, { color: theme.text }]}>
          {authMode === "login" && "Zaloguj się"}
          {authMode === "register" && "Stwórz konto"}
          {authMode === "reset" && "Resetuj hasło"}
        </Text>

        {/* Pole Imię tylko przy rejestracji */}
        {authMode === "register" && (
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Imię"
            placeholderTextColor={theme.text}
            value={name}
            onChangeText={setName}
          />
        )}

        {/* Pole Email zawsze widoczne */}
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Email"
          placeholderTextColor={theme.text}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(text) => setEmail(text.toLowerCase())}
        />

        {/* Pole Hasło ukryte przy resecie */}
        {authMode !== "reset" && (
          <View style={[styles.passwordContainer, { borderColor: theme.tint }]}>
            <TextInput
              style={[styles.passwordInput, { color: theme.text }]}
              placeholder="Hasło"
              placeholderTextColor="#888"
              secureTextEntry={secureText}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setSecureText(!secureText)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={secureText ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Pole ConfirmPassword ukryte przy resecie i login */}
        {authMode === "register" && (
          <View style={[styles.passwordContainer, { borderColor: theme.tint }]}>
            <TextInput
              style={[styles.passwordInput, { color: theme.text }]}
              placeholder="Powtórz hasło"
              placeholderTextColor="#888"
              secureTextEntry={secureText}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              onPress={() => setSecureText(!secureText)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={secureText ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Główny przycisk akcji */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleMainAction}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{getButtonText()}</Text>
          )}
        </TouchableOpacity>

        {/* Nawigacja między trybami */}
        <View style={{ marginTop: 20 }}>
          {authMode === "reset" ? (
            <TouchableOpacity onPress={() => setAuthMode("login")}>
              <Text style={{ color: theme.text, textAlign: "center" }}>
                Wróć do logowania
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                onPress={() =>
                  setAuthMode(authMode === "login" ? "register" : "login")
                }
              >
                <Text style={{ color: theme.text, textAlign: "center" }}>
                  {authMode === "login"
                    ? "Nie masz konta? Zarejestruj się"
                    : "Masz już konto? Zaloguj się"}
                </Text>
              </TouchableOpacity>

              {authMode === "login" && (
                <TouchableOpacity
                  onPress={() => setAuthMode("reset")}
                  style={{ marginTop: 15 }}
                >
                  <Text
                    style={{
                      color: "#FF6347",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    Zapomniałeś hasła?
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, justifyContent: "center" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  logo: {
    width: 120, // Dostosuj szerokość do własnych potrzeb
    height: 120, // Dostosuj wysokość
    alignSelf: "center",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#FF6347",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
  switchText: { marginTop: 20, color: "blue", textAlign: "center" },
  forgotButton: { marginTop: 15 },
  forgotText: { textAlign: "center", fontWeight: "500", fontSize: 14 },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
  },
  eyeIcon: {
    paddingHorizontal: 12,
  },
});

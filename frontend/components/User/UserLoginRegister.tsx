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
} from "react-native";
import { api } from "../../api/client";
import { useAuthStore } from "../../store/useAuthStore";

export default function UserLoginRegisterComponent() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const setAuth = useAuthStore((state) => state.setAuth);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const theme = {
    bg: isDark ? "#121212" : "#fff",
    text: isDark ? "#fff" : "#333",
    subText: isDark ? "#aaa" : "#666",
    placeholder: isDark ? "#888" : "#aaa",
    iconBg: isDark ? "rgba(255, 99, 71, 0.15)" : "#FFF5F3",
  };

  const handleAuth = async () => {
    try {
      if (isLogin) {
        const response = await api.post("/auth/login", { email, password });
        await setAuth(response.data.token, response.data.user);
      } else {
        await api.post("/auth/register", { name, email, password });
        Alert.alert("Sukces", "Sprawdź maila, aby zweryfikować konto!");
        setIsLogin(true);
      }
    } catch (error: any) {
      console.log("BŁĄD:", error);
      const message = error.response?.data?.message || "Coś poszło nie tak";
      Alert.alert("Błąd", message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.text }]}>
          {isLogin ? "Zaloguj się" : "Stwórz konto"}
        </Text>

        {!isLogin && (
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.bg, color: theme.text },
            ]}
            placeholder="Imię"
            placeholderTextColor={theme.placeholder}
            value={name}
            onChangeText={setName}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
        )}

        <TextInput
          ref={emailRef}
          style={[
            styles.input,
            { backgroundColor: theme.bg, color: theme.text },
          ]}
          placeholder="Email"
          placeholderTextColor={theme.placeholder}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(text) => setEmail(text.toLowerCase())}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <TextInput
          ref={passwordRef}
          style={[
            styles.input,
            { backgroundColor: theme.bg, color: theme.text },
          ]}
          placeholder="Hasło"
          placeholderTextColor={theme.placeholder}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          returnKeyType="go" // Zmienia ikonę na "Idź/Zaloguj"
          onSubmitEditing={handleAuth}
        />

        <TouchableOpacity style={styles.button} onPress={handleAuth}>
          <Text style={styles.buttonText}>
            {isLogin ? "Zaloguj" : "Zarejestruj"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.switchText}>
            {isLogin
              ? "Nie masz konta? Zarejestruj się"
              : "Masz już konto? Zaloguj się"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.switchText}>
            {isLogin && "Zapomniałeś hasła? Zresetuj"}
          </Text>
        </TouchableOpacity>
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
});

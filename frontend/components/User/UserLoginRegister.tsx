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
import Colors from "../../constants/Colors";

export default function UserLoginRegisterComponent() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const setAuth = useAuthStore((state) => state.setAuth);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const isDark = colorScheme === "dark";

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
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.text }]}>
          {isLogin ? "Zaloguj się" : "Stwórz konto"}
        </Text>

        {!isLogin && (
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.background, color: theme.text },
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
            { backgroundColor: theme.background, color: theme.text },
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
            { backgroundColor: theme.background, color: theme.text },
          ]}
          placeholder="Hasło"
          placeholderTextColor={theme.placeholder}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          returnKeyType="go"
          onSubmitEditing={handleAuth}
        />

        <TouchableOpacity style={styles.button} onPress={handleAuth}>
          <Text style={styles.buttonText}>
            {isLogin ? "Zaloguj" : "Zarejestruj"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={[styles.switchText, { color: theme.text }]}>
            {isLogin
              ? "Nie masz konta? Zarejestruj się"
              : "Masz już konto? Zaloguj się"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={[styles.switchText, { color: theme.text }]}>
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

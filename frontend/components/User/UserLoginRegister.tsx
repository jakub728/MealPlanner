import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { api } from "../../api/client";
import { useAuthStore } from "../../store/useAuthStore";

export default function UserLoginRegisterComponent() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const setAuth = useAuthStore((state) => state.setAuth);

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
    <View style={styles.container}>
      <Text style={styles.title}>
        {isLogin ? "Zaloguj się" : "Stwórz konto"}
      </Text>

      {!isLogin && (
        <TextInput
          style={styles.input}
          placeholder="Imię"
          value={name}
          onChangeText={setName}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={(text) => setEmail(text.toLowerCase())}
      />

      <TextInput
        style={styles.input}
        placeholder="Hasło"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
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
    </View>
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

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons"; // Dostępne w standardzie Expo

export default function LoginFirst({ placeholder }: { placeholder?: string }) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const theme = {
    bg: isDark ? "#121212" : "#fff",
    text: isDark ? "#fff" : "#333",
    subText: isDark ? "#aaa" : "#666",
    iconBg: isDark ? "rgba(255, 99, 71, 0.15)" : "#FFF5F3", // Delikatne tło dla ikony
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.iconContainer, { backgroundColor: theme.iconBg }]}>
        <Ionicons name="lock-closed-outline" size={80} color="#FF6347" />
      </View>

      <Text style={[styles.description, { color: theme.subText }]}>
        Musisz być zalogowany{placeholder}
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/(tabs)/myProfile")}
      >
        <Text style={styles.buttonText}>Przejdź do logowania</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push("/")}
      >
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  iconContainer: {
    marginBottom: 20,
    padding: 30,
    borderRadius: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  button: {
    backgroundColor: "#FF6347",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    shadowColor: "#FF6347",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  secondaryButton: {
    marginTop: 20,
    padding: 10,
  },
  secondaryButtonText: {
    color: "#888",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});

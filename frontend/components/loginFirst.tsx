import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { useThemeStore } from "@/store/useThemeStore";

export default function LoginFirst({ placeholder }: { placeholder?: string }) {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const isDark = colorScheme === "dark";
  const { primaryColor } = useThemeStore();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: isDark ? "rgba(255, 99, 71, 0.1)" : "#FFF5F3" },
        ]}
      >
        <Ionicons
          name="lock-closed-outline"
          style={{ borderRadius: 50 }}
          size={80}
          color={primaryColor}
        />
      </View>

      <Text style={[styles.description, { color: theme.text }]}>
        Zaloguj się{placeholder}
      </Text>

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: primaryColor, shadowColor: primaryColor },
        ]}
        onPress={() => router.push("/(tabs)/myProfile")}
      >
        <Text style={styles.buttonText}>Przejdź do logowania</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push("/")}
      ></TouchableOpacity>
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
  description: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
    fontWeight: "500",
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
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
    fontSize: 14,
    textDecorationLine: "underline",
  },
});

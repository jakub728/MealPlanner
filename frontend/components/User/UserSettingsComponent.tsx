import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "@/store/useThemeStore";
import Colors from "@/constants/Colors";
import { useAuthStore } from "@/store/useAuthStore";

interface UserSettingsProps {
  onBack: () => void;
}

const UserSettingsComponent: React.FC<UserSettingsProps> = ({ onBack }) => {
  const { primaryColor, setPrimaryColor } = useThemeStore();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { logout } = useAuthStore();

  const colorPalette = [
    { name: "Yellow", color: "#ffee00" },
    { name: "Orange", color: "#ff6600" },
    { name: "Red", color: "#ff0000" },
    { name: "Pink", color: "#ff399c" },
    { name: "Lightpurple", color: "#cc00ff" },
    { name: "Purple", color: "#741874" },
    { name: "Blue", color: "#00ffdd" },
    { name: "Royal", color: "#003ffd" },
    { name: "Green", color: "#07e907" },
    { name: "Darkgreen", color: "#1b6e1b" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Ustawienia</Text>

        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionLabel, { color: theme.text }]}>
            Kolor motywu
          </Text>
          <View style={styles.colorGrid}>
            {colorPalette.map((item) => (
              <TouchableOpacity
                key={item.color}
                style={[styles.colorCircle, { backgroundColor: item.color }]}
                onPress={() => setPrimaryColor(item.color)}
              >
                {primaryColor === item.color && (
                  <Ionicons name="checkmark" size={24} color="white" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: primaryColor }]}
          onPress={onBack}
        >
          <Text style={styles.saveButtonText}>Wróć do profilu</Text>
        </TouchableOpacity>
      </View>

      {/* Przycisk wyloguj na dole */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.logoutItem,
            { backgroundColor: theme.card, borderColor: primaryColor },
          ]}
          onPress={logout}
        >
          <Ionicons name="log-out-outline" size={22} color={primaryColor} />
          <Text style={[styles.logoutText, { color: primaryColor }]}>
            Wyloguj się z konta
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "left",
    marginBottom: 25,
  },
  section: {
    padding: 20,
    borderRadius: 25,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 20,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  colorCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  saveButton: {
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    paddingBottom: 40,
  },
  logoutItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  logoutText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "700",
  },
});

export default UserSettingsComponent;

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface UserSettingsProps {
  onBack: () => void;
}

const UserSettingsComponent: React.FC<UserSettingsProps> = ({ onBack }) => {
  // Stan lokalny dla koloru (docelowo powinien być w globalnym store, np. Zustand)
  const [mainColor, setMainColor] = useState("#FF6347");

  // Lista dostępnych kolorów głównych
  const colorPalette = [
    { name: "Tomato", color: "#FF6347" },
    { name: "Ocean", color: "#2E8BC0" },
    { name: "Forest", color: "#228B22" },
    { name: "Royal", color: "#4169E1" },
    { name: "Purple", color: "#800080" },
    { name: "Pink", color: "#FF69B4" },
    { name: "Orange", color: "#FF8C00" },
  ];

  return (
    <View style={styles.container}>
      {/* Przycisk powrotu */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color={mainColor} />
        <Text style={[styles.backText, { color: mainColor }]}>
          Wróć do profilu
        </Text>
      </TouchableOpacity>

      <Text style={styles.title}>Ustawienia Konta</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Kolor główny aplikacji</Text>

        {/* Kontener na paletę kolorów */}
        <View style={styles.colorGrid}>
          {colorPalette.map((item) => (
            <TouchableOpacity
              key={item.color}
              style={[
                styles.colorCircle,
                { backgroundColor: item.color },
                // Akcent wokół wybranego koloru
                mainColor === item.color && {
                  borderWidth: 3,
                  borderColor: "#00000033",
                },
              ]}
              onPress={() => setMainColor(item.color)}
            >
              {mainColor === item.color && (
                <Ionicons name="checkmark" size={20} color="white" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.previewText, { color: mainColor }]}>
          Tak będzie wyglądać Twój kolor przewodniczy
        </Text>
      </View>

      {/* Przykładowy przycisk z wybranym kolorem */}
      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: mainColor }]}
      >
        <Text style={styles.saveButtonText}>Zapisz ustawienia</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#fff",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
  },
  section: {
    marginTop: 10,
    padding: 15,
    backgroundColor: "#f8f8f8",
    borderRadius: 15,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 15,
  },
  colorCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  previewText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
  },
  saveButton: {
    marginTop: 40,
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default UserSettingsComponent;

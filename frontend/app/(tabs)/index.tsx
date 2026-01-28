import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  eachDayOfInterval,
} from "date-fns";
import { pl } from "date-fns/locale"; // Polski format
import { useAuthStore } from "@/store/useAuthStore";
import LoginFirst from "@/components/loginFirst";
import { useColorScheme } from "@/components/useColorScheme";

export default function PlannerScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { token } = useAuthStore((state) => state);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Dynamiczne kolory
  const theme = {
    bg: isDark ? "#121212" : "#fff",
    text: isDark ? "#fff" : "#333",
    cardBg: isDark ? "#1e1e1e" : "#F8F9FA",
    border: isDark ? "#333" : "#eee",
    contentBg: isDark ? "#1e1e1e" : "#F8F9FA",
    subText: isDark ? "#aaa" : "#888",
  };

  // 1. Obliczamy początek tygodnia (Poniedziałek)
  const startOfSelectedWeek = startOfWeek(new Date(), { weekStartsOn: 1 });

  // 2. Generujemy tablicę 7 dni tygodnia
  const weekDays = eachDayOfInterval({
    start: startOfSelectedWeek,
    end: addDays(startOfSelectedWeek, 6),
  });

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.bg }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          Planer posiłków
        </Text>
        <Text style={[styles.monthName, { color: theme.subText }]}>
          {format(selectedDate, "LLLL yyyy", { locale: pl })}
        </Text>
      </View>

      <View style={styles.calendarContainer}>
        {weekDays.map((day, index) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCard,
                { backgroundColor: theme.cardBg, borderColor: theme.border },
                isSelected && styles.selectedDayCard,
                isToday && !isSelected && styles.todayCard,
              ]}
              onPress={() => setSelectedDate(day)}
            >
              <Text
                style={[
                  styles.dayName,
                  isSelected ? styles.selectedText : { color: theme.subText },
                ]}
              >
                {format(day, "eee", { locale: pl })}
              </Text>
              <Text
                style={[
                  styles.dayNum,
                  isSelected ? styles.selectedText : { color: theme.text },
                ]}
              >
                {format(day, "d")}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!token ? (
        <LoginFirst placeholder=" aby dodać posiłek" />
      ) : (
        <ScrollView
          style={[styles.content, { backgroundColor: theme.contentBg }]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Menu na {format(selectedDate, "EEEE", { locale: pl })}
            </Text>
            <TouchableOpacity style={styles.addButton}>
              <Ionicons name="add-circle" size={24} color="#FF6347" />
              <Text style={styles.addButtonText}>Dodaj danie</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.emptyState}>
            <Ionicons
              name="restaurant-outline"
              size={40}
              color={isDark ? "#444" : "#eee"}
            />
            <Text style={[styles.emptyText, { color: theme.subText }]}>
              Brak zaplanowanych posiłków
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20 },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  monthName: { fontSize: 16, color: "#888", textAlign: "center", marginTop: 4 },
  calendarContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  dayCard: {
    width: 46,
    height: 65,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  selectedDayCard: {
    backgroundColor: "#FF6347",
    borderColor: "#FF6347",
    elevation: 4,
  },
  todayCard: { borderColor: "#FF6347" },
  dayName: {
    fontSize: 11,
    color: "#888",
    marginBottom: 4,
    textTransform: "capitalize",
  },
  dayNum: { fontSize: 18, fontWeight: "bold", color: "#333" },
  selectedText: { color: "#fff" },
  todayDot: {
    position: "absolute",
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FF6347",
  },
  content: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textTransform: "capitalize",
  },
  addButton: { flexDirection: "row", alignItems: "center", gap: 5 },
  addButtonText: { color: "#FF6347", fontWeight: "600" },
  emptyState: { alignItems: "center", marginTop: 40 },
  emptyText: { color: "#bbb", marginTop: 10 },
});

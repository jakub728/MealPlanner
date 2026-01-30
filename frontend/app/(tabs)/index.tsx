import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  eachDayOfInterval,
} from "date-fns";
import { api } from "../../api/client";
import { pl } from "date-fns/locale";
import { useAuthStore } from "@/store/useAuthStore";
import LoginFirst from "@/components/loginFirst";
import Colors from "@/constants/Colors";

const MEAL_TYPES = [
  "śniadanie",
  "lunch",
  "obiad",
  "podwieczorek",
  "kolacja",
] as const;
const MEAL_ORDER = {
  śniadanie: 1,
  lunch: 2,
  obiad: 3,
  podwieczorek: 4,
  kolacja: 5,
};
type MealType = (typeof MEAL_TYPES)[number];

export default function PlannerScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(new Date());

  const { token } = useAuthStore((state) => state);
  const queryClient = useQueryClient();

  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const isDark = colorScheme === "dark";

  const dateKey = format(selectedDate, "yyyy-MM-dd");

  const startOfSelectedWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: startOfSelectedWeek,
    end: addDays(startOfSelectedWeek, 30),
  });

  // Aktualizacja widocznego miesiąca podczas przewijania
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const cardWidth = 65; // szerokość dayCard (55) + marginRight (10)
    const index = Math.floor(scrollOffset / cardWidth);

    // Aktualizujemy miesiąc w nagłówku tylko jeśli faktycznie się zmienił
    if (weekDays[index]) {
      setVisibleMonth(weekDays[index]);
    }
  };

  // 1. Przepisy użytkownika
  const { data: myRecipes, isLoading: recipesLoading } = useQuery({
    queryKey: ["myRecipes"],
    queryFn: async () => {
      const response = await api.get("/recipes/private");
      return response.data;
    },
    enabled: !!token && modalVisible,
  });

  // 2. Pobieranie planu na dany dzień
  const { data: dayPlan, isLoading: planLoading } = useQuery({
    queryKey: ["calendar", dateKey],
    queryFn: async () => {
      const response = await api.get(`/calendar?date=${dateKey}`);
      return response.data;
    },
    enabled: !!token,
  });

  // 3. Mutacja: Dodawanie (Upsert)
  const addMutation = useMutation({
    mutationFn: async (mealType: MealType) => {
      return api.post("/calendar/add", {
        recipe: selectedRecipeId,
        date: selectedDate,
        mealType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar", dateKey] });
      setModalVisible(false);
      setSelectedRecipeId(null);
    },
    onError: () => Alert.alert("Błąd", "Nie udało się zapisać posiłku"),
  });

  // 4. Mutacja: Usuwanie
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/calendar/delete/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar", dateKey] });
    },
    onError: (error: any) => {
      console.error("Delete error:", error);
      Alert.alert("Błąd", "Nie udało się usunąć posiłku z serwera.");
    },
  });

  const handleDelete = (id: string) => {
    Alert.alert(
      "Usuń posiłek",
      "Czy na pewno chcesz usunąć to danie z planu?",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          onPress: () => deleteMutation.mutate(id),
          style: "destructive",
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          Planer posiłków
        </Text>
        <Text style={[styles.monthName, { color: theme.subText }]}>
          {format(visibleMonth, "LLLL yyyy", { locale: pl })}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.calendarScrollContent}
        style={styles.calendarContainer}
        onScroll={handleScroll} // Śledzenie ruchu
        scrollEventThrottle={16} // Częstotliwość sprawdzania (16ms = 60fps)
        decelerationRate="fast"
        snapToInterval={65} // "Przyklejanie" do kart (szerokość karty + margines)
      >
        {weekDays.map((day, index) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCard,
                {
                  backgroundColor: isSelected ? "#FF6347" : theme.card,
                  borderColor: isSelected ? "#FF6347" : theme.border,
                  marginRight: 10, // Dodaj odstęp między kartami
                },
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
              {isToday && !isSelected && <View style={styles.todayDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* MODAL Z PRZEPISAMI */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedRecipeId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Wybierz przepis
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSelectedRecipeId(null);
                }}
              >
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>

            {recipesLoading ? (
              <ActivityIndicator color="#FF6347" style={{ margin: 20 }} />
            ) : (
              <FlatList
                data={myRecipes}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => {
                  const isExpanded = selectedRecipeId === item._id;
                  return (
                    <View
                      style={[
                        styles.recipeContainer,
                        { borderBottomColor: theme.border },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.recipeSelectItem}
                        onPress={() =>
                          setSelectedRecipeId(isExpanded ? null : item._id)
                        }
                      >
                        <Text
                          style={{
                            color: theme.text,
                            fontSize: 16,
                            fontWeight: isExpanded ? "bold" : "400",
                          }}
                        >
                          {item.title}
                        </Text>
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "add-circle"}
                          size={24}
                          color="#FF6347"
                        />
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.expandedSection}>
                          <Text
                            style={[
                              styles.selectPrompt,
                              { color: theme.subText },
                            ]}
                          >
                            Dodaj do planu na:
                          </Text>
                          <View style={styles.mealOptionsGrid}>
                            {MEAL_TYPES.map((type) => (
                              <TouchableOpacity
                                key={type}
                                style={[
                                  styles.mealTypeChip,
                                  { backgroundColor: theme.sectionBg },
                                ]}
                                onPress={() => addMutation.mutate(type)}
                              >
                                <Text
                                  style={[
                                    styles.mealTypeChipText,
                                    { color: theme.text },
                                  ]}
                                >
                                  {type}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {!token ? (
        <LoginFirst placeholder=" aby dodać posiłek" />
      ) : (
        <ScrollView
          style={[styles.content, { backgroundColor: theme.sectionBg }]}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Menu na {format(selectedDate, "EEEE", { locale: pl })}
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="add-circle" size={24} color="#FF6347" />
              <Text style={styles.addButtonText}>Dodaj danie</Text>
            </TouchableOpacity>
          </View>

          {planLoading ? (
            <ActivityIndicator color="#FF6347" style={{ marginTop: 20 }} />
          ) : dayPlan && dayPlan.length > 0 ? (
            [...dayPlan]
              .sort(
                (a, b) =>
                  MEAL_ORDER[a.mealType as MealType] -
                  MEAL_ORDER[b.mealType as MealType],
              )
              .map((item: any) => (
                <View
                  key={item._id}
                  style={[styles.plannedItem, { backgroundColor: theme.card }]}
                >
                  <View style={styles.mealContent}>
                    <Text style={styles.mealTag}>{item.mealType}</Text>
                    <Text
                      style={[styles.recipeTitle, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {item.recipe?.title || "Nieznany przepis"}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDelete(item._id)}
                    style={styles.deleteButton}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={isDark ? "#FF6347" : "#ccc"}
                    />
                  </TouchableOpacity>
                </View>
              ))
          ) : (
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
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 20 },
  title: { fontSize: 26, fontWeight: "bold", textAlign: "center" },
  monthName: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 4,
  },
  calendarContainer: {
    height: 95,
    flexGrow: 0,
    marginTop: 10,
    marginBottom: 5,
    paddingHorizontal: 12,
  },
  calendarScrollContent: {
    paddingRight: 20,
    height: 75,
    flexDirection: "row",
  },
  dayCard: {
    width: 55,
    height: 70,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  todayCard: { borderColor: "#FF6347" },
  dayName: { fontSize: 11, marginBottom: 4, textTransform: "capitalize" },
  dayNum: { fontSize: 18, fontWeight: "bold" },
  selectedText: { color: "#fff", fontWeight: "bold" },
  todayDot: {
    position: "absolute",
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FF6347",
  },
  content: { flex: 1, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  scrollContent: { padding: 20 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  addButton: { flexDirection: "row", alignItems: "center", gap: 5 },
  addButtonText: { color: "#FF6347", fontWeight: "600" },
  emptyState: { alignItems: "center", marginTop: 40 },
  emptyText: { marginTop: 10, fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "70%",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold" },
  recipeContainer: { borderBottomWidth: 1, paddingVertical: 5 },
  recipeSelectItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
  },
  expandedSection: { paddingBottom: 15, paddingHorizontal: 5 },
  selectPrompt: {
    fontSize: 12,
    marginBottom: 10,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  mealOptionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  mealTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FF6347",
  },
  mealTypeChipText: { fontSize: 13, textTransform: "capitalize" },
  plannedItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mealIconContainer: {
    alignItems: "center",
    paddingRight: 15,
    borderRightWidth: 1,
    borderRightColor: "#f0f0f0",
    minWidth: 60,
  },
  mealTimeText: {
    fontSize: 12,
    color: "#888",
    fontWeight: "600",
    marginTop: 2,
  },
  mealContent: { flex: 1, paddingLeft: 15 },
  mealTag: {
    color: "#FF6347",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  recipeTitle: { fontSize: 16, fontWeight: "600" },
  deleteButton: { padding: 8 },
});

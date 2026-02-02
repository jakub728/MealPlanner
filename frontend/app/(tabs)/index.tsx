import React, { useState, useEffect } from "react";
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
  ImageBackground,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  eachDayOfInterval,
  isBefore,
  startOfDay,
} from "date-fns";
import { api } from "../../api/client";
import { pl } from "date-fns/locale";
import { useAuthStore } from "@/store/useAuthStore";
import LoginFirst from "@/components/loginFirst";
import Colors from "@/constants/Colors";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MEAL_TYPES = [
  "śniadanie",
  "lunch",
  "obiad",
  "podwieczorek",
  "kolacja",
] as const;
type MealType = (typeof MEAL_TYPES)[number];

const MEAL_ORDER: Record<MealType, number> = {
  śniadanie: 1,
  lunch: 2,
  obiad: 3,
  podwieczorek: 4,
  kolacja: 5,
};

const MEAL_COLORS: Record<MealType, string> = {
  śniadanie: "#FFD700",
  lunch: "#87CEEB",
  obiad: "#4CAF50",
  podwieczorek: "#FF8C00",
  kolacja: "#9370DB",
};

const CALENDAR_STORAGE_KEY = "user_calendar_data";

export default function PlannerScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [fullCalendar, setFullCalendar] = useState<any[]>([]);
  const [isLocalLoading, setIsLocalLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const { token } = useAuthStore((state) => state);
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const isDark = colorScheme === "dark";

  const router = useRouter();

  const loadCalendar = async () => {
    try {
      setIsLocalLoading(true);
      const data = await AsyncStorage.getItem(CALENDAR_STORAGE_KEY);
      let parsedData = data ? JSON.parse(data) : [];
      setFullCalendar(parsedData);
    } catch (e) {
      console.error("Błąd wczytywania", e);
    } finally {
      setIsLocalLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, []);

  const saveCalendar = async (newCalendar: any[]) => {
    try {
      setFullCalendar(newCalendar);
      await AsyncStorage.setItem(
        CALENDAR_STORAGE_KEY,
        JSON.stringify(newCalendar),
      );
    } catch (e) {
      Alert.alert("Błąd", "Nie udało się zapisać planu.");
    }
  };

  const { data: myRecipes, isLoading: recipesLoading } = useQuery({
    queryKey: ["myRecipes"],
    queryFn: async () => {
      const response = await api.get("/recipes/private");
      return response.data;
    },
    enabled: !!token && modalVisible,
  });

  const handleAddMeal = async (mealType: MealType) => {
    const selectedRecipe = myRecipes?.find(
      (r: any) => r._id === selectedRecipeId,
    );
    if (!selectedRecipe) return;

    const filteredCalendar = fullCalendar.filter(
      (item) =>
        !(
          isSameDay(new Date(item.date), selectedDate) &&
          item.mealType === mealType
        ),
    );

    const newMeal = {
      _id: Math.random().toString(36).substr(2, 9),
      recipe: selectedRecipe,
      date: selectedDate.toISOString(),
      mealType,
    };

    await saveCalendar([...filteredCalendar, newMeal]);
    setModalVisible(false);
    setSelectedRecipeId(null);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Usuń posiłek", "Czy na pewno?", [
      { text: "Anuluj", style: "cancel" },
      {
        text: "Usuń",
        style: "destructive",
        onPress: () => {
          const updated = fullCalendar.filter((item) => item._id !== id);
          saveCalendar(updated);
        },
      },
    ]);
  };

  const dayPlan = fullCalendar.filter((item) =>
    isSameDay(new Date(item.date), selectedDate),
  );
  const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const daysToShow = isExpanded ? 14 : 7;
  const weekDays = eachDayOfInterval({
    start: startOfCurrentWeek,
    end: addDays(startOfCurrentWeek, daysToShow - 1),
  });

  if (!token) {
    return <LoginFirst placeholder=" aby zacząć planować posiłki" />;
  }

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
          {format(selectedDate, "LLLL yyyy", { locale: pl })}
        </Text>
      </View>

      <View style={styles.calendarGridContainer}>
        <View style={styles.daysGrid}>
          {weekDays.map((day, index) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const dayMeals = fullCalendar.filter((m) =>
              isSameDay(new Date(m.date), day),
            );

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCard,
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? "#444"
                        : "#f0f0f0"
                      : theme.card,
                    borderColor: isSelected ? "#FF6347" : theme.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => setSelectedDate(day)}
              >
                {isToday && <View style={styles.todayUnderline} />}
                <Text
                  style={[
                    styles.dayName,
                    { color: isSelected ? "#FF6347" : theme.subText },
                  ]}
                >
                  {format(day, "eee", { locale: pl })}
                </Text>
                <Text style={[styles.dayNum, { color: theme.text }]}>
                  {format(day, "d")}
                </Text>
                <View style={styles.mealIndicatorContainer}>
                  {MEAL_TYPES.map((type) => {
                    const hasMeal = dayMeals.some((m) => m.mealType === type);
                    return (
                      <View
                        key={type}
                        style={[
                          styles.mealDot,
                          {
                            backgroundColor: hasMeal
                              ? MEAL_COLORS[type]
                              : isDark
                                ? "#333"
                                : "#eee",
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <Text style={styles.expandButtonText}>
            {isExpanded ? "Pokaż mniej" : "Pokaż kolejny tydzień"}
          </Text>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={16}
            color="#FF6347"
          />
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={{ flex: 1, width: "100%" }}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Wybierz przepis
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
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
                  const isExpandedRecipe = selectedRecipeId === item._id;
                  return (
                    <View
                      style={[
                        styles.recipeContainer,
                        { borderBottomColor: theme.border },
                      ]}
                    >
                      <ImageBackground
                        source={{
                          uri:
                            item.imageUrl || "https://via.placeholder.com/300",
                        }}
                        style={styles.recipeBackgroundImage}
                        imageStyle={{ borderRadius: 12 }}
                      >
                        {/* Nakładka przyciemniająca dla czytelności */}
                        <View
                          style={[
                            styles.recipeImageOverlay,
                            { backgroundColor: "rgba(0,0,0,0.4)" },
                          ]}
                        />

                        <TouchableOpacity
                          style={styles.recipeSelectItem}
                          onPress={() =>
                            setSelectedRecipeId(
                              isExpandedRecipe ? null : item._id,
                            )
                          }
                        >
                          <Text
                            style={{
                              color: "#FFFFFF", // Biały tekst lepiej wygląda na zdjęciu
                              fontSize: 16,
                              fontWeight: "bold",
                              textShadowColor: "rgba(0, 0, 0, 0.75)",
                              textShadowOffset: { width: -1, height: 1 },
                              textShadowRadius: 10,
                            }}
                          >
                            {item.title}
                          </Text>
                          <Ionicons
                            name={
                              isExpandedRecipe ? "chevron-up" : "add-circle"
                            }
                            size={28}
                            color="#FF6347"
                          />
                        </TouchableOpacity>

                        {isExpandedRecipe && (
                          <View style={styles.expandedSection}>
                            <View style={styles.mealOptionsGrid}>
                              {MEAL_TYPES.map((type) => (
                                <TouchableOpacity
                                  key={type}
                                  style={[
                                    styles.mealTypeChip,
                                    {
                                      backgroundColor:
                                        "rgba(255, 255, 255, 0.9)",
                                    }, // Jasne przyciski na ciemnym tle
                                  ]}
                                  onPress={() => handleAddMeal(type)}
                                >
                                  <Text
                                    style={[
                                      styles.mealTypeChipText,
                                      { color: "#333", fontWeight: "600" },
                                    ]}
                                  >
                                    {type}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        )}
                      </ImageBackground>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      <ScrollView
        style={[styles.content, { backgroundColor: theme.sectionBg }]}
      >
        <View style={styles.scrollContent}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {format(selectedDate, "EEEE, d LLLL", { locale: pl })}
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="add-circle" size={24} color="#FF6347" />
              <Text style={styles.addButtonText}>Dodaj danie</Text>
            </TouchableOpacity>
          </View>

          {isLocalLoading ? (
            <ActivityIndicator color="#FF6347" style={{ marginTop: 20 }} />
          ) : dayPlan.length > 0 ? (
            [...dayPlan]
              .sort(
                (a, b) =>
                  MEAL_ORDER[a.mealType as MealType] -
                  MEAL_ORDER[b.mealType as MealType],
              )
              .map((item: any) => (
                <TouchableOpacity
                  key={item._id}
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push({
                      pathname: "/recipeDetail",
                      params: { id: item.recipe._id },
                    })
                  }
                  style={styles.plannedItemContainer}
                >
                  <ImageBackground
                    source={{
                      uri:
                        item.recipe?.imageUrl ||
                        "https://via.placeholder.com/300",
                    }}
                    style={[
                      styles.plannedItem,
                      {
                        borderLeftColor: MEAL_COLORS[item.mealType as MealType],
                      },
                    ]}
                    imageStyle={{ borderRadius: 15 }}
                  >
                    <View
                      style={[
                        styles.overlay,
                        {
                          backgroundColor: isDark
                            ? "rgba(0,0,0,0.6)"
                            : "rgba(255,255,255,0.7)",
                        },
                      ]}
                    />
                    <View style={styles.mealContent}>
                      <Text
                        style={[
                          styles.mealTag,
                          { color: MEAL_COLORS[item.mealType as MealType] },
                        ]}
                      >
                        {item.mealType}
                      </Text>
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
                        size={22}
                        color={isDark ? "#FF6347" : "#333"}
                      />
                    </TouchableOpacity>
                  </ImageBackground>
                </TouchableOpacity>
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center" },
  monthName: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 4,
    textTransform: "capitalize",
  },
  calendarGridContainer: { paddingHorizontal: 10, marginBottom: 10 },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  dayCard: {
    width: "13.5%",
    height: 80,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    padding: 8,
    position: "relative",
    borderWidth: 1,
  },
  dayName: { fontSize: 10, marginBottom: 2, textTransform: "uppercase" },
  dayNum: { fontSize: 16, fontWeight: "bold" },
  mealIndicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 2,
    marginTop: 8,
    width: "100%",
    paddingHorizontal: 4,
  },
  mealDot: { width: 6, height: 6, borderRadius: 1 },
  todayUnderline: {
    position: "absolute",
    top: 6,
    width: 12,
    height: 2,
    backgroundColor: "#FF6347",
    borderRadius: 1,
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  expandButtonText: {
    color: "#FF6347",
    fontWeight: "600",
    fontSize: 12,
    marginRight: 5,
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
  plannedItemContainer: {
    marginBottom: 12,
    borderRadius: 15,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  plannedItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    height: 90,
    borderLeftWidth: 6,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  mealContent: { flex: 1, paddingLeft: 10, justifyContent: "center" },
  mealTag: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  recipeTitle: { fontSize: 18, fontWeight: "bold" },
  deleteButton: {
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
  },
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
  recipeContainer: {
    marginBottom: 10,
  },
  recipeSelectItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
  expandedSection: {
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  mealOptionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  mealTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FF6347",
    elevation: 2,
  },
  mealTypeChipText: { fontSize: 13, textTransform: "capitalize" },

  recipeBackgroundImage: {
    width: "100%",
    minHeight: 80,
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 12,
  },
  recipeImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
});

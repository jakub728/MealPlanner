import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
  ImageBackground,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  ScrollView,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "@/constants/Colors";
import { LinearGradient } from "expo-linear-gradient";
import { DISHES, CUISINES, DIET_TYPES } from "@/constants/Filters";
import { useThemeStore } from "@/store/useThemeStore";

// Włączenie animacji dla Androida
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SortOption = "najnowsze" | "najpopularniejsze" | "a-z" | "z-a";

export default function PublicRecipesScreen() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("najnowsze");
  const [selectedDishes, setSelectedDishes] = useState<string[]>([]);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const activeFiltersCount =
    selectedDishes.length + selectedDiets.length + selectedCuisines.length;

  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { primaryColor } = useThemeStore();

  const {
    data: publicRecipes,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["publicRecipes"],
    queryFn: async () => (await api.get("/recipes/public")).data,
  });

  const { data: myRecipes } = useQuery({
    queryKey: ["myRecipes"],
    queryFn: async () => (await api.get("/recipes/private")).data,
  });

  const toggleMenu = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleFilter = (
    setFn: React.Dispatch<React.SetStateAction<string[]>>,
    value: string,
  ) => {
    setFn((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value],
    );
  };

  const filteredData = useMemo(() => {
    if (!publicRecipes) return [];

    const myIds = new Set(myRecipes?.map((r: any) => r._id) || []);
    let list = publicRecipes.filter((r: any) => !myIds.has(r._id));

    if (search) {
      list = list.filter((r: any) =>
        r.title.toLowerCase().includes(search.toLowerCase()),
      );
    }

    // Filtrowanie DISHES (Multi)
    if (selectedDishes.length > 0) {
      list = list.filter((r: any) =>
        r.dish_type?.some((type: string) => selectedDishes.includes(type)),
      );
    }

    // Filtrowanie DIETS (Multi)
    if (selectedDiets.length > 0) {
      list = list.filter((r: any) =>
        r.diet_type?.some((diet: string) => selectedDiets.includes(diet)),
      );
    }

    // Filtrowanie CUISINES (Multi)
    if (selectedCuisines.length > 0) {
      list = list.filter((r: any) => selectedCuisines.includes(r.cuisine));
    }

    // Sortowanie
    return [...list].sort((a: any, b: any) => {
      if (sortBy === "a-z") return a.title.localeCompare(b.title);
      if (sortBy === "z-a") return b.title.localeCompare(a.title);
      if (sortBy === "najnowsze")
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      if (sortBy === "najpopularniejsze") {
        const getAvg = (n: number[]) =>
          n?.length ? n.reduce((acc, v) => acc + v, 0) / n.length : 0;
        return getAvg(b.note) - getAvg(a.note);
      }
      return 0;
    });
  }, [
    publicRecipes,
    myRecipes,
    search,
    sortBy,
    selectedDishes,
    selectedDiets,
    selectedCuisines,
  ]);

  const FilterChip = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[
        styles.chip,
        active && [styles.activeChip, { backgroundColor: primaryColor }],
      ]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.activeChipText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderRecipeItem = ({ item }: { item: any }) => {
    const avgNote = item.note?.length
      ? (
          item.note.reduce(
            (acc: number, curr: any) => acc + (curr.value || 0),
            0,
          ) / item.note.length
        ).toFixed(1)
      : "0.0";

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          router.push({ pathname: "/recipeDetail", params: { id: item._id } })
        }
      >
        <ImageBackground
          source={{ uri: item.imageUrl || "https://via.placeholder.com/400" }}
          style={styles.recipeCard}
          imageStyle={styles.cardImage}
        >
          {/* OCENA W LEWYM GÓRNYM ROGU */}
          <View style={styles.topRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>{avgNote}</Text>
            </View>
          </View>

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.85)"]}
            style={styles.gradient}
          >
            {/* TYTUŁ */}
            <Text style={styles.recipeTitle} numberOfLines={1}>
              {item.title}
            </Text>

            {/* RZĄD BADGY POD TYTUŁEM */}
            <View style={styles.badgeContainer}>
              {/* BADGE KUCHNI */}
              <View
                style={[styles.cuisineBadge, { backgroundColor: primaryColor }]}
              >
                <Text style={{ fontSize: 10 }}>
                  {CUISINES.find((c) => c.label === item.cuisine)?.flag}
                </Text>
                <Text style={styles.cuisineBadgeText}>
                  {item.cuisine || "Inna"}
                </Text>
              </View>

              {/* TYPY DAŃ (z mapowania, ograniczone do 2 dla czytelności) */}
              {item.dish_type?.map((d: any, index: number) => (
                <View
                  key={`dish-${index}`}
                  style={[
                    styles.cuisineBadge,
                    { backgroundColor: "rgba(232, 245, 233, 0.3)" },
                  ]}
                >
                  <Text style={styles.cuisineBadgeText}>
                    {typeof d === "string" ? d : d.name}
                  </Text>
                </View>
              ))}

              {/* OPCJONALNIE: TYPY DIETY (jeśli jest miejsce) */}
              {item.diet_type?.slice(0, 1).map((d: any, index: number) => (
                <View
                  key={`diet-${index}`}
                  style={[
                    styles.cuisineBadge,
                    { backgroundColor: "rgba(76, 175, 79, 0.35)" },
                  ]}
                >
                  <Text style={styles.cuisineBadgeText}>
                    {typeof d === "string" ? d : d.name}
                  </Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      {/* Header z Wyszukiwarką i Toggle Menu */}
      <View style={styles.headerRow}>
        <View style={[styles.searchBox, { backgroundColor: theme.card }]}>
          <Ionicons name="search" size={20} color="#888" />
          <TextInput
            placeholder="Szukaj..."
            placeholderTextColor="#888"
            style={[styles.searchInput, { color: theme.text }]}
            value={search}
            onChangeText={setSearch}
            onPress={() => {
              isMenuOpen && setIsMenuOpen(!isMenuOpen);
            }}
          />
        </View>
        <TouchableOpacity
          style={[
            [styles.menuToggle, { backgroundColor: theme.card }],
            isMenuOpen && [{ backgroundColor: primaryColor }],
          ]}
          onPress={toggleMenu}
        >
          <Ionicons
            name={isMenuOpen ? "close" : "options-outline"}
            size={24}
            color={isMenuOpen ? "#fff" : primaryColor}
          />
          {activeFiltersCount > 0 && (
            <View style={[styles.badge, { backgroundColor: primaryColor }]}>
              <Text style={styles.badgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Rozwijane menu wertykalne */}
      {isMenuOpen && (
        <View style={[styles.filterMenu, { backgroundColor: theme.card }]}>
          <ScrollView
            style={{ maxHeight: 450 }}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* SORTOWANIE */}
            <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
              Sortowanie
            </Text>
            <View style={styles.chipGroup}>
              {(["najnowsze", "najlepsze", "a-z", "z-a"] as SortOption[]).map(
                (opt) => (
                  <FilterChip
                    key={opt}
                    label={opt.toUpperCase()}
                    active={sortBy === opt}
                    onPress={() => setSortBy(opt)}
                  />
                ),
              )}
            </View>

            {/* RODZAJ DANIA */}
            <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
              Rodzaj dania
            </Text>
            <View style={styles.chipGroup}>
              {DISHES.map((dish) => (
                <TouchableOpacity
                  key={dish.value}
                  style={[
                    styles.chip,
                    selectedDishes.includes(dish.value) && [
                      styles.activeChip,
                      { backgroundColor: primaryColor },
                    ],
                    styles.chipWithIcon,
                  ]}
                  onPress={() => toggleFilter(setSelectedDishes, dish.value)}
                >
                  {dish.type === "mat" ? (
                    <MaterialCommunityIcons
                      name={dish.icon as any}
                      size={18}
                      style={{ textAlign: "center" }}
                      color={
                        selectedDishes.includes(dish.label)
                          ? primaryColor
                          : "#666"
                      }
                    />
                  ) : (
                    <Ionicons
                      name={dish.icon as any}
                      size={18}
                      style={{ textAlign: "center" }}
                      color={
                        selectedDishes.includes(dish.label)
                          ? primaryColor
                          : "#666"
                      }
                    />
                  )}
                  <Text
                    style={[
                      styles.chipText,
                      selectedDishes.includes(dish.value) &&
                        styles.activeChipText,
                    ]}
                  >
                    {dish.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* RODZAJ DIETY */}
            <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
              Rodzaj diety
            </Text>
            <View style={styles.chipGroup}>
              {DIET_TYPES.map((diet) => (
                <TouchableOpacity
                  key={diet.label}
                  style={[
                    styles.chip,
                    selectedDiets.includes(diet.label) && [
                      styles.activeChip,
                      { backgroundColor: primaryColor },
                    ],
                    styles.chipWithIcon,
                  ]}
                  onPress={() => toggleFilter(setSelectedDiets, diet.label)}
                >
                  {diet.type === "mat" ? (
                    <MaterialCommunityIcons
                      name={diet.icon as any}
                      size={18}
                      style={{ textAlign: "center" }}
                      color={
                        selectedDishes.includes(diet.label)
                          ? primaryColor
                          : "#666"
                      }
                    />
                  ) : (
                    <Ionicons
                      name={diet.icon as any}
                      size={18}
                      style={{ textAlign: "center" }}
                      color={
                        selectedDishes.includes(diet.label)
                          ? primaryColor
                          : "#666"
                      }
                    />
                  )}
                  <Text
                    style={[
                      styles.chipText,
                      selectedDiets.includes(diet.label) &&
                        styles.activeChipText,
                    ]}
                  >
                    {diet.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* KUCHNIA */}
            <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
              Kuchnia
            </Text>
            <View style={styles.chipGroup}>
              {CUISINES.map((c) => (
                <FilterChip
                  key={c.label}
                  label={`${c.flag} ${c.label}`}
                  active={selectedCuisines.includes(c.label)}
                  onPress={() => toggleFilter(setSelectedCuisines, c.label)}
                />
              ))}
            </View>

            {/* PRZYCISK RESETU */}
            {(selectedDishes.length > 0 ||
              selectedDiets.length > 0 ||
              selectedCuisines.length > 0) && (
              <TouchableOpacity
                onPress={() => {
                  setSelectedDishes([]);
                  setSelectedDiets([]);
                  setSelectedCuisines([]);
                }}
                style={[styles.resetButton, { borderColor: primaryColor }]}
              >
                <Ionicons
                  name="refresh-circle"
                  size={20}
                  color={primaryColor}
                />
                <Text style={[styles.resetText, { color: primaryColor }]}>
                  Wyczyść wszystkie filtry
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item._id}
        renderItem={renderRecipeItem}
        contentContainerStyle={styles.listPadding}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#FF6347"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="sad-outline" size={60} color={theme.border} />
            <Text style={[styles.emptyText, { color: theme.subText }]}>
              Brak wyników dla tych filtrów.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    alignItems: "center",
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    borderRadius: 15,
    height: 50,
    elevation: 3,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  menuToggle: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "#666",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  filterMenu: {
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 20,
    marginBottom: 15,
    elevation: 5,
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 10,
    opacity: 0.6,
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
  },
  activeChip: { backgroundColor: "#FF6347" },
  chipText: { fontSize: 13, color: "#666" },
  activeChipText: { color: "#fff", fontWeight: "bold" },
  listPadding: { paddingHorizontal: 20, paddingBottom: 100 },
  recipeCard: {
    height: 180,
    borderRadius: 20,
    marginBottom: 15,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardImage: {
    borderRadius: 20,
  },
  topRow: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 2,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  ratingText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  gradient: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 15,
  },
  recipeTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  cuisineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cuisineBadgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 9,
    textTransform: "uppercase",
  },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  authorText: { color: "#ccc", fontSize: 13 },
  cuisineText: { color: "#FF6347", fontSize: 13, fontWeight: "bold" },
  dot: { color: "#888", marginHorizontal: 8 },
  cardContent: { width: "100%" },
  emptyState: { alignItems: "center", marginTop: 100 },
  emptyText: { marginTop: 10, fontSize: 16 },
  chipWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  resetButton: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FF6347",
    borderRadius: 12,
    borderStyle: "dashed",
  },
  resetText: {
    color: "#FF6347",
    fontWeight: "bold",
    fontSize: 14,
  },
  badge: {
    position: "absolute",
    right: 32,
    bottom: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
    paddingHorizontal: 2,
    zIndex: 1,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
});

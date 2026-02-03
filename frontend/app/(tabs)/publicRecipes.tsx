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
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "@/constants/Colors";
import { LinearGradient } from "expo-linear-gradient";

const CUISINES = [
  "Polska",
  "Włoska",
  "Amerykańska",
  "Meksykańska",
  "Hinduska",
  "Chińska",
  "Japońska",
  "Wietnamska",
  "Koreańska",
  "Tajska",
  "Grecka",
  "Hiszpańska",
  "Turecka",
  "Francuska",
];

const DIET_TYPES = [
  "Wegetariańska",
  "Wegańska",
  "Bezglutenowa",
  "Keto",
  "Low Carb",
  "Bez laktozy",
  "Wysokobiałkowa",
];

// Włączenie animacji dla Androida
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SortOption = "najnowsze" | "najlepsze" | "a-z" | "z-a";

export default function PublicRecipesScreen() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("najnowsze");
  const [selectedDiet, setSelectedDiet] = useState<string | null>(null);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedMeat, setSelectedMeat] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

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

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(cuisine)
        ? prev.filter((c) => c !== cuisine)
        : [...prev, cuisine],
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
    if (selectedDiet) {
      list = list.filter((r: any) => r.diet_type?.includes(selectedDiet));
    }
    if (selectedCuisines.length > 0) {
      list = list.filter((r: any) => selectedCuisines.includes(r.cuisine));
    }
    if (selectedMeat) {
      list = list.filter((r: any) => r.meat_type === selectedMeat);
    }

    return list.sort((a: any, b: any) => {
      if (sortBy === "a-z") return a.title.localeCompare(b.title);
      if (sortBy === "najnowsze")
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      if (sortBy === "najlepsze") {
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
    selectedDiet,
    selectedCuisines,
    selectedMeat,
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
      style={[styles.chip, active && styles.activeChip]}
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
          item.note.reduce((a: number, b: number) => a + b, 0) /
          item.note.length
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
          <View style={styles.topRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>{avgNote}</Text>
            </View>
          </View>
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.9)"]}
            style={styles.gradient}
          >
            <View style={styles.cardContent}>
              <Text style={styles.recipeTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.authorText}>
                  {item.author?.name || "Anonim"}
                </Text>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.cuisineText}>{item.cuisine || "Inna"}</Text>
              </View>
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
          />
        </View>
        <TouchableOpacity
          style={[styles.menuToggle, isMenuOpen && styles.activeToggle]}
          onPress={toggleMenu}
        >
          <Ionicons
            name={isMenuOpen ? "close" : "options-outline"}
            size={24}
            color={isMenuOpen ? "#fff" : "#FF6347"}
          />
        </TouchableOpacity>
      </View>

      {/* Rozwijane menu wertykalne */}
      {isMenuOpen && (
        <View style={[styles.filterMenu, { backgroundColor: theme.card }]}>
          <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
            Sortowanie
          </Text>
          <View style={styles.chipGroup}>
            {(["najnowsze", "najlepsze", "a-z"] as SortOption[]).map((opt) => (
              <FilterChip
                key={opt}
                label={opt.toUpperCase()}
                active={sortBy === opt}
                onPress={() => setSortBy(opt)}
              />
            ))}
          </View>

          <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
            Rodzaj diety
          </Text>
          <View style={styles.chipGroup}>
            {DIET_TYPES.map((diet) => (
              <FilterChip
                key={diet}
                label={diet}
                active={selectedDiet === diet}
                onPress={() =>
                  setSelectedDiet(selectedDiet === diet ? null : diet)
                }
              />
            ))}
          </View>

          <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
            Kuchnia
          </Text>
          <View style={styles.chipGroup}>
            {CUISINES.map((c) => (
              <FilterChip
                key={c}
                label={c}
                active={selectedCuisines.includes(c)}
                onPress={() => toggleCuisine(c)}
              />
            ))}
          </View>
          {/* <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
            Mięso
          </Text>
          <View style={styles.chipGroup}>
            {["Kurczak", "Wołowina", "Wieprzowina"].map((m) => (
              <FilterChip
                key={m}
                label={m}
                active={selectedMeat === m}
                onPress={() => setSelectedMeat(selectedMeat === m ? null : m)}
              />
            ))}
          </View> */}
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
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    borderWidth: 1,
    borderColor: "#FF6347",
  },
  activeToggle: { backgroundColor: "#FF6347" },
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
  chipGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
    height: 220,
    borderRadius: 25,
    marginBottom: 20,
    overflow: "hidden",
    elevation: 5,
  },
  cardImage: { borderRadius: 25 },
  gradient: { flex: 1, justifyContent: "flex-end", padding: 16 },
  topRow: { position: "absolute", top: 12, right: 12 },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  recipeTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  authorText: { color: "#ccc", fontSize: 13 },
  cuisineText: { color: "#FF6347", fontSize: 13, fontWeight: "bold" },
  dot: { color: "#888", marginHorizontal: 8 },
  cardContent: { width: "100%" },
  emptyState: { alignItems: "center", marginTop: 100 },
  emptyText: { marginTop: 10, fontSize: 16 },
});

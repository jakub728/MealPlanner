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
import { useAuthStore } from "@/store/useAuthStore";
import LoginFirst from "@/components/loginFirst";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "@/constants/Colors";
import { LinearGradient } from "expo-linear-gradient";
import { DISHES, CUISINES, DIET_TYPES } from "@/constants/Filters";
import { useThemeStore } from "@/store/useThemeStore";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SortOption = "najnowsze" | "najlepsze" | "a-z";

const getStatusConfig = (status: string) => {
  switch (status) {
    case "public":
      return { icon: "earth", color: "#4CAF50", label: "Publiczny" };
    case "pending":
      return { icon: "time", color: "#FF9800", label: "Oczekujący" };
    default:
      return { icon: "lock-closed", color: "#fff", label: "Prywatny" };
  }
};

export default function MyRecipesScreen() {
  const [activeTab, setActiveTab] = useState<"added" | "liked" | "all">(
    "added",
  );
  const [search, setSearch] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("najnowsze");
  const [selectedDishes, setSelectedDishes] = useState<string[]>([]);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const activeFiltersCount =
    selectedDishes.length + selectedDiets.length + selectedCuisines.length;

  const { token, user } = useAuthStore();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { primaryColor } = useThemeStore();

  // 1. Pobieranie danych
  const {
    data: myRecipes,
    isLoading: loadingAdded,
    refetch: refetchAdded,
  } = useQuery({
    queryKey: ["myRecipes"],
    queryFn: async () => (await api.get("/recipes/private")).data,
    enabled: !!token,
  });

  const {
    data: likedRecipes,
    isLoading: loadingLiked,
    refetch: refetchLiked,
  } = useQuery({
    queryKey: ["likedRecipes"],
    queryFn: async () => (await api.get("/recipes/liked")).data,
    enabled: !!token,
  });

  const {
    data: userFull,
    isLoading: loadingUser,
    refetch: refetchUSer,
  } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/auth/me")).data,
    enabled: !!token,
  });

  const allRecipes = useMemo(() => {
    if (!myRecipes && !likedRecipes) return [];

    const combined = [...(myRecipes || []), ...(likedRecipes || [])];

    return Array.from(
      new Map(combined.map((item) => [item._id, item])).values(),
    );
  }, [myRecipes, likedRecipes]);

  // 2. Logika filtrowania i sortowania (taka sama jak w publicznych)
  const filteredData = useMemo(() => {
    const baseData =
      (activeTab === "added" && myRecipes) ||
      (activeTab === "liked" && likedRecipes) ||
      (activeTab === "all" && allRecipes) ||
      [];

    let list = [...baseData];

    if (search) {
      list = list.filter((r: any) =>
        r.title.toLowerCase().includes(search.toLowerCase()),
      );
    }
    if (selectedDishes.length > 0) {
      list = list.filter((r: any) =>
        r.dish_type?.some((type: any) =>
          selectedDishes.includes(type.name || type),
        ),
      );
    }

    if (selectedDiets.length > 0) {
      list = list.filter((r: any) =>
        r.diet_type?.some((diet: any) =>
          selectedDiets.includes(diet.name || diet),
        ),
      );
    }
    if (selectedCuisines.length > 0) {
      list = list.filter((r: any) => selectedCuisines.includes(r.cuisine));
    }

    return list.sort((a: any, b: any) => {
      // if (sortBy === "a-z")
      return a.title.localeCompare(b.title);
      // return (
      //   new Date(b.createdAt || 0).getTime() -
      //   new Date(a.createdAt || 0).getTime()
      // );
    });
  }, [
    activeTab,
    myRecipes,
    likedRecipes,
    allRecipes,
    search,
    selectedDishes,
    selectedDiets,
    selectedCuisines,
    sortBy,
  ]);

  const toggleFilter = (
    setFn: React.Dispatch<React.SetStateAction<string[]>>,
    value: string,
  ) => {
    setFn((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value],
    );
  };

  if (!token) return <LoginFirst placeholder=" aby zobaczyć swoje przepisy" />;

  const isLoading =
    activeTab === "added"
      ? loadingAdded
      : activeTab === "liked"
        ? loadingLiked
        : loadingAdded || loadingLiked;

  const onRefresh = () => {
    if (activeTab === "added") refetchAdded();
    else if (activeTab === "liked") refetchLiked();
    else {
      refetchAdded();
      refetchLiked();
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          {(activeTab === "added" && "Moje przepisy") ||
            (activeTab === "liked" && "Polubion przepisy") ||
            (activeTab === "all" && "Wszystkie przepisy")}
        </Text>

        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchContainer,
              { backgroundColor: colorScheme === "dark" ? "#333" : "#f0f0f0" },
            ]}
          >
            <Ionicons
              name="search"
              size={20}
              color={theme.subText}
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Szukaj..."
              placeholderTextColor={theme.subText}
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
              styles.filterBtn,
              {
                backgroundColor: isMenuOpen
                  ? primaryColor
                  : colorScheme === "dark"
                    ? "#333"
                    : "#f0f0f0",
              },
            ]}
            onPress={() => {
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
              setIsMenuOpen(!isMenuOpen);
            }}
          >
            <Ionicons
              name="options-outline"
              size={24}
              color={isMenuOpen ? "#fff" : theme.text}
            />
          </TouchableOpacity>
          {activeFiltersCount > 0 && (
            <View style={[styles.badge, { backgroundColor: primaryColor }]}>
              <Text style={styles.badgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* MENU FILTROWANIA (Rozwijane) */}
      {isMenuOpen && (
        <View style={styles.menuContent}>
          {/* SEKCJA DAŃ */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {DISHES.map((dish) => {
              const isActive = selectedDishes.includes(dish.value);
              const IconComponent =
                dish.type === "mat" ? MaterialCommunityIcons : Ionicons;
              return (
                <TouchableOpacity
                  key={dish.value}
                  onPress={() => toggleFilter(setSelectedDishes, dish.value)}
                  style={[
                    styles.chip,
                    isActive && {
                      backgroundColor: `${primaryColor}4D`,
                      borderColor: primaryColor,
                    },
                  ]}
                >
                  <IconComponent
                    name={dish.icon as any}
                    size={18}
                    color={isActive ? primaryColor : "#666"}
                    style={{ textAlign: "center" }}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      isActive && { color: primaryColor, fontWeight: "bold" },
                    ]}
                  >
                    {dish.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* SEKCJA DIET */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {DIET_TYPES.map((diet) => {
              const isActive = selectedDiets.includes(diet.label);
              const IconComponent =
                diet.type === "mat" ? MaterialCommunityIcons : Ionicons;
              return (
                <TouchableOpacity
                  key={diet.label}
                  onPress={() => toggleFilter(setSelectedDiets, diet.label)}
                  style={[
                    styles.chip,
                    isActive && {
                      backgroundColor: `${primaryColor}4D`,
                      borderColor: primaryColor,
                    },
                  ]}
                >
                  <IconComponent
                    name={diet.icon as any}
                    size={18}
                    color={isActive ? primaryColor : "#666"}
                    style={{ textAlign: "center" }}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      isActive && { color: primaryColor, fontWeight: "bold" },
                    ]}
                  >
                    {diet.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* SEKCJA KUCHNI */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {CUISINES.map((c) => {
              const isActive = selectedCuisines.includes(c.label);
              return (
                <TouchableOpacity
                  key={c.label}
                  onPress={() => toggleFilter(setSelectedCuisines, c.label)}
                  style={[
                    styles.chip,
                    isActive && {
                      backgroundColor: `${primaryColor}4D`,
                      borderColor: primaryColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isActive && { color: primaryColor, fontWeight: "bold" },
                    ]}
                  >
                    {c.flag} {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* TABS */}
      <View
        style={[
          styles.tabContainer,
          { backgroundColor: colorScheme === "dark" ? "#333" : "#f0f0f0" },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "added" && [
              styles.activeTab,
              { backgroundColor: theme.card },
            ],
          ]}
          onPress={() => {
            LayoutAnimation.spring();
            setActiveTab("added");
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "added" && [{ color: primaryColor }],
            ]}
          >
            Moje
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "liked" && [
              styles.activeTab,
              { backgroundColor: theme.card },
            ],
          ]}
          onPress={() => {
            LayoutAnimation.spring();
            setActiveTab("liked");
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "liked" && [{ color: primaryColor }],
            ]}
          >
            Polubione
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "all" && [
              styles.activeTab,
              { backgroundColor: theme.card },
            ],
          ]}
          onPress={() => {
            LayoutAnimation.spring();
            setActiveTab("all");
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "all" && [{ color: primaryColor }],
              ,
            ]}
          >
            Wszystkie
          </Text>
        </TouchableOpacity>
      </View>

      {/* LISTA */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listPadding}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={primaryColor}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() =>
              router.push({
                pathname: "/recipeDetail",
                params: { id: item._id },
              })
            }
          >
            <ImageBackground
              source={{
                uri:
                  item.imageUrl ||
                  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
              }}
              style={styles.recipeCard}
              imageStyle={styles.cardImage}
            >
              {/* LEWA GÓRA: OCENA */}
              {item.status === "public" && (
                <View style={styles.topRow}>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.ratingText}>
                      {item.note && item.note.length > 0
                        ? (
                            item.note.reduce(
                              (acc: number, curr: any) => acc + curr.value,
                              0,
                            ) / item.note.length
                          ).toFixed(1)
                        : "0.0"}
                    </Text>
                  </View>
                </View>
              )}

              {/* PRAWA GÓRA: STATUSY (IKONY) */}
              <View style={styles.rightTopIcons}>
                {item.author._id === user?.id && (
                  <View style={styles.statusBadge}>
                    <Ionicons
                      name={getStatusConfig(item.status).icon as any}
                      size={18}
                      color={getStatusConfig(item.status).color}
                    />
                  </View>
                )}
                {userFull?.recipes_liked?.includes(item._id) && (
                  <View style={styles.statusBadge}>
                    <Ionicons name="heart" size={18} color="#FF5252" />
                  </View>
                )}
              </View>

              {/* DÓŁ: TYTUŁ I TAGI */}
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.85)"]}
                style={styles.gradient}
              >
                <Text style={styles.recipeTitle} numberOfLines={1}>
                  {item.title}
                </Text>

                <View style={styles.tagsContainer}>
                  {/* BADGE KUCHNI */}
                  <View
                    style={[
                      styles.cuisineBadge,
                      { backgroundColor: primaryColor },
                    ]}
                  >
                    <Text style={{ fontSize: 10 }}>
                      {
                        CUISINES.find((c) => c.label === item.cuisine)?.flag
                      }{" "}
                    </Text>
                    <Text style={styles.cuisineBadgeText}>{item.cuisine}</Text>
                  </View>

                  {/* TYPY DAŃ */}
                  {item.dish_type?.map((d: any, index: number) => (
                    <View
                      key={`dish-${index}`}
                      style={[
                        styles.cuisineBadge,
                        { backgroundColor: "rgba(232, 245, 233, 0.3)" },
                      ]}
                    >
                      <Text style={styles.cuisineBadgeText}>
                        {((typeof d === "string" ? d : d.name) || "")
                          .slice(0, 1)
                          .toUpperCase() +
                          (typeof d === "string" ? d : d.name || "").slice(1)}
                      </Text>
                    </View>
                  ))}

                  {/* TYPY Diet */}
                  {item.diet_type?.map((d: any, index: number) => (
                    <View
                      key={`diet-${index}`} // Zmieniony klucz na unikalny
                      style={[
                        styles.cuisineBadge,
                        styles.dietBadge, // Dodany dedykowany styl dla diet
                      ]}
                    >
                      <Text style={styles.cuisineBadgeText}>
                        {((typeof d === "string" ? d : d.name) || "")
                          .slice(0, 1)
                          .toUpperCase() +
                          (typeof d === "string" ? d : d.name || "").slice(1)}
                      </Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </ImageBackground>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={60} color={theme.border} />
            <Text style={{ color: theme.subText, marginTop: 10 }}>
              Brak wyników
            </Text>
          </View>
        }
      />

      {activeTab === "added" && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: primaryColor }]}
          onPress={() => router.push("/addRecipes")}
        >
          <Ionicons name="add" size={35} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
  },
  searchRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 45,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16 },
  filterBtn: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  menuContent: { paddingHorizontal: 20, marginBottom: 10 },
  filterScroll: { marginBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#eee",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: { backgroundColor: "#FF634720", borderColor: "#FF6347" },
  chipText: { fontSize: 12, color: "#666" },
  chipTextActive: { color: "#FF6347", fontWeight: "bold" },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 4,
    marginBottom: 15,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 12 },
  activeTab: {
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabText: { fontWeight: "600", color: "#888" },
  listPadding: { padding: 20, paddingBottom: 100 },
  recipeCard: {
    height: 180,
    borderRadius: 20,
    marginBottom: 15,
    overflow: "hidden",
  },
  cardImage: { borderRadius: 20 },
  gradient: { flex: 1, justifyContent: "flex-end", padding: 15 },
  recipeTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  recipeSub: { color: "#ddd", fontSize: 1 },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 80,
    height: 80,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  emptyState: { alignItems: "center", marginTop: 50 },
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
    fontSize: 12,
    fontWeight: "bold",
  },
  cuisineBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  cuisineBadgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 9, // Nieco większy font (było 8)
    textTransform: "uppercase",
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  topRow: { position: "absolute", top: 12, left: 12 },
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
  statusIconsContainer: {
    position: "absolute",
    top: 12,
    right: 12,
    alignItems: "flex-end",
    gap: 6,
    zIndex: 2,
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  rightTopIcons: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row", // Ikony obok siebie
    gap: 8,
    zIndex: 10,
  },
  statusBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.6)", // Nieco ciemniejsze tło dla lepszej widoczności
    padding: 6,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    // Subtelny cień
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tagsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 6,
  },
  dietBadge: {
    backgroundColor: "rgba(76, 175, 80, 0.4)", // Zielone tło dla diet (półprzezroczyste)
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.6)",
  },
});

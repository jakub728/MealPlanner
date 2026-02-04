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
      return { icon: "earth-outline", color: "#4CAF50", label: "Publiczny" };
    case "pending":
      return { icon: "time-outline", color: "#FF9800", label: "Oczekujący" };
    default:
      return { icon: "lock-closed-outline", color: "#fff", label: "Prywatny" };
  }
};

export default function MyRecipesScreen() {
  const [activeTab, setActiveTab] = useState<"added" | "liked">("added");
  const [search, setSearch] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("najnowsze");
  const [selectedDishes, setSelectedDishes] = useState<string[]>([]);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);

  const { token } = useAuthStore();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

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

  // 2. Logika filtrowania i sortowania (taka sama jak w publicznych)
  const filteredData = useMemo(() => {
    const baseData = (activeTab === "added" ? myRecipes : likedRecipes) || [];
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
      if (sortBy === "a-z") return a.title.localeCompare(b.title);
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });
  }, [
    activeTab,
    myRecipes,
    likedRecipes,
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

  const isLoading = activeTab === "added" ? loadingAdded : loadingLiked;

  // const renderRecipeItem = ({ item }: { item: any }) => {
  //   const statusCfg = getStatusConfig(item.status);

  //   return (
  //     <TouchableOpacity
  //       activeOpacity={0.9}
  //       onPress={() =>
  //         router.push({ pathname: "/recipeDetail", params: { id: item._id } })
  //       }
  //     >
  //       <ImageBackground
  //         source={{ uri: item.imageUrl || "https://via.placeholder.com/400" }}
  //         style={styles.recipeCard}
  //         imageStyle={styles.cardImage}
  //       >
  //         <View style={styles.topRow}>
  //           <View
  //             style={[
  //               styles.statusBadge,
  //               {
  //                 backgroundColor: "rgba(0,0,0,0.6)",
  //                 borderColor: statusCfg.color,
  //               },
  //             ]}
  //           >
  //             <Ionicons
  //               name={statusCfg.icon as any}
  //               size={10}
  //               color={statusCfg.color}
  //             />
  //             <Text style={[styles.statusText, { color: statusCfg.color }]}>
  //               {statusCfg.label}
  //             </Text>
  //           </View>
  //         </View>

  //         <LinearGradient
  //           colors={["transparent", "rgba(0,0,0,0.9)"]}
  //           style={styles.gradient}
  //         >
  //           <View style={styles.cardContent}>
  //             <Text style={styles.recipeTitle} numberOfLines={1}>
  //               {item.title}
  //             </Text>
  //             <Text style={styles.ingredientsPreview} numberOfLines={1}>
  //               {item.cuisine}
  //             </Text>
  //           </View>
  //         </LinearGradient>
  //       </ImageBackground>
  //     </TouchableOpacity>
  //   );
  // };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          {activeTab === "added" ? "Moje przepisy" : "Polubione"}
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
            />
          </View>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              {
                backgroundColor: isMenuOpen
                  ? "#FF6347"
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
        </View>
      </View>

      {/* MENU FILTROWANIA (Rozwijane) */}
      {isMenuOpen && (
        <View style={styles.menuContent}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {DISHES.map((dish) => (
              <TouchableOpacity
                key={dish.value}
                onPress={() => toggleFilter(setSelectedDishes, dish.label)}
                style={[
                  styles.chip,
                  selectedDishes.includes(dish.label) && styles.chipActive,
                ]}
              >
                {dish.type === "mat" ? (
                  <MaterialCommunityIcons
                    name={dish.icon as any}
                    size={18}
                    style={{ textAlign: "center" }}
                    color={
                      selectedDishes.includes(dish.label) ? "#FF6347" : "#666"
                    }
                  />
                ) : (
                  <Ionicons
                    name={dish.icon as any}
                    size={18}
                    style={{ textAlign: "center" }}
                    color={
                      selectedDishes.includes(dish.label) ? "#FF6347" : "#666"
                    }
                  />
                )}
                <Text
                  style={[
                    styles.chipText,
                    selectedDishes.includes(dish.label) &&
                      styles.chipTextActive,
                  ]}
                >
                  {dish.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {DIET_TYPES.map((diet) => (
              <TouchableOpacity
                key={diet.label}
                onPress={() => toggleFilter(setSelectedCuisines, diet.label)}
                style={[
                  styles.chip,
                  selectedCuisines.includes(diet.label) && styles.chipActive,
                ]}
              >
                {diet.type === "mat" ? (
                  <MaterialCommunityIcons
                    name={diet.icon as any}
                    size={18}
                    style={{ textAlign: "center" }}
                    color={
                      selectedDishes.includes(diet.label) ? "#FF6347" : "#666"
                    }
                  />
                ) : (
                  <Ionicons
                    name={diet.icon as any}
                    size={18}
                    style={{ textAlign: "center" }}
                    color={
                      selectedDishes.includes(diet.label) ? "#FF6347" : "#666"
                    }
                  />
                )}
                <Text style={styles.chipText}>{diet.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {CUISINES.map((c) => (
              <TouchableOpacity
                key={c.label}
                onPress={() => toggleFilter(setSelectedCuisines, c.label)}
                style={[
                  styles.chip,
                  selectedCuisines.includes(c.label) && styles.chipActive,
                ]}
              >
                <Text style={styles.chipText}>
                  {c.flag} {c.label}
                </Text>
              </TouchableOpacity>
            ))}
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
              activeTab === "added" && styles.activeTabText,
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
              activeTab === "liked" && styles.activeTabText,
            ]}
          >
            Polubione
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
            onRefresh={activeTab === "added" ? refetchAdded : refetchLiked}
            tintColor="#FF6347"
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
                uri: item.imageUrl || "https://via.placeholder.com/400",
              }}
              style={styles.recipeCard}
              imageStyle={styles.cardImage}
            >
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.8)"]}
                style={styles.gradient}
              >
                <Text style={styles.recipeTitle}>{item.title}</Text>
                <Text style={styles.recipeSub}>
                  {item.cuisine} •{" "}
                  {item.dish_type?.[0]?.name || item.dish_type?.[0] || "Danie"}
                </Text>
              </LinearGradient>
            </ImageBackground>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={60} color={theme.border} />
            <Text style={{ color: theme.subText, marginTop: 10 }}>
              Brak wyników spełniających kryteria.
            </Text>
          </View>
        }
      />

      {activeTab === "added" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/addRecipes")}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10 },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 15 },
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
  activeTabText: { color: "#FF6347" },
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
  recipeSub: { color: "#ddd", fontSize: 12 },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#FF6347",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  emptyState: { alignItems: "center", marginTop: 50 },
});

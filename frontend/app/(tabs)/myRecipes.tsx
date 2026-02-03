import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
  ImageBackground,
} from "react-native";
import { useAuthStore } from "@/store/useAuthStore";
import LoginFirst from "@/components/loginFirst";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "@/constants/Colors";
import { LinearGradient } from "expo-linear-gradient";

const getRecipeSaved = (count: number) => {
  if (count === 1) return "zapisaną recepturę";
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    (lastTwoDigits < 10 || lastTwoDigits >= 20)
  ) {
    return "zapisane receptury";
  }
  return "zapisanych receptur";
};

const getRecipeLiked = (count: number) => {
  if (count === 1) return "polubioną recepturę";
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    (lastTwoDigits < 10 || lastTwoDigits >= 20)
  ) {
    return "polubione receptury";
  }
  return "polubionych receptur";
};

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
  const { token } = useAuthStore();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  // Pobieranie danych
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

  if (!token) return <LoginFirst placeholder=" aby zobaczyć swoje przepisy" />;

  const currentData = (activeTab === "added" ? myRecipes : likedRecipes) || [];
  const isLoading = activeTab === "added" ? loadingAdded : loadingLiked;

  const renderRecipeItem = ({ item }: { item: any }) => {
    const statusCfg = getStatusConfig(item.status);

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
          {/* Status Badge - teraz na samej górze karty */}
          <View style={styles.topRow}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: "rgba(0,0,0,0.6)",
                  borderColor: statusCfg.color,
                },
              ]}
            >
              <Ionicons
                name={statusCfg.icon as any}
                size={10}
                color={statusCfg.color}
              />
              <Text style={[styles.statusText, { color: statusCfg.color }]}>
                {statusCfg.label}
              </Text>
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
              <Text style={styles.ingredientsPreview} numberOfLines={1}>
                {item.ingredients
                  ?.map((ing: any) => ing.name || ing)
                  .join(" • ")}
              </Text>
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
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          {activeTab === "added" ? "Moje przepisy" : "Polubione"}
        </Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>
          Masz {currentData?.length || 0}{" "}
          {activeTab === "added"
            ? getRecipeSaved(currentData?.length || 0)
            : getRecipeLiked(currentData?.length || 0)}
        </Text>
      </View>

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
          onPress={() => setActiveTab("added")}
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
          onPress={() => setActiveTab("liked")}
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

      <FlatList
        data={currentData}
        keyExtractor={(item) => item._id}
        renderItem={renderRecipeItem}
        contentContainerStyle={styles.listPadding}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={activeTab === "added" ? refetchAdded : refetchLiked}
            tintColor="#FF6347"
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={60} color={theme.border} />
              <Text style={[styles.emptyText, { color: theme.subText }]}>
                {activeTab === "added"
                  ? "Nie dodałeś jeszcze przepisów."
                  : "Nie masz polubionych przepisów."}
              </Text>
            </View>
          ) : null
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
  header: { paddingHorizontal: 20, paddingVertical: 15, alignItems: "center" },
  title: { fontSize: 28, fontWeight: "bold" },
  subtitle: { fontSize: 14, marginTop: 4 },
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
  listPadding: { padding: 20, paddingBottom: 120 },
  recipeCard: {
    height: 200,
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  cardImage: { borderRadius: 20 },
  gradient: { flex: 1, justifyContent: "flex-end", padding: 16 },
  cardContent: { width: "100%" },
  topRow: { position: "absolute", top: 12, left: 12 },
  recipeTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 5,
  },
  ingredientsPreview: { fontSize: 13, color: "#e0e0e0", marginTop: 4 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  statusText: { fontSize: 10, fontWeight: "bold", textTransform: "uppercase" },
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
    elevation: 10,
  },
  emptyState: { alignItems: "center", justifyContent: "center", marginTop: 60 },
  emptyText: { marginTop: 10, fontSize: 16 },
});

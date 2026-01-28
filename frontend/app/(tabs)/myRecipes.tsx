import React from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
} from "react-native";
import { useAuthStore } from "@/store/useAuthStore";
import LoginFirst from "@/components/loginFirst";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

const getRecipeNoun = (count: number) => {
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

const getStatusConfig = (status: string) => {
  switch (status) {
    case "public":
      return { icon: "earth-outline", color: "#4CAF50", label: "Publiczny" };
    case "pending":
      return { icon: "time-outline", color: "#FF9800", label: "Oczekujący" };
    default:
      return {
        icon: "lock-closed-outline",
        color: "#9E9E9E",
        label: "Prywatny",
      };
  }
};

export default function MyRecipesScreen() {
  const { token } = useAuthStore((state) => state);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // ROZBUDOWANY MOTYW DLA TEJ STRONY
  const theme = {
    bg: isDark ? "#121212" : "#F8F9FA",
    cardBg: isDark ? "#1E1E1E" : "#fff",
    headerBg: isDark ? "#121212" : "#fff",
    text: isDark ? "#fff" : "#333",
    subText: isDark ? "#aaa" : "#888",
    description: isDark ? "#ccc" : "#666",
    tagBg: isDark ? "rgba(255, 99, 71, 0.15)" : "#FFF5F3",
    border: isDark ? "#333" : "#eee",
    emptyIcon: isDark ? "#333" : "#eee",
  };

  const {
    data: recipes,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["myRecipes"],
    queryFn: async () => {
      const response = await api.get("/recipes/private");
      return response.data;
    },
    enabled: !!token,
  });

  if (!token) {
    return <LoginFirst placeholder=" aby zobaczyć swoje przepisy" />;
  }

  const renderRecipeItem = ({ item }: { item: any }) => {
    const statusCfg = getStatusConfig(item.status);

    return (
      <TouchableOpacity
        style={[styles.recipeCard, { backgroundColor: theme.cardBg }]}
        activeOpacity={0.7}
        onPress={() =>
          router.push({ pathname: "/recipeDetail", params: { id: item._id } })
        }
      >
        <View style={styles.cardContent}>
          <View style={styles.headerRow}>
            <Text
              style={[styles.recipeTitle, { color: theme.text }]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <View
              style={[styles.statusBadge, { borderColor: statusCfg.color }]}
            >
              <Ionicons
                name={statusCfg.icon as any}
                size={12}
                color={statusCfg.color}
              />
              <Text style={[styles.statusText, { color: statusCfg.color }]}>
                {statusCfg.label}
              </Text>
            </View>
          </View>

          <Text
            style={[styles.description, { color: theme.description }]}
            numberOfLines={2}
          >
            {item.description || "Brak opisu..."}
          </Text>

          <View style={styles.footer}>
            <View style={[styles.tag, { backgroundColor: theme.tagBg }]}>
              <Ionicons name="restaurant-outline" size={14} color="#FF6347" />
              <Text style={styles.tagText}>
                {item.ingredients?.length || 0} składników
              </Text>
            </View>
            <View style={[styles.tag, { backgroundColor: theme.tagBg }]}>
              <Ionicons name="list-outline" size={14} color="#FF6347" />
              <Text style={styles.tagText}>
                {item.instructions?.length || 0} kroków
              </Text>
            </View>
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.subText}
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.bg }]}
      edges={["top"]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.headerBg,
            borderBottomColor: theme.border,
            borderBottomWidth: isDark ? 1 : 0,
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.text }]}>Moje przepisy</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>
          Masz {recipes?.length || 0} {getRecipeNoun(recipes?.length || 0)}
        </Text>
      </View>

      <FlatList
        data={recipes}
        keyExtractor={(item) => item._id}
        renderItem={renderRecipeItem}
        contentContainerStyle={styles.listPadding}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isRefetching}
            onRefresh={refetch}
            tintColor="#FF6347"
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="receipt-outline"
                size={60}
                color={theme.emptyIcon}
              />
              <Text style={[styles.emptyText, { color: theme.subText }]}>
                Nie dodałeś jeszcze przepisów.
              </Text>
            </View>
          ) : null
        }
      />

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => router.push("/addRecipes")}
      >
        <Ionicons name="add" size={30} color="#fff" />
        <Text style={styles.fabText}>Dodaj</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 20, alignItems: "center" },
  title: { fontSize: 28, fontWeight: "bold" },
  subtitle: { fontSize: 14, marginTop: 4 },
  listPadding: { padding: 20, paddingBottom: 120 },
  recipeCard: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  recipeTitle: { fontSize: 18, fontWeight: "bold", flex: 1 },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  footer: { flexDirection: "row", gap: 10 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  tagText: { fontSize: 12, color: "#FF6347", fontWeight: "600" },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyText: { marginTop: 10, fontSize: 16 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    marginLeft: 8,
  },
  statusText: { fontSize: 10, fontWeight: "bold", textTransform: "uppercase" },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#FF6347",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 8,
    shadowColor: "#FF6347",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    gap: 4,
  },
  fabText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

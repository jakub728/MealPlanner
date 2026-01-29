import React from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
  Alert,
} from "react-native";
import { useAuthStore } from "@/store/useAuthStore";
import LoginFirst from "@/components/loginFirst";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "@/constants/Colors";

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
  const queryClient = useQueryClient();

  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const isDark = colorScheme === "dark";

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

  // MUTACJA USUWANIA
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/recipes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myRecipes"] });
      Alert.alert("Sukces", "Przepis został usunięty");
    },
    onError: () => {
      Alert.alert("Błąd", "Nie udało się usunąć przepisu");
    },
  });

  const handleDeletePress = (id: string, title: string) => {
    Alert.alert(
      "Usuń przepis",
      `Czy na pewno chcesz trwale usunąć "${title}"?`,
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: () => deleteMutation.mutate(id),
        },
      ],
    );
  };

  if (!token) {
    return <LoginFirst placeholder=" aby zobaczyć swoje przepisy" />;
  }

  const renderRecipeItem = ({ item }: { item: any }) => {
    const statusCfg = getStatusConfig(item.status);

    return (
      <TouchableOpacity
        style={[styles.recipeCard, { backgroundColor: theme.card }]}
        activeOpacity={0.8}
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
            <TouchableOpacity
              style={styles.deleteCircle}
              onPress={() => handleDeletePress(item._id, item.title)}
            >
              <Ionicons name="close" size={12} color="white" />
            </TouchableOpacity>
          </View>

          <Text
            style={[styles.description, { color: theme.subText }]}
            numberOfLines={2}
          >
            {item.description || "Brak opisu..."}
          </Text>

          {/* SEKCJA SKŁADNIKÓW (WIDOCZNA) */}
          <View style={styles.visibleSection}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="restaurant-outline" size={14} color="#FF6347" />
              <Text style={[styles.sectionLabel, { color: theme.text }]}>
                Składniki:
              </Text>
            </View>
            <Text
              style={[styles.sectionContent, { color: theme.subText }]}
              numberOfLines={1}
            >
              {item.ingredients
                ?.map((ing: any) => ing.name || ing)
                .join(" • ") || "Brak danych"}
            </Text>
          </View>

          {/* SEKCJA KROKÓW (WIDOCZNA) */}
          <View style={styles.visibleSection}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="list-outline" size={14} color="#FF6347" />
              <Text style={[styles.sectionLabel, { color: theme.text }]}>
                Przygotowanie:
              </Text>
            </View>
            <Text
              style={[styles.sectionContent, { color: theme.subText }]}
              numberOfLines={2}
            >
              {item.instructions
                ?.map(
                  (inst: any, index: number) =>
                    `${index + 1}. ${inst.text || inst}`,
                )
                .join(" ") || "Brak kroków"}
            </Text>
          </View>

          <View style={styles.footer}>
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
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.subText}
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <View
        style={[
          styles.header,
          {
            borderBottomColor: theme.border,
            borderBottomWidth: isDark ? 0.5 : 0,
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
              <Ionicons name="receipt-outline" size={60} color={theme.border} />
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
    borderRadius: 20,
    marginBottom: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    // Cienie
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  recipeTitle: { fontSize: 18, fontWeight: "bold", flex: 1, marginRight: 10 },
  deleteCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FF3B30", // Intensywny czerwony (iOS style)
    justifyContent: "center",
    alignItems: "center",
    marginTop: -2,
  },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  footer: {
    flexDirection: "row",
    marginTop: 12,
    justifyContent: "flex-start",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  tagText: { fontSize: 11, color: "#FF6347", fontWeight: "700" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  statusText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#FF6347",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 35,
    elevation: 10,
    gap: 6,
  },
  fabText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyText: { marginTop: 10, fontSize: 16 },
  visibleSection: {
    marginTop: 8,
    backgroundColor: "rgba(0,0,0,0.02)", // Bardzo delikatne tło dla kontrastu
    padding: 8,
    borderRadius: 10,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
  sectionContent: {
    fontSize: 12,
    lineHeight: 16,
  },
});

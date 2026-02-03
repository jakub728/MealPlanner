import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  Image,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "@/constants/Colors";

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  // 1. Pobranie przepisu z bazy
  const {
    data: recipe,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["recipe", id],
    queryFn: async () => {
      const response = await api.get(`/recipes/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  // 2. Funkcja zmiany statusuna pending
  const submitMutation = useMutation({
    mutationFn: async () => {
      return await api.patch(`/recipes/${id}`);
    },
    onSuccess: () => {
      alert("Wysłano do weryfikacji!");
      queryClient.invalidateQueries({ queryKey: ["recipe", id] });
    },
    onError: () => alert("Błąd podczas wysyłania."),
  });

  // 3. Funkcja pomocnicza do gwiazdek i ocen
  const renderRating = () => {
    if (!recipe?.note || recipe.note.length === 0) return null;
    const average =
      recipe.note.reduce((a: number, b: number) => a + b, 0) /
      recipe.note.length;

    return (
      <View style={styles.ratingRow}>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Ionicons
              key={s}
              name={s <= Math.round(average) ? "star" : "star-outline"}
              size={18}
              color="#FFD700"
            />
          ))}
        </View>
        <Text style={[styles.ratingText, { color: theme.subText }]}>
          ({average.toFixed(1)}) • {recipe.note.length} ocen
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#FF6347" />
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Nie znaleziono przepisu.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["top"]}
    >
      <Stack.Screen
        options={{
          title: "",
          headerTransparent: true,
          headerTintColor: "#FF6347",
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* FOTO */}
        {recipe.imageUrl ? (
          <Image source={{ uri: recipe.imageUrl }} style={styles.headerImage} />
        ) : (
          <View
            style={[
              styles.headerImagePlaceholder,
              { backgroundColor: theme.card },
            ]}
          >
            <Ionicons
              name="restaurant"
              size={80}
              color="#FF6347"
              opacity={0.3}
            />
          </View>
        )}

        {/* NOTA */}
        <View
          style={[styles.mainContent, { backgroundColor: theme.background }]}
        >
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]}>
              {recipe.title}
            </Text>
            {renderRating()}
            {recipe.cuisine && (
              <View style={styles.cuisineBadge}>
                <Ionicons name="flag-outline" size={14} color="#FF6347" />
                <Text style={styles.cuisineText}>{recipe.cuisine}</Text>
              </View>
            )}
          </View>

          {/* PRZYCISK UPUBLICZNIJ */}
          {recipe.status === "private" && (
            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>
                {submitMutation.isPending
                  ? "Wysyłanie..."
                  : "Udostępnij przepis"}
              </Text>
            </TouchableOpacity>
          )}

          {recipe.status === "pending" && (
            <View style={[styles.pendingInfo, { backgroundColor: theme.card }]}>
              <Text style={{ color: "#FF6347", fontWeight: "bold" }}>
                Przepis oczekuje na weryfikację
              </Text>
            </View>
          )}

          {/* SKŁADNIKI */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="basket" size={22} color="#FF6347" />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Składniki
              </Text>
            </View>
            {recipe.ingredients?.map((ing: any, index: number) => (
              <View
                key={index}
                style={[
                  styles.ingredientCard,
                  { borderBottomColor: theme.border },
                ]}
              >
                <Text style={[styles.ingredientName, { color: theme.text }]}>
                  {ing.name}
                </Text>
                <Text style={styles.ingredientAmount}>
                  {ing.amount} {ing.unit}
                </Text>
              </View>
            ))}
          </View>

          {/* PRZYGOTOWANIE*/}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list" size={22} color="#FF6347" />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Przygotowanie
              </Text>
            </View>
            {recipe.instructions?.map((step: string, index: number) => (
              <View key={index} style={styles.stepContainer}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                </View>
                <Text style={[styles.stepContent, { color: theme.text }]}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
          {/* KOMENTARZE */}
          {recipe.comments && recipe.comments.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={22}
                  color="#FF6347"
                />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Komentarze
                </Text>
              </View>
              {recipe.comments.map((comment: string, index: number) => (
                <View
                  key={index}
                  style={[styles.commentCard, { backgroundColor: theme.card }]}
                >
                  <Text style={[styles.commentText, { color: theme.text }]}>
                    {comment}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerImage: { width: "100%", height: 300 },
  headerImagePlaceholder: {
    width: "100%",
    height: 250,
    justifyContent: "center",
    alignItems: "center",
  },
  mainContent: {
    padding: 20,
    marginTop: -30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    minHeight: 500,
  },
  titleRow: { marginBottom: 10 },
  title: { fontSize: 26, fontWeight: "bold" },
  cuisineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },
  cuisineText: { color: "#FF6347", fontWeight: "600", fontSize: 14 },
  dietContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  dietBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  dietText: { fontSize: 12, fontWeight: "500" },
  descriptionBox: { padding: 15, borderRadius: 15, marginBottom: 25 },
  descriptionText: { fontSize: 15, lineHeight: 22, fontStyle: "italic" },
  section: { marginBottom: 30 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 20, fontWeight: "bold" },
  ingredientCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  ingredientName: { fontSize: 16 },
  ingredientAmount: { fontSize: 16, fontWeight: "bold", color: "#FF6347" },
  stepContainer: { flexDirection: "row", gap: 15, marginBottom: 20 },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FF6347",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumber: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  stepContent: { flex: 1, fontSize: 16, lineHeight: 24 },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 5,
  },
  stars: { flexDirection: "row", gap: 2 },
  ratingText: { fontSize: 14, fontWeight: "500" },
  submitButton: {
    backgroundColor: "#FF6347",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    borderRadius: 15,
    gap: 10,
    marginVertical: 15,
  },
  submitButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  pendingInfo: {
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
    marginVertical: 15,
    borderWidth: 1,
    borderColor: "#FF6347",
  },
  commentCard: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  commentText: { fontSize: 14, lineHeight: 20 },
});

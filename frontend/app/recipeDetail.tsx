import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

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

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6347" />
      </View>
    );
  }
  console.log(recipe.ingredients);

  if (error || !recipe) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Nie udało się załadować przepisu.</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Wróć do listy</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Konfiguracja nagłówka */}
        <Stack.Screen
          options={{
            title: "Szczegóły",
            headerTitleStyle: { fontWeight: "bold" },
            headerTintColor: "#FF6347",
          }}
        />

        <View style={styles.headerImagePlaceholder}>
          <Ionicons name="restaurant" size={80} color="#FF6347" opacity={0.2} />
        </View>

        <View style={styles.mainContent}>
          <Text style={styles.title}>{recipe.title}</Text>

          {recipe.description && (
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionText}>{recipe.description}</Text>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="basket" size={22} color="#FF6347" />
              <Text style={styles.sectionTitle}>Składniki</Text>
            </View>
            {recipe.ingredients?.map((ing: any, index: number) => (
              <View key={index} style={styles.ingredientCard}>
                <Text style={styles.ingredientName}>{ing.name}</Text>
                <Text style={styles.ingredientAmount}>
                  {ing.amount} {ing.unit}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list" size={22} color="#FF6347" />
              <Text style={styles.sectionTitle}>Przygotowanie</Text>
            </View>
            {recipe.instructions?.map((step: string, index: number) => (
              <View key={index} style={styles.stepContainer}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                </View>
                <Text style={styles.stepContent}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  headerImagePlaceholder: {
    height: 150,
    backgroundColor: "#FFF5F3",
    justifyContent: "center",
    alignItems: "center",
  },
  mainContent: {
    padding: 20,
    marginTop: -20,
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#333", marginBottom: 15 },
  descriptionBox: {
    backgroundColor: "#F8F9FA",
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
  },
  descriptionText: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
    fontStyle: "italic",
  },
  section: { marginBottom: 30 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  ingredientCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  ingredientName: { fontSize: 16, color: "#444" },
  ingredientAmount: { fontSize: 16, fontWeight: "bold", color: "#FF6347" },
  stepContainer: { flexDirection: "row", gap: 15, marginBottom: 20 },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FF6347",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  stepNumber: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  stepContent: { flex: 1, fontSize: 16, color: "#444", lineHeight: 24 },
  errorText: { fontSize: 16, color: "#666", marginBottom: 20 },
  backButton: { backgroundColor: "#FF6347", padding: 12, borderRadius: 8 },
  backButtonText: { color: "#fff", fontWeight: "bold" },
});

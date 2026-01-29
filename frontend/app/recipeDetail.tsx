import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "@/constants/Colors";

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const isDark = colorScheme === "dark";

  const {
    data: recipe,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["recipe", id],
    queryFn: async () => {
      const response = await api.get(`/recipes/${id}`);
      // Zabezpieczenie na wypadek struktury { recipe: {} }
      return response.data.recipe || response.data;
    },
    enabled: !!id,
  });

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
        <Text style={[styles.errorText, { color: theme.subText }]}>
          Nie udało się załadować przepisu.
        </Text>
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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["top"]}
    >
      <Stack.Screen
        options={{
          title: "Szczegóły",
          headerTitleStyle: { fontWeight: "bold", color: theme.text },
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: "#FF6347",
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.headerImagePlaceholder,
            { backgroundColor: isDark ? "#1E1E1E" : "#FFF5F3" },
          ]}
        >
          <Ionicons name="restaurant" size={80} color="#FF6347" opacity={0.2} />
        </View>

        <View
          style={[styles.mainContent, { backgroundColor: theme.background }]}
        >
          <Text style={[styles.title, { color: theme.text }]}>
            {recipe.title}
          </Text>

          {recipe.description && (
            <View
              style={[styles.descriptionBox, { backgroundColor: theme.card }]}
            >
              <Text style={[styles.descriptionText, { color: theme.subText }]}>
                {recipe.description}
              </Text>
            </View>
          )}

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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  headerImagePlaceholder: {
    height: 150,
    justifyContent: "center",
    alignItems: "center",
  },
  mainContent: {
    padding: 20,
    marginTop: -20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 15 },
  descriptionBox: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
  },
  descriptionText: {
    fontSize: 15,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FF6347",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  stepNumber: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  stepContent: { flex: 1, fontSize: 16, lineHeight: 24 },
  errorText: { fontSize: 16, marginBottom: 20 },
  backButton: { backgroundColor: "#FF6347", padding: 12, borderRadius: 8 },
  backButtonText: { color: "#fff", fontWeight: "bold" },
});

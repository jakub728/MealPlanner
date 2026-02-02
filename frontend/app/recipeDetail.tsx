import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  useColorScheme,
  Image,
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
        {/* Prawdziwe zdjęcie z bazy */}
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

        <View
          style={[styles.mainContent, { backgroundColor: theme.background }]}
        >
          {/* Tytuł i Kuchnia */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>
                {recipe.title}
              </Text>
              {recipe.cuisine && (
                <View style={styles.cuisineBadge}>
                  <Ionicons name="flag-outline" size={14} color="#FF6347" />
                  <Text style={styles.cuisineText}>{recipe.cuisine}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Diety (diet_type) */}
          {recipe.diet_type && recipe.diet_type.length > 0 && (
            <View style={styles.dietContainer}>
              {recipe.diet_type.map((diet: string, i: number) => (
                <View
                  key={i}
                  style={[styles.dietBadge, { backgroundColor: theme.card }]}
                >
                  <Text style={[styles.dietText, { color: theme.subText }]}>
                    {diet}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {recipe.description && (
            <View
              style={[styles.descriptionBox, { backgroundColor: theme.card }]}
            >
              <Text style={[styles.descriptionText, { color: theme.subText }]}>
                {recipe.description}
              </Text>
            </View>
          )}

          {/* Składniki */}
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

          {/* Instrukcje */}
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
});

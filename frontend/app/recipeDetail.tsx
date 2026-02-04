import React from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/api/client";
import Colors from "@/constants/Colors";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "expo-router";

// --- MAPOWANIE DANYCH (Zachowane bez zmian) ---
const DISHES = [
  { label: "Szybkie", value: "szybkie", icon: "flash-outline", type: "ion" },
  {
    label: "Śniadanie",
    value: "śniadanie",
    icon: "sunny-outline",
    type: "ion",
  },
  {
    label: "Przekąska",
    value: "przekąska",
    icon: "fast-food-outline",
    type: "ion",
  },
  { label: "Zupa", value: "zupa", icon: "water-outline", type: "ion" },
  { label: "Sałatka", value: "sałatka", icon: "leaf-outline", type: "ion" },
  { label: "Obiad", value: "obiad", icon: "restaurant-outline", type: "ion" },
  {
    label: "Danie jednogarnkowe",
    value: "danie jednogarnkowe",
    icon: "pot-steam-outline",
    type: "mat",
  },
  { label: "Makaron", value: "makaron", icon: "bowl-mix-outline", type: "mat" },
  {
    label: "Lunchbox",
    value: "lunchbox",
    icon: "briefcase-outline",
    type: "ion",
  },
  { label: "Deser", value: "deser", icon: "ice-cream-outline", type: "ion" },
  { label: "Kolacja", value: "kolacja", icon: "moon-outline", type: "ion" },
  { label: "Napój", value: "napój", icon: "cafe-outline", type: "ion" },
  { label: "Drink", value: "drink", icon: "wine-outline", type: "ion" },
  {
    label: "Pieczywo",
    value: "pieczywo",
    icon: "bread-slice-outline",
    type: "mat",
  },
  {
    label: "Przetwory",
    value: "przetwory",
    icon: "archive-outline",
    type: "ion",
  },
  { label: "Sos", value: "sos", icon: "color-fill-outline", type: "ion" },
];

const CUISINES = [
  { label: "Polska", flag: "🇵🇱" },
  { label: "Włoska", flag: "🇮🇹" },
  { label: "Turecka", flag: "🇹🇷" },
  { label: "Amerykańska", flag: "🇺🇸" },
  { label: "Chińska", flag: "🇨🇳" },
  { label: "Meksykańska", flag: "🇲🇽" },
  { label: "Hiszpańska", flag: "🇪🇸" },
  { label: "Indyjska", flag: "🇮🇳" },
  { label: "Ukraińska", flag: "🇺🇦" },
  { label: "Japońska", flag: "🇯🇵" },
  { label: "Grecka", flag: "🇬🇷" },
  { label: "Tajska", flag: "🇹🇭" },
  { label: "Wietnamska", flag: "🇻🇳" },
  { label: "Francuska", flag: "🇫🇷" },
  { label: "Gruzińska", flag: "🇬🇪" },
  { label: "Skandynawska", flag: "🇸🇪" },
  { label: "Pakistańska", flag: "🇵🇰" },
  { label: "Arabska", flag: "🇸🇦" },
  { label: "Żydowska", flag: "🇮🇱" },
  { label: "Inna", flag: "🌏" },
];

const DIET_TYPES = [
  { label: "Wegetariańska", icon: "leaf-outline", type: "ion" },
  { label: "Wegańska", icon: "heart-outline", type: "ion" },
  { label: "Bezglutenowa", icon: "barley-off", type: "mat" },
  { label: "Keto", icon: "fire", type: "mat" },
  { label: "Low Carb", icon: "speedometer-slow", type: "mat" },
  { label: "Białkowa", icon: "arm-flex-outline", type: "mat" },
  { label: "Bez laktozy", icon: "cup-off-outline", type: "mat" },
  { label: "Paleo", icon: "bone", type: "mat" },
  { label: "Niski IG", icon: "trending-down", type: "mat" },
];

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const queryClient = useQueryClient();

  const { data: recipe, isLoading } = useQuery({
    queryKey: ["recipe", id],
    queryFn: async () => {
      const response = await api.get(`/recipes/${id}`);
      return response.data;
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => api.patch(`/recipes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe", id] });
      Alert.alert("Sukces", "Przepis wysłany do weryfikacji!");
    },
    onError: (error: any) =>
      Alert.alert("Błąd", error.response?.data?.message || "Błąd sieci"),
  });

  const likeMutation = useMutation({
    mutationFn: () => api.post("/recipes/like", { recipeId: id }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe", id] });
      queryClient.invalidateQueries({ queryKey: ["recipes_liked"] });
      Alert.alert("Sukces", "Przepis polubiony!");
    },
    onError: (error) => {
      console.error("Błąd podczas polubienia przepisu:", error);
    },
  });

  if (isLoading)
    return <ActivityIndicator style={{ flex: 1 }} color={theme.tint} />;
  if (!recipe) return null;

  const isOwner = recipe?.author?._id === user?.id;
  const isPublic = recipe?.status === "public";
  const isPrivate = recipe?.status === "private";

  const getRatingData = () => {
    const notes = recipe?.note || [];
    const count = notes.length;
    const average =
      count > 0
        ? notes.reduce((acc: number, curr: number) => acc + curr, 0) / count
        : 0;
    return { average, count };
  };

  const { average, count } = getRatingData();
  const cuisineInfo = CUISINES.find((c) => c.label === recipe.cuisine);

  const renderTagWithIcon = (label: string, category: "dish" | "diet") => {
    const list = category === "dish" ? DISHES : DIET_TYPES;
    const item = list.find((i: any) => {
      const searchLabel = label.toLowerCase();
      return (
        i.label.toLowerCase() === searchLabel ||
        (i.value && i.value.toLowerCase() === searchLabel)
      );
    });

    // Kolor ikon w tagach: dla diet zielony, dla reszty subText z Twojego obiektu
    const iconColor = category === "diet" ? "#4CAF50" : theme.subText;

    if (!item)
      return (
        <Text style={[styles.tagText, { color: theme.text }]}>{label}</Text>
      );

    return (
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {item.type === "ion" ? (
          <Ionicons
            name={item.icon as any}
            size={16}
            color={iconColor}
            style={{ marginRight: 6 }}
          />
        ) : (
          <MaterialCommunityIcons
            name={item.icon as any}
            size={16}
            color={iconColor}
            style={{ marginRight: 6 }}
          />
        )}
        <Text
          style={[
            styles.tagText,
            { color: category === "diet" ? "#4CAF50" : theme.text },
          ]}
        >
          {item.label}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: "",
          headerTransparent: true,
          headerTintColor: "#fff",
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* NAGŁÓWEK ZDJĘCIE */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: recipe.imageUrl }} style={styles.headerImage} />
          <View style={styles.imageOverlay} />
          <View style={styles.imageContent}>
            <View style={styles.badgeRow}>
              {recipe.cuisine && (
                <View
                  style={[styles.cuisineBadge, { backgroundColor: theme.tint }]}
                >
                  <Text style={{ fontSize: 14 }}>{cuisineInfo?.flag} </Text>
                  <Text style={styles.cuisineBadgeText}>{recipe.cuisine}</Text>
                </View>
              )}
              {isOwner && (
                <Text
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: "rgba(0,0,0,0.4)",
                      borderColor: theme.border,
                    },
                  ]}
                >
                  {recipe.status === "public" ? "Publiczny" : "Prywatny"}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* GŁÓWNA TREŚĆ */}
        <View
          style={[styles.mainContent, { backgroundColor: theme.background }]}
        >
          <View style={styles.headerSection}>
            <Text style={[styles.title, { color: theme.text }]}>
              {recipe.title}
            </Text>
            {isPublic && (
              <View style={styles.ratingRow}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {[1, 2, 3, 4, 5].map((index) => {
                    const fill = Math.max(
                      0,
                      Math.min(1, average - (index - 1)),
                    );
                    return (
                      <View key={index} style={{ width: 18, height: 18 }}>
                        <Ionicons
                          name="star"
                          size={18}
                          color={colorScheme === "dark" ? "#333" : "#E0E0E0"}
                        />
                        <View
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: `${fill * 100}%`,
                            overflow: "hidden",
                          }}
                        >
                          <Ionicons name="star" size={18} color="#FFD700" />
                        </View>
                      </View>
                    );
                  })}
                </View>
                <Text style={[styles.ratingText, { color: theme.subText }]}>
                  {average > 0
                    ? `${average.toFixed(1)} (${count})`
                    : "Brak ocen"}
                </Text>
              </View>
            )}
          </View>

          {/* TAGI */}
          <View style={styles.tagContainer}>
            {recipe.dish_type?.map((type: string) => (
              <View
                key={type}
                style={[
                  styles.tag,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    borderWidth: 1,
                  },
                ]}
              >
                {renderTagWithIcon(type, "dish")}
              </View>
            ))}
            {recipe.diet_type?.map((diet: string) => (
              <View
                key={diet}
                style={[
                  styles.tag,
                  {
                    backgroundColor:
                      colorScheme === "dark" ? "#1B2E1D" : "#E8F5E9",
                  },
                ]}
              >
                {renderTagWithIcon(diet, "diet")}
              </View>
            ))}
          </View>

          {/* SEKCJA SKŁADNIKI */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="restaurant-outline"
                size={20}
                color={theme.tint}
              />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Składniki
              </Text>
            </View>
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              {recipe.ingredients?.map((item: any, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.ingredientRow,
                    index !== recipe.ingredients.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.ingredientText, { color: theme.text }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.amountText, { color: theme.tint }]}>
                    {item.amount} {item.unit}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* SEKCJA PRZYGOTOWANIE */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list-outline" size={20} color={theme.tint} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Przygotowanie
              </Text>
            </View>
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Text style={[styles.instructionsText, { color: theme.text }]}>
                {recipe.instructions}
              </Text>
            </View>
          </View>

          {/* KOMENTARZE */}
          {isPublic && (
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.text, marginBottom: 10 },
                ]}
              >
                Komentarze
              </Text>
              <Text style={{ color: theme.subText, fontStyle: "italic" }}>
                {isOwner
                  ? "Nie możesz dodać komentarza do swojego przepisu"
                  : "Brak komentarzy. Bądź pierwszy!"}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB - PRZYCISKI AKCJI */}
      <View style={[styles.fabContainer, { bottom: insets.bottom + 20 }]}>
        {!isOwner && isPublic && (
          <TouchableOpacity
            style={[styles.likeFab, { backgroundColor: theme.card }]}
            onPress={() => likeMutation.mutate()}
          >
            <View
              style={[
                styles.likeBadge,
                {
                  backgroundColor:
                    colorScheme === "dark" ? "#2A1815" : "#FFF0F0",
                },
              ]}
            >
              <Ionicons name="heart" size={24} color={theme.tint} />
            </View>
            <Text style={[styles.likeText, { color: theme.text }]}>Polub</Text>
          </TouchableOpacity>
        )}

        <View style={styles.ownerActions}>
          {isOwner && isPrivate && (
            <TouchableOpacity
              style={[
                styles.fab,
                styles.fabSecondary,
                { backgroundColor: theme.card, borderColor: theme.tint },
              ]}
              onPress={() =>
                router.push({ pathname: "/editRecipes", params: { id } })
              }
            >
              <Ionicons name="pencil-sharp" size={18} color={theme.tint} />
              <Text style={[styles.fabText, { color: theme.tint }]}>
                Edytuj
              </Text>
            </TouchableOpacity>
          )}

          {isOwner && isPrivate && (
            <TouchableOpacity
              style={[styles.fab, { backgroundColor: theme.tint }]}
              onPress={() => publishMutation.mutate()}
            >
              <Ionicons name="globe-outline" size={18} color="#fff" />
              <Text style={[styles.fabText, { color: "#fff" }]}>
                Upublicznij
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  imageContainer: { width: "100%", height: 350 },
  headerImage: { width: "100%", height: "100%" },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  imageContent: { position: "absolute", bottom: 50, left: 24, right: 24 },
  badgeRow: { flexDirection: "row", gap: 8 },
  cuisineBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  cuisineBadgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
    textTransform: "uppercase",
  },
  statusBadge: {
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    fontSize: 12,
    borderWidth: 1,
  },
  mainContent: {
    marginTop: -35,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: 24,
  },
  headerSection: { marginBottom: 20 },
  title: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  ratingText: { fontSize: 14, marginLeft: 6 },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  tagText: { fontSize: 13, fontWeight: "700" },
  section: { marginBottom: 30 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 20, fontWeight: "800" },
  card: {
    padding: 20,
    borderRadius: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  ingredientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  ingredientText: { fontSize: 16, fontWeight: "500" },
  amountText: { fontSize: 16, fontWeight: "bold" },
  instructionsText: { fontSize: 16, lineHeight: 26 },
  fabContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  likeFab: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 15,
    borderRadius: 40,
    height: 50,
    elevation: 8,
    shadowOpacity: 0.2,
  },
  likeBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  likeText: { marginLeft: 8, fontWeight: "800", fontSize: 16 },
  ownerActions: { flexDirection: "row", gap: 10 },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 15,
    elevation: 4,
    gap: 6,
  },
  fabSecondary: { borderWidth: 1.5 },
  fabText: { fontWeight: "700", fontSize: 14 },
});

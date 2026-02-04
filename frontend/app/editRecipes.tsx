import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import Colors from "@/constants/Colors";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { CUISINES, DISHES, DIET_TYPES, UNITS } from "@/constants/Filters";

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [selectedIngredients, setSelectedIngredients] = useState<any[]>([]);
  const [ingredientName, setIngredientName] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("g");
  const [showUnits, setShowUnits] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [selectedDish, setSelectedDish] = useState<string[]>([]);
  const [selectedCuisine, setSelectedCuisine] = useState("");
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    dish: false,
    cuisine: false,
    diet: false,
  });

  const { data: recipe, isLoading } = useQuery({
    queryKey: ["recipe", id],
    queryFn: async () => {
      const response = await api.get(`/recipes/${id}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (recipe) {
      setTitle(recipe.title);
      setInstructions(recipe.instructions);
      setSelectedIngredients(recipe.ingredients || []);
      setSelectedCuisine(recipe.cuisine || "");
      setImage(recipe.imageUrl);

      try {
        setSelectedDish(
          typeof recipe.dish_type === "string"
            ? JSON.parse(recipe.dish_type)
            : recipe.dish_type || [],
        );
        setSelectedDiets(
          typeof recipe.diet_type === "string"
            ? JSON.parse(recipe.diet_type)
            : recipe.diet_type || [],
        );
      } catch (e) {
        setSelectedDish(recipe.dish_type || []);
        setSelectedDiets(recipe.diet_type || []);
      }
    }
  }, [recipe]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleDish = (dishValue: string) => {
    setSelectedDish((prev) =>
      prev.includes(dishValue)
        ? prev.filter((d) => d !== dishValue)
        : [...prev, dishValue],
    );
  };

  const toggleDiet = (dietLabel: string) => {
    setSelectedDiets((prev) =>
      prev.includes(dietLabel)
        ? prev.filter((d) => d !== dietLabel)
        : [...prev, dietLabel],
    );
  };

  const addIngredientLocally = () => {
    const parsedAmount = parseFloat(amount);
    if (!ingredientName.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Błąd", "Podaj poprawną nazwę i ilość");
      return;
    }
    setSelectedIngredients([
      ...selectedIngredients,
      { name: ingredientName.trim(), amount: parsedAmount, unit },
    ]);
    setIngredientName("");
    setAmount("");
  };

  const mutation = useMutation({
    mutationFn: (formData: FormData) =>
      api.put(`/recipes/edit/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe", id] });
      queryClient.invalidateQueries({ queryKey: ["myRecipes"] });
      Alert.alert("Sukces", "Przepis został zaktualizowany!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (error: any) =>
      Alert.alert("Błąd", error.response?.data?.message || "Błąd zapisu"),
  });

  const handleUpdateRecipe = () => {
    if (!title.trim()) {
      Alert.alert("Błąd", "Tytuł nie może być pusty");
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("instructions", instructions.trim());
    formData.append("cuisine", selectedCuisine);
    formData.append("ingredients", JSON.stringify(selectedIngredients));
    formData.append("dish_type", JSON.stringify(selectedDish));
    formData.append("diet_type", JSON.stringify(selectedDiets));

    if (image && (image.startsWith("file") || image.startsWith("content"))) {
      formData.append("image", {
        uri: image,
        name: "photo.jpg",
        type: "image/jpeg",
      } as any);
    }

    mutation.mutate(formData);
  };

  const renderIcon = (item: any, isSelected: boolean) => {
    const color = isSelected ? "#fff" : theme.text;
    const IconComponent =
      item.type === "mat" ? MaterialCommunityIcons : Ionicons;
    return (
      <IconComponent
        name={item.icon as any}
        size={18}
        color={color}
        style={{ marginRight: 6 }}
      />
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6347" />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top", "left", "right", "bottom"]}
    >
      <Stack.Screen options={{ title: "Edytuj przepis" }} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={[styles.label, { color: theme.text }]}>Tytuł:</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBg,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          value={title}
          onChangeText={setTitle}
        />

        {/* ZDJĘCIE */}
        <View style={styles.imageSection}>
          {!image ? (
            <TouchableOpacity
              onPress={async () => {
                let result = await ImagePicker.launchImageLibraryAsync({
                  allowsEditing: true,
                  aspect: [4, 3],
                  quality: 1,
                });
                if (!result.canceled) setImage(result.assets[0].uri);
              }}
              style={[
                styles.imagePicker,
                { backgroundColor: theme.inputBg, borderColor: theme.tint },
              ]}
            >
              <Text style={{ color: theme.tint, fontWeight: "bold" }}>
                + Zmień zdjęcie
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.previewContainer}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setImage(null)}
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>X</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* SKŁADNIKI */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.label, { color: theme.text }]}>Składniki:</Text>
          <View style={styles.row}>
            <TextInput
              style={[
                styles.input,
                {
                  flex: 2,
                  marginBottom: 0,
                  backgroundColor: theme.inputBg,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Nazwa"
              placeholderTextColor={theme.placeholder}
              value={ingredientName}
              onChangeText={setIngredientName}
            />
            <TextInput
              style={[
                styles.input,
                {
                  flex: 1,
                  marginBottom: 0,
                  backgroundColor: theme.inputBg,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Ilość"
              placeholderTextColor={theme.placeholder}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <TouchableOpacity
              style={[
                styles.unitButton,
                { backgroundColor: theme.inputBg, borderColor: theme.border },
              ]}
              onPress={() => setShowUnits(!showUnits)}
            >
              <Text style={{ color: theme.text }}>{unit}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={addIngredientLocally}
              style={[styles.miniButton, { backgroundColor: "#4CAF50" }]}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>+</Text>
            </TouchableOpacity>
          </View>
          {showUnits && (
            <View
              style={[
                styles.unitsDropdown,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={styles.unitItem}
                  onPress={() => {
                    setUnit(u);
                    setShowUnits(false);
                  }}
                >
                  <Text style={{ color: theme.text }}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={{ marginTop: 10 }}>
            {selectedIngredients.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.addedItem,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                  },
                ]}
              >
                <Text style={{ color: theme.text }}>
                  • {item.name} ({item.amount}
                  {item.unit})
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setSelectedIngredients(
                      selectedIngredients.filter((_, i) => i !== index),
                    )
                  }
                >
                  <Text style={{ color: theme.tint, fontWeight: "600" }}>
                    Usuń
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* INSTRUKCJE */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.label, { color: theme.text }]}>Opis:</Text>
          <TextInput
            style={[
              styles.input,
              {
                height: 120,
                backgroundColor: theme.inputBg,
                borderColor: theme.border,
                color: theme.text,
                textAlignVertical: "top",
              },
            ]}
            placeholder="Opis..."
            placeholderTextColor={theme.placeholder}
            multiline
            value={instructions}
            onChangeText={setInstructions}
          />
        </View>

        {/* --- SEKCJE ROZWIJANE --- */}

        {/* RODZAJ KUCHNI */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection("cuisine")}
          >
            <Text
              style={[styles.label, { color: theme.text, marginBottom: 0 }]}
            >
              Kuchnia:{" "}
              {selectedCuisine
                ? `${CUISINES.find((c) => c.label === selectedCuisine)?.flag || ""} ${selectedCuisine}`
                : "?"}
            </Text>
            <Ionicons
              name={expandedSections.cuisine ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.text}
            />
          </TouchableOpacity>

          {expandedSections.cuisine && (
            <View style={[styles.chipContainer, { marginTop: 15 }]}>
              {CUISINES.map((c) => {
                const isSel = selectedCuisine === c.label;
                return (
                  <TouchableOpacity
                    key={c.label}
                    onPress={() => setSelectedCuisine(isSel ? "" : c.label)}
                    style={[
                      styles.chip,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.inputBg,
                      },
                      isSel && {
                        backgroundColor: theme.tint,
                        borderColor: theme.tint,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 18, marginRight: 6 }}>
                      {c.flag}
                    </Text>
                    <Text
                      style={[
                        styles.chipText,
                        { color: theme.text },
                        isSel && { color: "#fff", fontWeight: "bold" },
                      ]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* TYP DANIA */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection("dish")}
          >
            <Text
              style={[styles.label, { color: theme.text, marginBottom: 0 }]}
            >
              Typ dania ({selectedDish.length})
            </Text>
            <Ionicons
              name={expandedSections.dish ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.text}
            />
          </TouchableOpacity>
          {expandedSections.dish && (
            <View style={[styles.chipContainer, { marginTop: 15 }]}>
              {DISHES.map((d) => {
                const isSel = selectedDish.includes(d.value);
                return (
                  <TouchableOpacity
                    key={d.value}
                    onPress={() => toggleDish(d.value)}
                    style={[
                      styles.chip,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.inputBg,
                      },
                      isSel && {
                        backgroundColor: theme.tint,
                        borderColor: theme.tint,
                      },
                    ]}
                  >
                    {renderIcon(d, isSel)}
                    <Text
                      style={[
                        styles.chipText,
                        { color: theme.text },
                        isSel && { color: "#fff", fontWeight: "bold" },
                      ]}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* TYP DIETY */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection("diet")}
          >
            <Text
              style={[styles.label, { color: theme.text, marginBottom: 0 }]}
            >
              Typ diety ({selectedDiets.length})
            </Text>
            <Ionicons
              name={expandedSections.diet ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.text}
            />
          </TouchableOpacity>

          {expandedSections.diet && (
            <View style={[styles.chipContainer, { marginTop: 15 }]}>
              {DIET_TYPES.map((dt) => {
                const isSel = selectedDiets.includes(dt.label);
                return (
                  <TouchableOpacity
                    key={dt.label}
                    onPress={() => toggleDiet(dt.label)}
                    style={[
                      styles.chip,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.inputBg,
                      },
                      isSel && {
                        backgroundColor: theme.tint,
                        borderColor: theme.tint,
                      },
                    ]}
                  >
                    {renderIcon(dt, isSel)}
                    <Text
                      style={[
                        styles.chipText,
                        { color: theme.text },
                        isSel && { color: "#fff", fontWeight: "bold" },
                      ]}
                    >
                      {dt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.tint }]}
          onPress={handleUpdateRecipe}
          disabled={mutation.isPending}
        >
          <Text style={styles.buttonText}>
            {mutation.isPending ? "Zapisywanie..." : "Zapisz zmiany"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 20, marginTop: 10 },
  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
    fontSize: 15,
  },
  section: { padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  miniButton: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  addedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 12,
  },
  unitButton: {
    height: 45,
    width: 60,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  unitsDropdown: {
    position: "absolute",
    top: 95,
    width: 115,
    right: 15,
    borderWidth: 1,
    borderRadius: 12,
    zIndex: 100,
    elevation: 5,
  },
  unitItem: { padding: 14, alignItems: "center" },
  imagePicker: {
    padding: 25,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
  },
  imageSection: { marginBottom: 20 },
  previewContainer: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
  },
  previewImage: { width: "100%", height: "100%" },
  removeImageButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "red",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  chipText: { fontSize: 13 },
  button: {
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

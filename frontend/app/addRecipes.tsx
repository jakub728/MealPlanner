import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuthStore } from "@/store/useAuthStore";
import LoginFirst from "@/components/loginFirst";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { DISHES, CUISINES, DIET_TYPES, UNITS } from "@/constants/Filters";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useThemeStore } from "@/store/useThemeStore";

export default function AddRecipesScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState<string>("");
  const [selectedIngredients, setSelectedIngredients] = useState<any[]>([]);
  const [ingredientName, setIngredientName] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("g");
  const [showUnits, setShowUnits] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  // Stany wyborów
  const [selectedDish, setSelectedDish] = useState<string[]>([]);
  const [selectedCuisine, setSelectedCuisine] = useState<string>("");
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);

  // Stan rozwijania sekcji
  const [expandedSections, setExpandedSections] = useState({
    dish: false,
    cuisine: false,
    diet: false,
  });

  const queryClient = useQueryClient();
  const { token } = useAuthStore((state) => state);
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { primaryColor } = useThemeStore();

  // Helper do renderowania ikon
  const renderIcon = (item: any, isSelected: boolean) => {
    const color = isSelected
      ? "#fff"
      : item.type === "mat" && item.icon.includes("flag")
        ? primaryColor
        : theme.text;

    if (item.type === "mat") {
      return (
        <MaterialCommunityIcons
          name={item.icon as any}
          size={18}
          color={color}
          style={{ marginRight: 6 }}
        />
      );
    }
    return (
      <Ionicons
        name={item.icon as any}
        size={18}
        color={color}
        style={{ marginRight: 6 }}
      />
    );
  };

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
      api.post("/recipes/add", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: () => {
      setTitle("");
      setInstructions("");
      setSelectedIngredients([]);
      setImage(null);
      setSelectedDish([]);
      setSelectedDiets([]);
      setSelectedCuisine("");
      queryClient.invalidateQueries({ queryKey: ["myRecipes"] });
      Alert.alert("Sukces", "Przepis został dodany!", [
        {
          text: "OK",
          onPress: () => router.replace("/myRecipes"),
        },
      ]);
    },
    onError: (error: any) =>
      Alert.alert("Błąd", error.response?.data?.message || "Błąd serwera"),
  });

  const handleAddRecipe = () => {
    if (
      !title.trim() ||
      selectedIngredients.length === 0 ||
      instructions.trim().length < 10 ||
      !image ||
      selectedDish.length < 1
    ) {
      Alert.alert(
        "Błąd",
        "Uzupełnij wymagane pola (tytuł, zdjęcie, składniki, instrukcje, typ dania)",
      );
      return;
    }
    const formData = new FormData();
    // 1. ZWYKŁE STRINGI (zostawiamy jak są)
    formData.append("title", title.trim());
    formData.append("instructions", instructions.trim());
    formData.append("cuisine", selectedCuisine);
    formData.append("status", "private");

    // 2. TABLICE I OBIEKTY (muszą być zstringifikowane, backend je sparsuje)
    formData.append("ingredients", JSON.stringify(selectedIngredients));
    formData.append("dish_type", JSON.stringify(selectedDish));
    formData.append("diet_type", JSON.stringify(selectedDiets));

    formData.append("image", {
      uri: image,
      name: "photo.jpg",
      type: "image/jpeg",
    } as any);

    mutation.mutate(formData);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Błąd", "Brak uprawnień!");
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      const manipResult = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
      );
      setImage(manipResult.uri);
    }
  };

  if (!token) return <LoginFirst />;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Text style={[styles.header, { color: theme.text }]}>
          Dodaj nowy przepis
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          placeholder="Tytuł przepisu"
          placeholderTextColor={theme.placeholder}
          value={title}
          onChangeText={setTitle}
        />

        {/* ZDJĘCIE */}
        <View style={styles.imageSection}>
          {!image ? (
            <TouchableOpacity
              onPress={pickImage}
              style={[
                styles.imagePicker,
                { backgroundColor: theme.inputBg, borderColor: primaryColor },
              ]}
            >
              <Text style={[{ fontWeight: "bold" }, { color: primaryColor }]}>
                + Dodaj zdjęcie
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
                        backgroundColor: primaryColor,
                        borderColor: primaryColor,
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
                        backgroundColor: primaryColor,
                        borderColor: primaryColor,
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
                        backgroundColor: primaryColor,
                        borderColor: primaryColor,
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
          style={[
            styles.button,
            { backgroundColor: primaryColor },
            mutation.isPending && { backgroundColor: theme.subText },
          ]}
          onPress={handleAddRecipe}
          disabled={mutation.isPending}
        >
          <Text style={styles.buttonText}>
            {mutation.isPending ? "Wysyłanie..." : "Zapisz przepis"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
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

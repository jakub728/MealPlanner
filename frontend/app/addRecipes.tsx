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
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuthStore } from "@/store/useAuthStore";
import LoginFirst from "@/components/loginFirst";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";

const CUISINES = [
  "Polska",
  "Włoska",
  "Amerykańska",
  "Meksykańska",
  "Hinduska",
  "Chińska",
  "Japońska",
  "Wietnamska",
  "Koreańska",
  "Tajska",
  "Grecka",
  "Hiszpańska",
  "Turecka",
  "Francuska",
];

const DIET_TYPES = [
  "Wegetariańska",
  "Wegańska",
  "Bezglutenowa",
  "Keto",
  "Low Carb",
  "Bez laktozy",
  "Wysokobiałkowa",
];

const UNITS = ["g", "ml", "szt", "tbs", "tsp"];

export default function AddRecipesScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [switchDescription, setSwitchDescription] = useState(false);

  const [instructionsList, setInstructionsList] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState("");

  const [selectedIngredients, setSelectedIngredients] = useState<any[]>([]);
  const [ingredientName, setIngredientName] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("g");
  const [showUnits, setShowUnits] = useState(false);

  const [image, setImage] = useState<string | null>(null);
  const [selectedCuisine, setSelectedCuisine] = useState<string>("");
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const { token } = useAuthStore((state) => state);

  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

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

  const addStepLocally = () => {
    if (currentStep.trim().length < 5) {
      Alert.alert("Błąd", "Krok musi mieć co najmniej 5 znaków");
      return;
    }
    setInstructionsList([...instructionsList, currentStep.trim()]);
    setCurrentStep("");
  };

  const toggleDiet = (diet: string) => {
    setSelectedDiets((prev) =>
      prev.includes(diet) ? prev.filter((d) => d !== diet) : [...prev, diet],
    );
  };

  const mutation = useMutation({
    mutationFn: (formData: FormData) =>
      api.post("/recipes/add", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: () => {
      Alert.alert("Sukces", "Przepis został dodany");
      setTitle("");
      setDescription("");
      setInstructionsList([]);
      setSelectedIngredients([]);
      setImage(null);
      setSelectedDiets([]);
      setSelectedCuisine("");
      setSwitchDescription(false);
      queryClient.invalidateQueries({ queryKey: ["myRecipes"] });
    },
    onError: (error: any) => {
      Alert.alert("Błąd", error.response?.data?.message || "Błąd serwera");
    },
  });

  const handleAddRecipe = () => {
    if (
      !title.trim() ||
      selectedIngredients.length === 0 ||
      instructionsList.length === 0
    ) {
      Alert.alert("Błąd", "Uzupełnij wymagane pola (tytuł, składniki, kroki)");
      return;
    }

    const formData = new FormData();
    if (image) {
      const filename = image.split("/").pop() || "photo.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      // @ts-ignore
      formData.append("image", { uri: image, name: filename, type });
    }

    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("ingredients", JSON.stringify(selectedIngredients));
    formData.append("instructions", JSON.stringify(instructionsList));
    formData.append(
      "cuisine",
      JSON.stringify(selectedCuisine ? selectedCuisine : ""),
    );
    formData.append("diet_type", JSON.stringify(selectedDiets));
    formData.append("status", "private");

    mutation.mutate(formData);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Błąd", "Brak uprawnień do galerii!");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3], // Zachowaj to dla porządku w UI
      quality: 1, // Tu bierzemy oryginał, skompresujemy go za chwilę ręcznie
    });

    if (!result.canceled) {
      try {
        // PROCES KOMPRESJI
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1024 } }], // Zmniejszamy szerokość do 1024px (wysokość wyliczy się sama)
          {
            compress: 0.6, // 60% jakości to "sweet spot" – oko nie widzi różnicy, a waga spada drastycznie
            format: ImageManipulator.SaveFormat.JPEG,
          },
        );

        setImage(manipResult.uri);
        console.log("Oryginalny rozmiar:", result.assets[0].fileSize); // jeśli dostępne
        console.log("Skompresowane zdjęcie zapisane w:", manipResult.uri);
      } catch (error) {
        console.error("Błąd kompresji:", error);
        setImage(result.assets[0].uri); // fallback do oryginału w razie błędu
      }
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
          placeholder="Tytuł"
          placeholderTextColor={theme.placeholder}
          value={title}
          onChangeText={setTitle}
        />

        {!switchDescription ? (
          <TouchableOpacity
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.tint,
                borderStyle: "dashed",
                justifyContent: "center",
              },
            ]}
            onPress={() => setSwitchDescription(true)}
          >
            <Text
              style={{
                color: theme.tint,
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              + Dodaj opis (opcjonalnie)
            </Text>
          </TouchableOpacity>
        ) : (
          <TextInput
            style={[
              styles.input,
              {
                height: 80,
                backgroundColor: theme.inputBg,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="Opis przepisu..."
            placeholderTextColor={theme.placeholder}
            multiline
            value={description}
            onChangeText={setDescription}
          />
        )}

        {/* SEKCJA ZDJĘCIA Z PODGLĄDEM */}
        <View style={styles.imageSection}>
          {!image ? (
            <TouchableOpacity
              onPress={pickImage}
              style={[
                styles.imagePicker,
                { backgroundColor: theme.inputBg, borderColor: theme.tint },
              ]}
            >
              <Text style={{ color: theme.tint, fontWeight: "bold" }}>
                + Dodaj zdjęcie przepisu
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.previewContainer}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setImage(null)}
              >
                <Text
                  style={{ color: "white", fontWeight: "bold", fontSize: 12 }}
                >
                  X
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={pickImage}
                style={[
                  styles.changeImageOverlay,
                  { backgroundColor: "rgba(0,0,0,0.4)" },
                ]}
              >
                <Text style={{ color: "white", fontSize: 12 }}>
                  Zmień zdjęcie
                </Text>
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

          <View style={{ marginTop: 15 }}>
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
          <Text style={[styles.label, { color: theme.text }]}>
            Kroki przygotowania:
          </Text>
          <View style={styles.row}>
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
              placeholder="Opisz krok..."
              placeholderTextColor={theme.placeholder}
              value={currentStep}
              onChangeText={setCurrentStep}
              multiline
            />
            <TouchableOpacity
              onPress={addStepLocally}
              style={[styles.miniButton, { backgroundColor: "#2196F3" }]}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 15 }}>
            {instructionsList.map((step, index) => (
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
                <Text style={{ flex: 1, color: theme.text, marginRight: 10 }}>
                  <Text style={{ fontWeight: "bold", color: theme.tint }}>
                    {index + 1}.
                  </Text>{" "}
                  {step}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setInstructionsList(
                      instructionsList.filter((_, i) => i !== index),
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

        {/* KUCHNIA - WRAP LAYOUT */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.label, { color: theme.text }]}>
            Rodzaj kuchni:
          </Text>
          <View style={styles.chipContainer}>
            {CUISINES.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() =>
                  setSelectedCuisine(c === selectedCuisine ? "" : c)
                }
                style={[
                  styles.chip,
                  { borderColor: theme.border, backgroundColor: theme.inputBg },
                  selectedCuisine === c && {
                    backgroundColor: theme.tint,
                    borderColor: theme.tint,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: theme.text },
                    selectedCuisine === c && {
                      color: "#fff",
                      fontWeight: "bold",
                    },
                  ]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* DIETY - WRAP LAYOUT */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.label, { color: theme.text }]}>Typ diety:</Text>
          <View style={styles.chipContainer}>
            {DIET_TYPES.map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => toggleDiet(d)}
                style={[
                  styles.chip,
                  { borderColor: theme.border, backgroundColor: theme.inputBg },
                  selectedDiets.includes(d) && {
                    backgroundColor: theme.tint,
                    borderColor: theme.tint,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: theme.text },
                    selectedDiets.includes(d) && {
                      color: "#fff",
                      fontWeight: "bold",
                    },
                  ]}
                >
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.tint },
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
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 12,
  },
  unitButton: {
    height: 45,
    width: 50,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  unitsDropdown: {
    position: "absolute",
    top: 80,
    left: 15,
    right: 15,
    borderWidth: 1,
    borderRadius: 12,
    zIndex: 100,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  unitItem: { padding: 14, alignItems: "center" },
  imagePicker: {
    padding: 25,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
  },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
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
  imageSection: {
    marginBottom: 20,
  },

  previewContainer: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removeImageButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255, 99, 71, 0.9)", // Twój primaryOrange
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  changeImageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    alignItems: "center",
  },
});

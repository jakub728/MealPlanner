import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  useColorScheme,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuthStore } from "@/store/useAuthStore";
import LoginFirst from "@/components/loginFirst";

const UNITS = ["g", "ml", "szt", "tbs", "tsp"];

export default function AddRecipesScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [instructionsList, setInstructionsList] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState("");

  const [selectedIngredients, setSelectedIngredients] = useState<any[]>([]);
  const [ingredientName, setIngredientName] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("g");
  const [showUnits, setShowUnits] = useState(false);

  const queryClient = useQueryClient();
  const { token } = useAuthStore((state) => state);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

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

  // 1. ADD INGREDIENT
  const addIngredientLocally = () => {
    const parsedAmount = parseFloat(amount);
    if (!ingredientName.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Błąd", "Podaj poprawną nazwę i ilość");
      return;
    }
    const newEntry = {
      name: ingredientName.trim(),
      amount: parsedAmount,
      unit: unit,
    };
    setSelectedIngredients([...selectedIngredients, newEntry]);
    setIngredientName("");
    setAmount("");
  };

  // 2. ADD STEP (Nowa funkcja dla instrukcji)
  const addStepLocally = () => {
    if (currentStep.trim().length < 5) {
      Alert.alert("Błąd", "Krok musi mieć co najmniej 5 znaków");
      return;
    }
    setInstructionsList([...instructionsList, currentStep.trim()]);
    setCurrentStep("");
  };

  const removeStep = (index: number) => {
    setInstructionsList(instructionsList.filter((_, i) => i !== index));
  };

  const mutation = useMutation({
    mutationFn: (newRecipe: any) => api.post("/recipes/add", newRecipe),
    onSuccess: () => {
      Alert.alert("Sukces!", "Przepis zapisany.");
      setTitle("");
      setDescription("");
      setInstructionsList([]);
      setSelectedIngredients([]);
      queryClient.invalidateQueries({ queryKey: ["myRecipes"] });
    },
    onError: (error: any) => {
      Alert.alert("Błąd", error.response?.data?.message || "Błąd serwera");
    },
  });

  const handleAddRecipe = () => {
    if (selectedIngredients.length === 0) {
      Alert.alert("Błąd", "Dodaj składniki");
      return;
    }
    if (instructionsList.length === 0) {
      Alert.alert("Błąd", "Dodaj chociaż jeden krok instrukcji");
      return;
    }

    const recipeData: any = {
      title: title.trim(),
      ingredients: selectedIngredients,
      instructions: instructionsList,
      status: "private",
    };

    if (description && description.trim() !== "") {
      recipeData.description = description.trim();
    }

    mutation.mutate(recipeData);
  };

  if (!token) return <LoginFirst />;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Dodaj nowy przepis</Text>

      <TextInput
        style={styles.input}
        placeholder="Tytuł"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, { height: 60 }]}
        placeholder="Opis"
        multiline
        value={description}
        onChangeText={setDescription}
      />

      {/* SEKCJA SKŁADNIKÓW */}
      <View style={[styles.section, { zIndex: 10 }]}>
        <Text style={styles.label}>Składniki:</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 2, marginBottom: 0 }]}
            placeholder="Nazwa"
            value={ingredientName}
            onChangeText={setIngredientName}
          />
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Ilość"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <TouchableOpacity
            style={styles.unitButton}
            onPress={() => setShowUnits(!showUnits)}
          >
            <Text style={[styles.unitButtonText, { marginBottom: 0 }]}>
              {unit}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={addIngredientLocally}
            style={styles.miniButton}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>+</Text>
          </TouchableOpacity>
        </View>
        {showUnits && (
          <View style={styles.unitsDropdown}>
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                style={styles.unitItem}
                onPress={() => {
                  setUnit(u);
                  setShowUnits(false);
                }}
              >
                <Text>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {selectedIngredients.map((item, index) => (
          <View key={index} style={styles.addedItem}>
            <Text>
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
              <Text style={{ color: "red" }}>Usuń</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* SEKCJA INSTRUKCJI */}
      <View style={styles.section}>
        <Text style={styles.label}>Kroki przygotowania:</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Opisz krok..."
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

        {instructionsList.map((step, index) => (
          <View key={index} style={styles.addedItem}>
            <Text style={{ flex: 1 }}>
              <Text style={{ fontWeight: "bold" }}>{index + 1}.</Text> {step}
            </Text>
            <TouchableOpacity onPress={() => removeStep(index)}>
              <Text style={{ color: "red", marginLeft: 10 }}>Usuń</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          mutation.isPending && { backgroundColor: "#ccc" },
        ]}
        onPress={handleAddRecipe}
        disabled={mutation.isPending}
      >
        <Text style={styles.buttonText}>
          {mutation.isPending ? "Wysyłanie..." : "Zapisz przepis"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 20, marginTop: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#FF6347",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 50,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  section: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#eee",
    zIndex: 2,
  },
  label: { fontSize: 16, fontWeight: "bold", marginBottom: 10, color: "#333" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  miniButton: {
    backgroundColor: "#4CAF50",
    width: 45,
    height: 45,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  unitButton: {
    height: 45,
    width: 45,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  unitButtonText: { fontWeight: "bold" },
  unitsDropdown: {
    position: "absolute",
    top: 100,
    left: 15,
    right: 15,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    zIndex: 10,
    elevation: 5,
  },
  unitItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
});

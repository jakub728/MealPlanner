import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useAuthStore } from "@/store/useAuthStore";

const UNITS = ["g", "ml", "szt", "tbs", "tsp"];

export default function AddRecipesScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [selectedIngredients, setSelectedIngredients] = useState<any[]>([]);

  const [ingredientName, setIngredientName] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("g");
  const [showUnits, setShowUnits] = useState(false);

  const queryClient = useQueryClient();
  const { token } = useAuthStore((state) => state);

  // 1. ADD INGREDIENT
  const addIngredientLocally = () => {
    if (!ingredientName.trim() || !amount) {
      Alert.alert("Błąd", "Podaj nazwę składnika i ilość");
      return;
    }

    const newEntry = {
      name: ingredientName.trim(),
      amount: Number(amount),
      unit: unit,
    };

    setSelectedIngredients([...selectedIngredients, newEntry]);

    setIngredientName("");
    setAmount("");
    setUnit("g");
  };

  // 2. REMOVE INGREDIENT
  const removeIngredient = (index: number) => {
    setSelectedIngredients(selectedIngredients.filter((_, i) => i !== index));
  };

  const mutation = useMutation({
    mutationFn: (newRecipe: any) => {
      return api.post("/recipies/add", newRecipe);
    },
    onSuccess: () => {
      Alert.alert("Sukces!", "Przepis został zapisany w bazie.");
      // Czyścimy cały formularz
      setTitle("");
      setDescription("");
      setInstructions("");
      setSelectedIngredients([]);
      queryClient.invalidateQueries({ queryKey: ["myRecipes"] });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || "Błąd serwera";
      Alert.alert("Błąd", msg);
    },
  });

  // 3. SEND RECIPE
  const handleAddRecipe = () => {
    const preparedInstructions = instructions
      .split("\n")
      .map((step) => step.trim())
      .filter((step) => step.length >= 5);

    if (selectedIngredients.length === 0) {
      Alert.alert("Błąd", "Dodaj przynajmniej jeden składnik.");
      return;
    }
    if (preparedInstructions.length === 0) {
      Alert.alert("Błąd", "Opisz kroki przygotowania (każdy min. 5 znaków).");
      return;
    }

    mutation.mutate({
      title,
      description,
      ingredients: selectedIngredients,
      instructions: preparedInstructions,
      status: "private",
    });
  };

  if (!token) {
    return <TextInput>Log in first</TextInput>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Dodaj nowy przepis</Text>

      <TextInput
        style={styles.input}
        placeholder="Tytuł przepisu"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Opis przepisu"
        multiline
        value={description}
        onChangeText={setDescription}
      />

      <View style={styles.section}>
        <Text style={styles.label}>Składniki:</Text>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 2 }]}
            placeholder="Nazwa"
            value={ingredientName}
            onChangeText={setIngredientName}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Ilość"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <View style={{ flex: 1 }}>
            <TouchableOpacity
              style={styles.unitButton}
              onPress={() => setShowUnits(!showUnits)}
            >
              <Text style={styles.unitButtonText}>{unit}</Text>
            </TouchableOpacity>

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
          </View>

          <TouchableOpacity
            onPress={addIngredientLocally}
            style={styles.miniButton}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>+</Text>
          </TouchableOpacity>
        </View>

        {/* INGREDIENT LIST */}
        {selectedIngredients.map((item, index) => (
          <View key={index} style={styles.addedIngredient}>
            <Text>
              • {item.name} ({item.amount}
              {item.unit})
            </Text>
            <TouchableOpacity onPress={() => removeIngredient(index)}>
              <Text style={{ color: "red" }}>Usuń</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TextInput
        style={[styles.input, { height: 120 }]}
        placeholder="Instrukcje (każda linia to krok)"
        multiline
        value={instructions}
        onChangeText={setInstructions}
      />

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
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 20, marginTop: 40 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    textAlignVertical: "top", // Ważne dla Androida przy multiline
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
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8, // Działa w nowszych wersjach RN, jeśli nie - użyj marginów
  },
  miniButton: {
    backgroundColor: "#4CAF50", // Zielony dla dodawania
    width: 45,
    height: 45,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  addedIngredient: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginBottom: 10,
  },
  unitPicker: {
    height: 50,
    width: 100,
  },
  dropdown: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    position: "absolute",
    top: 50, // Zaraz pod inputem
    width: "100%",
    zIndex: 1000,
    elevation: 5, // Cień dla Androida
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  unitButton: {
    height: 48, // dopasuj do wysokości Twoich inputów
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    marginBottom: 15,
  },
  unitButtonText: {
    fontWeight: "bold",
    color: "#333",
  },
  unitsDropdown: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    zIndex: 2000, // Wyżej niż cokolwiek innego
    elevation: 5,
  },
  unitItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  unitItemText: {
    fontSize: 12,
  },
});

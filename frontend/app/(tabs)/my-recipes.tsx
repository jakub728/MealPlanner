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
const UNITS = ["g", "ml", "szt", "tbs", "tsp"];

export default function MyRecipesScreen() {
  const [allIngredients, setAllIngredients] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFromDb, setSelectedFromDb] = useState<any | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [selectedIngredients, setSelectedIngredients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("g");
  const [showUnits, setShowUnits] = useState(false);

  const queryClient = useQueryClient();
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const response = await api.get("/ingredients/get");
        setAllIngredients(response.data);
      } catch (error) {
        console.error("Błąd pobierania składników:", error);
      }
    };
    fetchIngredients();
  }, []);

  const handleSearch = (text: string) => {
    setSearchQuery(text);

    if (text.length > 0) {
      const filtered = allIngredients.filter((ing) =>
        ing.name.toLowerCase().includes(text.toLowerCase()),
      );

      if (filtered.length === 0) {
        setSelectedFromDb(null); 
        setAmount(""); 
        setUnit("g"); 
      }

      setSearchResults(filtered);
    } else {
      setSearchResults([]);
      setSelectedFromDb(null);
    }
  };

  const handleSelectIngredient = (ing: any) => {
    setSelectedFromDb(ing);
    setSearchQuery(ing.name);
    setSearchResults([]);
  };

  const addIngredientToDatabase = async () => {
    if (!searchQuery || !amount) {
      Alert.alert("Błąd", "Podaj nazwę składnika i ilość");
      return;
    }

    let finalIngredientId = selectedFromDb?._id;

    if (!finalIngredientId) {
      try {
        const response = await api.post("/ingredients/add", {
          name: searchQuery,
          category: "other", 
        });
        finalIngredientId = response.data.ingredient._id;

        setAllIngredients((prev) => [...prev, response.data.ingredient]);
      } catch (error) {
        Alert.alert("Błąd", "Nie udało się stworzyć nowego składnika w bazie.");
        return;
      }
    }

    // Dodanie do listy przepisu
    const newEntry = {
      ingredient: finalIngredientId,
      name: searchQuery,
      amount: Number(amount),
      unit: unit,
    };

    setSelectedIngredients([...selectedIngredients, newEntry]);


    setSearchQuery("");
    setAmount("");
    setUnit("g");
    setSelectedFromDb(null);
    setSearchResults([]);
  };

  const mutation = useMutation({
    mutationFn: (newRecipe: any) => {
      return api.post("/recipies/add", newRecipe);
    },
    onSuccess: () => {
      Alert.alert("Sukces!", "Przepis został dodany.");
      setTitle("");
      setDescription("");
      setInstructions("");
      queryClient.invalidateQueries({ queryKey: ["myRecipes"] });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || "Błąd dodawania";
      Alert.alert("Błąd", msg);
    },
  });

  const handleAddRecipe = () => {
    mutation.mutate({
      title,
      description,
      ingredients: selectedIngredients.map((ing) => ({
        ingredient: ing.ingredient, // Przesyłamy samo ID
        amount: ing.amount,
        unit: ing.unit,
      })),
      instructions: instructions.split("\n"),
      status: "private",
    });
  };

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
        placeholder="Opis"
        multiline
        value={description}
        onChangeText={setDescription}
      />
      <View style={styles.section}>
        <Text style={styles.label}>Dodaj składniki:</Text>

        <View style={styles.row}>
          <View style={{ flex: 2 }}>
            <TextInput
              style={styles.input}
              placeholder="Szukaj składnika..."
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {/* LISTA PODPOWIEDZI */}
            {searchResults.length > 0 && (
              <View style={styles.dropdown}>
                {searchResults.map((ing) => (
                  <TouchableOpacity
                    key={ing._id}
                    style={styles.dropdownItem}
                    onPress={() => handleSelectIngredient(ing)}
                  >
                    <Text>{ing.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Ilość"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          {/* WYBÓR JEDNOSTKI */}
          <View style={{ flex: 1.2 }}>
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
                    <Text style={styles.unitItemText}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={addIngredientToDatabase}
            style={styles.miniButton}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>
              {selectedFromDb ? "V" : "+"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* WYŚWIETLANIE DODANYCH SKŁADNIKÓW */}
        {selectedIngredients.map((item, index) => (
          <View key={index} style={styles.addedIngredient}>
            <Text>
              • {item.name} ({item.amount}
              {item.unit})
            </Text>
          </View>
        ))}
      </View>

      <TextInput
        style={[styles.input, { height: 120 }]}
        placeholder="Instrukcje (każda linia to nowy krok)"
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
          {mutation.isPending ? "Dodawanie..." : "Zapisz przepis"}
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

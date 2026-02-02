import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "@/store/useAuthStore";
import LoginFirst from "@/components/loginFirst";
import Colors from "@/constants/Colors";

const CALENDAR_STORAGE_KEY = "user_calendar_data";
const SHOPPING_LIST_KEY = "shopping-list";

export default function ShoppingList() {
  const { token } = useAuthStore();
  const [shoppingItems, setShoppingItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  // 1. Wczytaj dane z AsyncStorage przy starcie
  useEffect(() => {
    loadLocalData();
  }, []);

  // 2. Wczytywanie danych z AsyncStorage
  const loadLocalData = async () => {
    try {
      setIsLoading(true);
      const data = await AsyncStorage.getItem(CALENDAR_STORAGE_KEY);

      if (!data) {
        setShoppingItems([]);
        setIsLoading(false);
        return;
      }

      let parsed = [];
      try {
        parsed = JSON.parse(data);
      } catch (e) {
        console.error("Błąd parsowania JSON", e);
        parsed = [];
      }

      if (Array.isArray(parsed)) {
        setShoppingItems(parsed);
      } else {
        setShoppingItems([]);
      }
    } catch (e) {
      console.error("Główny błąd ładowania:", e);
      setShoppingItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Zapisz dane do AsyncStorage przy każdej zmianie stanu
  const saveLocalData = async (data: any[]) => {
    try {
      setShoppingItems(data);
      await AsyncStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Błąd zapisu w pamięci", e);
    }
  };

  //4. Generowanie listy zakupów z planera
  const generateFromPlaner = async () => {
    try {
      setIsGenerating(true);
      const savedCalendar = await AsyncStorage.getItem(CALENDAR_STORAGE_KEY);

      if (!savedCalendar) {
        alert("Twój planer jest pusty. Dodaj posiłki, aby wygenerować listę");
        return;
      }

      const plannedMeals = JSON.parse(savedCalendar);

      const ingredientsMap: { [key: string]: any } = {};

      plannedMeals.forEach((meal: any) => {
        meal.recipe?.ingredients?.forEach((ing: any) => {
          const key = `${ing.name}-${ing.unit}`.toLowerCase().trim();

          if (ingredientsMap[key]) {
            ingredientsMap[key].amount += Number(ing.amount);
          } else {
            ingredientsMap[key] = {
              _id: Math.random().toString(36).substr(2, 9),
              name: ing.name,
              amount: Number(ing.amount),
              unit: ing.unit,
              purchased: false,
              have_at_home: false,
            };
          }
        });
      });

      const finalItems = Object.values(ingredientsMap);

      if (finalItems.length === 0) {
        return;
      }

      await AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(finalItems));
      await saveLocalData(finalItems);
    } catch (e) {
      console.error("Błąd generowania listy lokalnie", e);
      alert("Wystąpił błąd przy przetwarzaniu planu.");
    } finally {
      setIsGenerating(false);
    }
  };

  //5. Przełączanie statusu zakupionych i posiadanych w domu
  const toggleStatus = (id: string, field: "purchased" | "have_at_home") => {
    const updated = shoppingItems.map((item) => {
      if (item._id === id) {
        const newValue = !item[field];
        return {
          ...item,
          [field]: newValue,
          ...(field === "purchased" && newValue ? { have_at_home: false } : {}),
          ...(field === "have_at_home" && newValue ? { purchased: false } : {}),
        };
      }
      return item;
    });
    saveLocalData(updated);
  };

  // 6. Renderowanie pojedynczego elementu listy
  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.itemRow, { backgroundColor: theme.card }]}>
      <View style={styles.itemInfo}>
        <Text
          style={[
            styles.itemName,
            { color: theme.text },
            (item.purchased || item.have_at_home) && styles.strikethrough,
          ]}
        >
          {item.name}
        </Text>
        <Text style={[styles.itemAmount, { color: theme.subText }]}>
          {item.amount} {item.unit}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => toggleStatus(item._id, "have_at_home")}
          style={[styles.actionBtn, item.have_at_home && styles.atHomeActive]}
        >
          <Ionicons
            name={item.have_at_home ? "home" : "home-outline"}
            size={18}
            color={item.have_at_home ? "#fff" : "#4CAF50"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => toggleStatus(item._id, "purchased")}
          style={[styles.actionBtn, item.purchased && styles.purchasedActive]}
        >
          <Ionicons
            name={item.purchased ? "checkmark-circle" : "ellipse-outline"}
            size={20}
            color={item.purchased ? "#fff" : "#FF6347"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Blokada dostępu dla niezalogowanych
  if (!token) {
    return <LoginFirst placeholder=" aby stworzyć listę zakupów" />;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Lista zakupów</Text>
        <TouchableOpacity
          style={styles.generateBtn}
          onPress={generateFromPlaner}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.generateBtnText}>Aktualizuj z planera</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.home}>
        <Text style={[styles.hometext, { color: theme.text }]}>W domu</Text>
        <Text style={[styles.hometext, { color: theme.text }]}>Kupione</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#FF6347" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={shoppingItems}
          keyExtractor={(item, index) => item._id || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.subText }]}>
              Twoja lista jest pusta. Dodaj posiłki do planera!
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  home: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 10,
    marginRight: 7,
  },
  hometext: { fontSize: 12, marginRight: 13 },
  title: { fontSize: 24, fontWeight: "bold" },
  generateBtn: {
    backgroundColor: "#FF6347",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  generateBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  listContent: { padding: 15 },
  itemRow: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: "600" },
  itemAmount: { fontSize: 13, marginTop: 2 },
  strikethrough: { textDecorationLine: "line-through", opacity: 0.5 },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  atHomeActive: { backgroundColor: "#4CAF50", borderColor: "#4CAF50" },
  purchasedActive: { backgroundColor: "#FF6347", borderColor: "#FF6347" },
  emptyText: { textAlign: "center", marginTop: 100, fontSize: 14 },
});

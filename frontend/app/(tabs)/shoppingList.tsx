import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "@/store/useAuthStore";
import LoginFirst from "@/components/loginFirst";
import Colors from "@/constants/Colors";
import { format, isSameDay } from "date-fns";
import { pl } from "date-fns/locale";
import { useThemeStore } from "@/store/useThemeStore";

const CALENDAR_STORAGE_KEY = "user_calendar_data";
const SHOPPING_LIST_KEY = "shopping_list_data";
const BLACKLIST_STORAGE_KEY = "shopping_blacklist_data";

export default function ShoppingList() {
  const { token } = useAuthStore();
  const [sections, setSections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { primaryColor } = useThemeStore();

  // 1. Czyszczenie staroci i wczytaj nowości z AsyncStorage przy starcie
  useEffect(() => {
    const initialize = async () => {
      await purgeOldBlacklistEntries();
      await loadLocalData();
    };
    initialize();
  }, []);

  // 2. Filtrowanie jeśli starsze niż 2 tygodnie
  const filterOldItems = (items: any[]) => {
    const TWO_WEEKS_AGO = new Date();
    TWO_WEEKS_AGO.setDate(TWO_WEEKS_AGO.getDate() - 14);

    return items.filter((item) => {
      if (!item.date) return true;
      const itemDate = new Date(item.date);
      return itemDate >= TWO_WEEKS_AGO;
    });
  };

  // 3. Wczytywanie danych z AsyncStorage
  const loadLocalData = async () => {
    try {
      setIsLoading(true);
      const data = await AsyncStorage.getItem(SHOPPING_LIST_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        const freshItems = filterOldItems(parsed);

        if (freshItems.length !== parsed.length) {
          await AsyncStorage.setItem(
            SHOPPING_LIST_KEY,
            JSON.stringify(freshItems),
          );
        }

        prepareSections(freshItems);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Grupowanie danych w sekcje (dni) i sortująca kupione na dół
  const prepareSections = (items: any[]) => {
    const groups: { [key: string]: any[] } = {};

    items.forEach((item) => {
      const dateKey = item.date
        ? format(new Date(item.date), "yyyy-MM-dd")
        : "Inne";
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });

    const sectionArray = Object.keys(groups)
      .sort()
      .map((date) => {
        const sortedItems = groups[date].sort((a, b) => {
          const aDone = a.purchased || a.have_at_home;
          const bDone = b.purchased || b.have_at_home;
          return aDone === bDone ? 0 : aDone ? 1 : -1;
        });

        return {
          title:
            date === "Inne"
              ? "Pozostałe"
              : format(new Date(date), "EEEE, d MMMM", { locale: pl }),
          data: sortedItems,
        };
      });

    setSections(sectionArray);
  };

  // 5. Zapisz dane do AsyncStorage przy każdej zmianie stanu
  const saveLocalData = async (allItemArray: any[]) => {
    await AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(allItemArray));
    prepareSections(allItemArray);
  };

  // 6. Generowanie z inteligentnym filtrowaniem
  const generateFromPlaner = async () => {
    try {
      setIsGenerating(true);

      await purgeOldBlacklistEntries();

      const calendarData = await AsyncStorage.getItem(CALENDAR_STORAGE_KEY);
      const blacklistData = await AsyncStorage.getItem(BLACKLIST_STORAGE_KEY);
      const currentListData = await AsyncStorage.getItem(SHOPPING_LIST_KEY);

      const blacklist: { key: string; timestamp: number }[] = blacklistData
        ? JSON.parse(blacklistData)
        : [];

      let currentList: any[] = currentListData
        ? JSON.parse(currentListData)
        : [];
      currentList = filterOldItems(currentList);

      const rawPlannedMeals = calendarData ? JSON.parse(calendarData) : [];
      const plannedMeals = rawPlannedMeals.filter((m: any) => m.recipe);

      const newList: any[] = [];

      plannedMeals.forEach((meal: any) => {
        const mealId = meal._id || meal.id;
        const mealDate = new Date(meal.date);
        const TWO_WEEKS_AGO = new Date();
        TWO_WEEKS_AGO.setDate(TWO_WEEKS_AGO.getDate() - 14);
        if (mealDate < TWO_WEEKS_AGO) return;

        meal.recipe?.ingredients?.forEach((ing: any) => {
          const nameLower = ing.name.toLowerCase().trim();
          const blackKey = `${mealId}-${nameLower}`;

          if (blacklist.some((b) => b.key === blackKey)) return;

          const existing = currentList.find(
            (c) =>
              c.name.toLowerCase().trim() === nameLower && c.mealId === mealId,
          );

          const stableId =
            existing?._id ||
            `${meal._id}-${nameLower}-${Math.random().toString(36).substr(2, 5)}`;

          newList.push({
            _id: stableId,
            mealId: mealId,
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
            date: meal.date,
            purchased: existing?.purchased || false,
            have_at_home: existing?.have_at_home || false,
          });
        });
      });

      await saveLocalData(newList);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  //7. Przełączanie statusu zakupionych i posiadanych w domu
  const toggleStatus = async (
    id: string,
    field: "purchased" | "have_at_home",
  ) => {
    const data = await AsyncStorage.getItem(SHOPPING_LIST_KEY);
    let items: any[] = data ? JSON.parse(data) : [];

    items = items.map((item) => {
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
    saveLocalData(items);
  };

  // 8. Usuwanie i dodawanie do blacklisty powiązanej z konkretnym posiłkiem
  const deleteAndBlacklist = async (
    id: string,
    name: string,
    mealId: string,
  ) => {
    try {
      const blacklistData = await AsyncStorage.getItem(BLACKLIST_STORAGE_KEY);
      let blacklist: { key: string; timestamp: number }[] = blacklistData
        ? JSON.parse(blacklistData)
        : [];

      const blackKey = `${mealId}-${name.toLowerCase().trim()}`;

      if (!blacklist.find((item) => item.key === blackKey)) {
        blacklist.push({
          key: blackKey,
          timestamp: Date.now(),
        });
        await AsyncStorage.setItem(
          BLACKLIST_STORAGE_KEY,
          JSON.stringify(blacklist),
        );
      }
      const data = await AsyncStorage.getItem(SHOPPING_LIST_KEY);
      let items: any[] = data ? JSON.parse(data) : [];
      const updated = items.filter((item) => item._id !== id);
      saveLocalData(updated);
    } catch (e) {
      console.error(e);
    }
  };

  // 9. Usuwanie z blacklisty po 14 dniach
  const purgeOldBlacklistEntries = async () => {
    const blacklistData = await AsyncStorage.getItem(BLACKLIST_STORAGE_KEY);
    if (!blacklistData) return;

    const blacklist: { key: string; timestamp: number }[] =
      JSON.parse(blacklistData);
    const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const freshBlacklist = blacklist.filter(
      (item) => now - item.timestamp < TWO_WEEKS_MS,
    );

    if (freshBlacklist.length !== blacklist.length) {
      await AsyncStorage.setItem(
        BLACKLIST_STORAGE_KEY,
        JSON.stringify(freshBlacklist),
      );
    }
  };

  // 10. Render Item
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
        <TouchableOpacity
          onPress={() => deleteAndBlacklist(item._id, item.name, item.mealId)}
          style={styles.deleteBtn}
        >
          <Ionicons name="close-circle-outline" size={20} color="#ccc" />
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
          style={[styles.generateBtn, { backgroundColor: primaryColor }]}
          onPress={generateFromPlaner}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text
              style={[
                styles.generateBtnText,
                { backgroundColor: primaryColor },
              ]}
            >
              Aktualizuj
            </Text>
          )}
        </TouchableOpacity>
      </View>
      {sections && sections.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => item._id?.toString() + index}
          renderItem={renderItem}
          renderSectionHeader={({ section: { title } }) => (
            <View
              style={[
                styles.sectionHeader,
                { backgroundColor: theme.background },
              ]}
            >
              <Text style={[styles.sectionHeaderText, { color: primaryColor }]}>
                {title}
              </Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="sad-outline" size={60} color={theme.border} />
          <Text style={[styles.emptyText, { color: theme.subText }]}>
            Dodaj dania do kalendarza aby wygenerować listę zakupów
          </Text>
        </View>
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
  title: { fontSize: 28, fontWeight: "bold" },
  generateBtn: { padding: 10, borderRadius: 20 },
  generateBtnText: { color: "#fff", fontWeight: "600" },
  listContent: { paddingHorizontal: 15 },
  sectionHeader: { paddingVertical: 10, marginTop: 10 },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 5 },
    textShadowRadius: 30,
  },
  itemRow: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: "center",
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "600" },
  itemAmount: { fontSize: 12 },
  strikethrough: { textDecorationLine: "line-through", opacity: 0.4 },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 35,
    height: 35,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  atHomeActive: { backgroundColor: "#4CAF50", borderColor: "#4CAF50" },
  purchasedActive: { backgroundColor: "#FF6347", borderColor: "#FF6347" },
  deleteBtn: { justifyContent: "center", paddingLeft: 5 },
  emptyState: { alignItems: "center", marginTop: 100 },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    paddingHorizontal: 20,
    textAlign: "center",
  },
});

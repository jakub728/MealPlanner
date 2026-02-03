import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useAuthStore } from "@/store/useAuthStore";
import Colors from "@/constants/Colors";
import UserSettingsComponent from "./UserSettingsComponent";

const CALENDAR_STORAGE_KEY = "user_calendar_data";
const SHOPPING_LIST_KEY = "shopping_list_data";

const UserProfileComponent = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [localCalendarCount, setLocalCalendarCount] = useState(0);
  const [localShoppingCount, setLocalShoppingCount] = useState(0);
  const [isLocalLoading, setIsLocalLoading] = useState(true);

  const { token, logout } = useAuthStore();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const isDark = colorScheme === "dark";

  const loadLocalStorageData = useCallback(async () => {
    try {
      setIsLocalLoading(true);

      // 1. Przepisy w planie
      const calendarRaw = await AsyncStorage.getItem(CALENDAR_STORAGE_KEY);
      if (calendarRaw) {
        const calendarData = JSON.parse(calendarRaw);
        if (Array.isArray(calendarData)) {
          setLocalCalendarCount(calendarData.length);
        }
      } else {
        setLocalCalendarCount(0);
      }

      // 2. Rzeczy do kupienia (tylko te, które nie są 'purchased' ani 'have_at_home')
      const shoppingRaw = await AsyncStorage.getItem(SHOPPING_LIST_KEY);
      if (shoppingRaw) {
        const shoppingData = JSON.parse(shoppingRaw);
        if (Array.isArray(shoppingData)) {
          const toBuy = shoppingData.filter(
            (item: any) => !item.purchased && !item.have_at_home,
          ).length;
          setLocalShoppingCount(toBuy);
        }
      } else {
        setLocalShoppingCount(0);
      }
    } catch (e) {
      console.error("Błąd odczytu danych profilu:", e);
    } finally {
      setIsLocalLoading(false);
    }
  }, []);

  // Odświeżanie danych przy każdym wejściu na ekran
  useFocusEffect(
    useCallback(() => {
      loadLocalStorageData();
    }, [loadLocalStorageData]),
  );

  // 1. Znajdź dane użytkownika
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["userMe"],
    queryFn: async () => {
      const response = await api.get("/auth/me");
      return response.data;
    },
    enabled: !!token,
    retry: false,
  });

  // 2. Pobierz przepisy prywatne użytkownika
  const { data: privateRecipes } = useQuery({
    queryKey: ["privateRecipes"],
    queryFn: async () => {
      const response = await api.get("/recipes/private");
      return response.data;
    },
    enabled: !!token,
  });

  const stats = [
    {
      label: "Prywatne przepisy",
      value: Array.isArray(privateRecipes) ? privateRecipes.length : 0,
      icon: "lock-closed-outline",
    },
    {
      label: "Publiczne przepisy",
      value: userData?.recipes_uploaded?.length || 0,
      icon: "cloud-upload-outline",
    },
    {
      label: "Polubione przepisy",
      value: userData?.recipes_liked?.length || 0,
      icon: "heart-outline",
    },
    {
      label: "Przepisy w planie",
      value: localCalendarCount,
      icon: "calendar-outline",
    },
    {
      label: "Rzeczy do kupienia",
      value: localShoppingCount,
      icon: "cart-outline",
    },
    {
      label: "Znajomi",
      value: userData?.friends?.length || 0,
      icon: "people-outline",
    },
  ];

  const isLoading = userLoading || isLocalLoading;

  if (showSettings) {
    return <UserSettingsComponent onBack={() => setShowSettings(false)} />;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Profilu */}
        <View style={styles.header}>
          <View
            style={[
              styles.avatarPlaceholder,
              { backgroundColor: isDark ? "#333" : "#eee" },
            ]}
          >
            <Ionicons
              name="person"
              size={60}
              color={isDark ? "#888" : "#ccc"}
            />
          </View>
          <Text style={[styles.userName, { color: theme.text }]}>
            {userData?.name || "Użytkownik"}
          </Text>
          <Text style={[styles.userEmail, { color: theme.subText }]}>
            {userData?.email || "Ładowanie..."}
          </Text>
        </View>

        {/* Statystyki w Gridzie */}
        {isLoading ? (
          <ActivityIndicator
            color="#FF6347"
            size="large"
            style={{ marginVertical: 20 }}
          />
        ) : (
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <View
                key={index}
                style={[styles.statBox, { backgroundColor: theme.card }]}
              >
                <Ionicons name={stat.icon as any} size={18} color="#FF6347" />
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {stat.value}
                </Text>
                <Text style={[styles.statLabel, { color: theme.subText }]}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Sekcja Znajomych */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Znajomi ({userData?.friends?.length || 0})
          </Text>
          <TouchableOpacity>
            <Text style={{ color: "#FF6347" }}>Zobacz wszystkich</Text>
          </TouchableOpacity>
        </View>

        <View
          style={[styles.friendsContainer, { backgroundColor: theme.card }]}
        >
          {userData?.friends && userData.friends.length > 0 ? (
            userData.friends.slice(0, 4).map((friend: any, idx: number) => (
              <View key={idx} style={styles.friendItem}>
                <View style={styles.friendAvatarSmall}>
                  <Ionicons name="person-circle" size={30} color="#ccc" />
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.friendName, { color: theme.text }]}
                >
                  {friend.name || "Znajomy"}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: theme.subText }]}>
              Dodaj znajomych (wkrótce dostępne)!
            </Text>
          )}
        </View>

        {/* Menu Ustawień */}
        <View
          style={[
            styles.menuContainer,
            { backgroundColor: theme.card, marginTop: 20 },
          ]}
        >
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.border }]}
            onPress={() => setShowSettings(true)}
          >
            <Ionicons name="settings-outline" size={22} color={theme.text} />
            <Text style={[styles.menuText, { color: theme.text }]}>
              Ustawienia
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.subText} />
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.menuContainer,
            { backgroundColor: theme.card, marginTop: 20 },
          ]}
        >
          <TouchableOpacity style={styles.menuItem} onPress={logout}>
            <Ionicons name="log-out-outline" size={22} color="#FF6347" />
            <Text style={[styles.menuText, { color: "#FF6347" }]}>
              Wyloguj się
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  header: { alignItems: "center", marginBottom: 25 },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  userName: { fontSize: 20, fontWeight: "bold" },
  userEmail: { fontSize: 13 },

  // Grid na 2 kolumny
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between", // Rozsuwa elementy na boki
    marginBottom: 20,
  },
  statBox: {
    width: "48%", // Nieco mniej niż 50%, aby uwzględnić marginesy
    padding: 15,
    borderRadius: 20, // Zaokrąglone jak wcześniej
    alignItems: "center",
    marginBottom: 12,
    // Styl spójny z kartami (cień zamiast czarnej ramki)
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: { fontSize: 18, fontWeight: "bold", marginTop: 4 },
  statLabel: { fontSize: 12, textAlign: "center" },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold" },

  friendsContainer: {
    width: "100%",
    padding: 15,
    borderRadius: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    elevation: 1, // Spójny styl
  },
  friendItem: { alignItems: "center", width: "25%", padding: 5 },
  friendName: { fontSize: 10, marginTop: 2 },
  friendAvatarSmall: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: { fontSize: 12, textAlign: "center", width: "100%" },

  // Menu stylizowane jak statBox
  menuContainer: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 15,
    // Kopiujemy styl statBoxa:
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
  },
  menuText: { flex: 1, marginLeft: 15, fontSize: 16 },
});

export default UserProfileComponent;

import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useAuthStore } from "@/store/useAuthStore";
import Colors from "@/constants/Colors";

const UserProfileComponent = () => {
  const { logout } = useAuthStore();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const isDark = colorScheme === "dark";

  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["userMe"],
    queryFn: async () => {
      const response = await api.get("/auth/me");
      return response.data;
    },
  });

  const { data: calendarData, isLoading: calendarLoading } = useQuery({
    queryKey: ["calendar", "all"],
    queryFn: async () => {
      const response = await api.get("/calendar/all");
      return response.data;
    },
  });

  const { data: shoppingData, isLoading: shoppingLoading } = useQuery({
    queryKey: ["shoppingList"],
    queryFn: async () => {
      const response = await api.get("/shopping");
      return response.data;
    },
  });

  const recipesCount = Array.isArray(userData?.recipes_added)
    ? userData.recipes_added.length
    : 0;

  const plannedCount = Array.isArray(calendarData) ? calendarData.length : 0;

  const toBuyCount = Array.isArray(shoppingData)
    ? shoppingData.filter((item: any) => !item.purchased && !item.have_at_home)
        .length
    : 0;

  const stats = [
    { label: "Przepisy", value: recipesCount, icon: "restaurant-outline" },
    { label: "W planie", value: plannedCount, icon: "calendar-outline" },
    { label: "Do kupienia", value: toBuyCount, icon: "cart-outline" },
  ];

  const isLoading = userLoading || calendarLoading || shoppingLoading;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
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

        {isLoading ? (
          <ActivityIndicator
            color="#FF6347"
            size="large"
            style={{ marginVertical: 20 }}
          />
        ) : (
          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <View
                key={index}
                style={[styles.statBox, { backgroundColor: theme.card }]}
              >
                <Ionicons name={stat.icon as any} size={20} color="#FF6347" />
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

        <View style={[styles.menuContainer, { backgroundColor: theme.card }]}>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.border }]}
          >
            <Ionicons name="settings-outline" size={22} color={theme.text} />
            <Text style={[styles.menuText, { color: theme.text }]}>
              Ustawienia konta
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.subText} />
          </TouchableOpacity>

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
  scrollContent: { padding: 20, alignItems: "center" },
  header: { alignItems: "center", marginBottom: 30, marginTop: 20 },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  userName: { fontSize: 22, fontWeight: "bold" },
  userEmail: { fontSize: 14, marginTop: 4 },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 30,
  },
  statBox: {
    flex: 1,
    padding: 15,
    borderRadius: 20,
    alignItems: "center",
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: { fontSize: 18, fontWeight: "bold", marginTop: 5 },
  statLabel: { fontSize: 11, textAlign: "center" },
  menuContainer: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
  },
  menuText: { flex: 1, marginLeft: 15, fontSize: 16 },
});

export default UserProfileComponent;

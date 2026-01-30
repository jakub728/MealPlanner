import React from "react";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useAuthStore } from "@/store/useAuthStore";
import LoginFirst from "@/components/loginFirst";
import Colors from "@/constants/Colors";

export default function ShoppingList() {
  const { user, token } = useAuthStore();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  const { data: shoppingItems, isLoading } = useQuery({
    queryKey: ["shoppingList"],
    queryFn: async () => {
      const response = await api.get("/shopping");
      return response.data;
    },
    enabled: !!token,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      return api.patch(`/shopping/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingList"] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      return api.post("/shopping/generate");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingList"] });
    },
  });

  if (!user) {
    return <LoginFirst placeholder=" aby stworzyć listę zakupów" />;
  }

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
        {/* Przycisk: MAM W DOMU */}
        <TouchableOpacity
          onPress={() =>
            updateMutation.mutate({
              id: item._id,
              updates: {
                have_at_home: !item.have_at_home,
                purchased: false, // Jeśli mam w domu, to nie muszę kupować
              },
            })
          }
          style={[styles.actionBtn, item.have_at_home && styles.atHomeActive]}
        >
          <Ionicons
            name={item.have_at_home ? "home" : "home-outline"}
            size={18}
            color={item.have_at_home ? "#fff" : "#4CAF50"}
          />
        </TouchableOpacity>

        {/* Przycisk: KUPIONE */}
        <TouchableOpacity
          onPress={() =>
            updateMutation.mutate({
              id: item._id,
              updates: {
                purchased: !item.purchased,
                have_at_home: false,
              },
            })
          }
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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Lista zakupów</Text>
        <TouchableOpacity
          style={styles.generateBtn}
          onPress={() => generateMutation.mutate()}
        >
          {generateMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.generateBtnText}>Aktualizuj z planera</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#FF6347" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={shoppingItems}
          keyExtractor={(item) => item._id}
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

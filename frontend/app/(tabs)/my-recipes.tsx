import { StyleSheet, Text, View } from "react-native";
import { useAuthStore } from "@/store/useAuthStore";

export default function MyRecipesScreen() {
  const { token } = useAuthStore((state) => state);

    if (!token) {
        
    }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wszystkie recepty</Text>
      <View style={styles.separator} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
  },
});

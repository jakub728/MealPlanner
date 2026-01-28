import { View, Text } from "react-native";
import LoginFirst from "@/components/loginFirst";
import { useAuthStore } from "@/store/useAuthStore";
import { SafeAreaView } from "react-native-safe-area-context";

export default function shoppingList() {
  const { user } = useAuthStore();

  if (!user) {
    return <LoginFirst placeholder=" aby stworzyć listę zakupów" />;
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Text>shopping-list</Text>
    </SafeAreaView>
  );
}

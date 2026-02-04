import React, { useEffect } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, Tabs } from "expo-router";
import { useAuthStore } from "@/store/useAuthStore";
import { useColorScheme } from "@/components/useColorScheme";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { token } = useAuthStore((state) => state);
  const init = useAuthStore((state) => state.init);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  useEffect(() => {
    init();
  }, []);

  if (!isHydrated) {
    return null;
  }

  return (
    <Tabs
      initialRouteName="myProfile"
      screenOptions={{
        tabBarActiveTintColor: "#FF6347",
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Planer",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="calendar" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shoppingList"
        options={{
          title: "Lista",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="shopping-cart" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="myRecipes"
        options={{
          title: "Moje",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="book" size={28} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="publicRecipes"
        options={{
          title: "Szukaj",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="search" size={28} color={color} />
          ),
        }}
      />
      {token ? (
        <Tabs.Screen
          name="myProfile"
          options={{
            title: "Profil",
            tabBarIcon: ({ color }) => (
              <FontAwesome name="user" size={28} color={color} />
            ),
          }}
        />
      ) : (
        <Tabs.Screen
          name="myProfile"
          options={{
            title: "Zaloguj",
            tabBarIcon: ({ color }) => (
              <FontAwesome name="sign-in" size={28} color={color} />
            ),
          }}
        />
      )}
    </Tabs>
  );
}

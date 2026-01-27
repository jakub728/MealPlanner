import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, Tabs } from "expo-router";

import { useColorScheme } from "@/components/useColorScheme";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#FF6347" }}>
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
        name="public-recipes"
        options={{
          title: "Przepisy",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="search" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-recipes"
        options={{
          title: "Moje",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="book" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add-recipes"
        options={{
          title: "Dodaj",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="plus" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="user" size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

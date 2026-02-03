import { StyleSheet, Text, View } from "react-native";
import { useAuthStore } from "@/store/useAuthStore";
import UserProfileComponent from "@/components/User/UserProfileComponent";
import UserLoginRegisterComponent from "@/components/User/UserLoginRegister";



export default function ProfileScreen() {
  const { token } = useAuthStore((state) => state); //token

  if (!token) {
    return <UserLoginRegisterComponent />; // Login/Register
  }

  return <UserProfileComponent />; // User profile
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





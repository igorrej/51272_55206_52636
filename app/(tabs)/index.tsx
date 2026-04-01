import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";


import {
  DMSans_400Regular,
  DMSans_700Bold,
  useFonts
} from "@expo-google-fonts/dm-sans";

export default function Index() {

  const router = useRouter();

  const [isDarkMode, setIsDarkMode] = useState(false);

  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_700Bold
  });

  if (!fontsLoaded) return null;

  const gradientColors = isDarkMode
    ? ["#0f2027", "#203a43", "#2c5364"]
    : ["#667eea", "#764ba2"];

  const theme = {
    text: "#ffffff",
    card: "rgba(255,255,255,0.18)",
    input: isDarkMode
      ? "rgba(255,255,255,0.12)"
      : "rgba(255,255,255,0.35)",
    icon: isDarkMode ? "#eee" : "#333",
    register: isDarkMode ? "#ddd" : "#222"
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <LinearGradient colors={gradientColors} style={styles.container}>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.inner}
        >

          <Text style={[styles.title, { color: theme.text }]}>
            CalTrack
          </Text>

          <Text style={[styles.subtitle, { color: theme.text }]}>
            Zaloguj się do aplikacji
          </Text>

          <View style={[styles.card, { backgroundColor: theme.card }]}>

            <View style={[styles.inputContainer, { backgroundColor: theme.input }]}>
              <Ionicons name="mail" size={22} color={theme.icon} />
              <TextInput
                placeholder="Email"
                placeholderTextColor={isDarkMode ? "#ccc" : "#444"}
                style={[styles.input, { color: "#000" }]}
              />
            </View>

            <View style={[styles.inputContainer, { backgroundColor: theme.input }]}>
              <Ionicons name="lock-closed" size={22} color={theme.icon} />
              <TextInput
                placeholder="Hasło"
                placeholderTextColor={isDarkMode ? "#ccc" : "#444"}
                secureTextEntry
                style={[styles.input, { color: "#000" }]}
              />
            </View>

            <Pressable style={styles.button}>
              <Text style={styles.buttonText}>
                Zaloguj się
              </Text>
            </Pressable>

            <Pressable
              style={styles.adminButton}
              onPress={() => router.push("/home")}
            >
              <Text style={styles.adminText}>
                Administrator
              </Text>
            </Pressable>

          </View>

          <View style={styles.darkModeContainer}>
            <Text
              style={{
                color: theme.text,
                fontFamily: "DMSans_400Regular"
              }}
            >
              Tryb ciemny
            </Text>

            <Switch
              value={isDarkMode}
              onValueChange={() => setIsDarkMode(!isDarkMode)}
            />
          </View>

        </KeyboardAvoidingView>

      </LinearGradient>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },

  inner: {
    width: "100%",
    alignItems: "center"
  },

  title: {
    fontSize: 42,
    fontFamily: "DMSans_700Bold",
    marginBottom: 6
  },

  subtitle: {
    fontSize: 16,
    fontFamily: "DMSans_400Regular",
    marginBottom: 35
  },

  card: {
    width: "100%",
    padding: 26,
    borderRadius: 22,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)"
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 50,
    paddingHorizontal: 16,
    marginBottom: 16
  },

  input: {
    flex: 1,
    padding: 14,
    fontFamily: "DMSans_400Regular"
  },

  button: {
    backgroundColor: "#22c55e",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 5
  },

  buttonText: {
    color: "white",
    fontSize: 16,
    fontFamily: "DMSans_700Bold"
  },

  adminButton: {
    marginTop: 15,
    alignItems: "center"
  },

  adminText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: "#ffffff",
    textDecorationLine: "underline"
  },

  darkModeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  }

});
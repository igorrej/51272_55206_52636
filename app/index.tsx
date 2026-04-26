import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";

import { auth } from "@/lib/firebase";

export default function Index() {

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Błąd", "Podaj email i hasło");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/home");
    } catch (e: any) {
      Alert.alert("Błąd logowania", e.message);
    }
  };


  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert("Błąd", "Podaj email i hasło");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.replace("/home");
    } catch (e: any) {
      Alert.alert("Błąd rejestracji", e.message);
    }
  };

  return (
    <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.container}>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inner}
      >

        <Text style={styles.title}>CalTrack</Text>

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Hasło"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <Pressable style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Zaloguj się</Text>
        </Pressable>

        <Pressable onPress={handleRegister}>
          <Text style={styles.register}>Zarejestruj się</Text>
        </Pressable>

      </KeyboardAvoidingView>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20
  },

  inner: {
    gap: 15
  },

  title: {
    fontSize: 32,
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20
  },

  input: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 12
  },

  button: {
    backgroundColor: "#22c55e",
    padding: 14,
    borderRadius: 12,
    alignItems: "center"
  },

  buttonText: {
    color: "white",
    fontWeight: "bold"
  },

  register: {
    color: "white",
    textAlign: "center",
    marginTop: 10,
    textDecorationLine: "underline"
  }
});
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useCallback, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";
import {
  useFonts,
  Inter_700Bold,
  Inter_400Regular,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { onAuthStateChanged } from "firebase/auth";

const screenWidth = Dimensions.get("window").width;

const themes: any = {
  green: { primary: "#22c55e", gradient: ["#050a05", "#080808"] },
  blue: { primary: "#3b82f6", gradient: ["#05070a", "#080808"] },
  zloty: { primary: "#C9A227", gradient: ["#0D0900", "#1C1200", "#0D0900"] },
};

const MEAL_TYPES = ["sniadanie", "lunch", "obiad", "kolacja"];

// Ekran statystyk — historia dni, łączne sumy kalorii, kroków i dni z osiągniętym celem wody
export default function Statystyki() {
  const router = useRouter();
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace("/");
    });
    return unsub;
  }, [router]);
  const [days, setDays] = useState<any>({});
  const [settings, setSettings] = useState<any>({ theme: "green" });
  const [createdAt, setCreatedAt] = useState<string>("");

  const [fontsLoaded] = useFonts({
    Inter_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  useFocusEffect(
    useCallback(() => {
      load();
      const user = auth.currentUser;
      if (user?.metadata?.creationTime) {
        const d = new Date(user.metadata.creationTime);
        setCreatedAt(
          d.toLocaleDateString("pl-PL", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }),
        );
      }
    }, []),
  );

  // Wczytuje dane wszystkich dni i ustawienia z Firestore
  const load = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const data = snap.data();
      setSettings(data.settings || { theme: "green" });
      const dayData: any = {};
      Object.keys(data).forEach((k) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k)) dayData[k] = data[k];
      });
      setDays(dayData);
    }
  };

  if (!fontsLoaded) return null;

  const theme = themes[settings?.theme || "green"] ?? themes["green"];

  const sortedDays = Object.keys(days).sort((a, b) => b.localeCompare(a));

  // Suma kalorii ze wszystkich zapisanych dni (obsługuje stary i nowy format posiłków)
  const totalKcalAll = sortedDays.reduce((sum, d) => {
    const meals = days[d]?.meals || {};
    const arr = Array.isArray(meals)
      ? meals
      : MEAL_TYPES.flatMap((t) => meals[t] || []);
    return sum + arr.reduce((s: number, m: any) => s + (m.kcal || 0), 0);
  }, 0);

  const totalStepsAll = sortedDays.reduce(
    (sum, d) => sum + (days[d]?.steps || 0),
    0,
  );

  // Kalorie dla konkretnego dnia — używane w historii
  const getDayKcal = (d: string) => {
    const meals = days[d]?.meals || {};
    const arr = Array.isArray(meals)
      ? meals
      : MEAL_TYPES.flatMap((t) => meals[t] || []);
    return Math.round(arr.reduce((s: number, m: any) => s + (m.kcal || 0), 0));
  };

  // Dni z zapisaną wagą, posortowane chronologicznie
  const weightDays = sortedDays.filter((d) => days[d]?.weight).reverse(); // od najstarszego do najnowszego

  const weightData = weightDays.map((d) => days[d].weight);
  const daysWithWaterGoal = sortedDays.filter(
    (d) => (days[d]?.water || 0) >= 10,
  ).length;

  return (
    <LinearGradient
      colors={theme?.gradient ?? ["#050a05", "#080808"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.primary} />
          </Pressable>
          <Text style={[styles.title, { color: theme.primary }]}>
            STATYSTYKI
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* KONTO */}
          {createdAt ? (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>KONTO OD</Text>
              <Text style={[styles.cardValue, { color: theme.primary }]}>
                {createdAt}
              </Text>
            </View>
          ) : null}

          {/* SUMY GLOBALNE */}
          <View style={styles.row}>
            <View style={[styles.card, { flex: 1 }]}>
              <Text style={styles.cardLabel}>ŁĄCZNE KCAL</Text>
              <Text style={[styles.cardValue, { color: theme.primary }]}>
                {Math.round(totalKcalAll)}
              </Text>
            </View>
            <View style={[styles.card, { flex: 1 }]}>
              <Text style={styles.cardLabel}>ŁĄCZNE KROKI</Text>
              <Text style={[styles.cardValue, { color: theme.primary }]}>
                {totalStepsAll.toLocaleString("pl-PL")}
              </Text>
            </View>
            <View style={[styles.card, { flex: 1 }]}>
              <Text style={styles.cardLabel}>CEL WODY</Text>
              <Text style={[styles.cardValue, { color: theme.primary }]}>
                {daysWithWaterGoal}
              </Text>
              <Text style={{ color: "#444", fontSize: 11, marginTop: 4 }}>
                {daysWithWaterGoal === 1 ? "dzień" : "dni"} z{" "}
                {sortedDays.length}
              </Text>
            </View>
          </View>

          {/* WYKRES WAGI */}
          {weightData.length >= 2 && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>WAGA (KG)</Text>
              <LineChart
                data={{
                  labels: weightDays.map((d) => d.slice(5)),
                  datasets: [{ data: weightData }],
                }}
                width={screenWidth - 52}
                height={180}
                chartConfig={{
                  backgroundGradientFrom: "#111318",
                  backgroundGradientTo: "#111318",
                  color: () => theme.primary,
                  labelColor: () => "#555",
                  propsForDots: { r: "4", fill: theme.primary },
                  decimalPlaces: 1,
                }}
                bezier
                style={{ borderRadius: 12, marginTop: 8 }}
              />
            </View>
          )}
          {weightData.length === 1 && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>WAGA</Text>
              <Text style={[styles.cardValue, { color: theme.primary }]}>
                {weightData[0]} kg
              </Text>
              <Text style={{ color: "#444", fontSize: 11, marginTop: 4 }}>
                Dodaj więcej pomiarów żeby zobaczyć wykres
              </Text>
            </View>
          )}

          {/* HISTORIA DNI */}
          <Text style={styles.sectionLabel}>HISTORIA</Text>
          {sortedDays.length === 0 && (
            <Text style={{ color: "#444", textAlign: "center", marginTop: 20 }}>
              Brak danych
            </Text>
          )}
          {sortedDays.map((d) => {
            const kcal = getDayKcal(d);
            const steps = days[d]?.steps || 0;
            return (
              <View key={d} style={styles.dayRow}>
                <Text style={styles.dayDate}>{d}</Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 4,
                  }}
                >
                  <Text style={[styles.dayKcal, { color: theme.primary }]}>
                    {kcal} kcal
                  </Text>
                  <Text style={styles.daySteps}>
                    {steps.toLocaleString("pl-PL")} 👟
                  </Text>
                  {days[d]?.weight ? (
                    <Text style={{ color: "#666", fontSize: 13 }}>
                      {days[d].weight} kg ⚖️
                    </Text>
                  ) : null}
                  {days[d]?.water ? (
                    <Text style={{ color: "#666", fontSize: 13 }}>
                      {days[d].water * 200} ml 💧
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff08",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, letterSpacing: 2 },

  row: { flexDirection: "row", gap: 10, marginBottom: 10 },
  card: {
    backgroundColor: "#111318",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  cardLabel: {
    color: "#444",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginBottom: 6,
  },
  cardValue: { fontSize: 24, fontFamily: "Inter_700Bold" },

  sectionLabel: {
    color: "#333",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 10,
  },

  dayRow: {
    flexDirection: "column",
    alignItems: "flex-start",
    backgroundColor: "#111318",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  dayDate: { color: "#666", fontFamily: "Inter_400Regular", fontSize: 13 },
  dayKcal: { fontFamily: "Inter_700Bold", fontSize: 14 },
  daySteps: { color: "#555", fontSize: 13 },
});

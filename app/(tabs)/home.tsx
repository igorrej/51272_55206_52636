import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
//import Slider from "@react-native-community/slider";
import { Pedometer } from "expo-sensors";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useState, useEffect, useRef } from "react";

import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "expo-router";

import { LineChart } from "react-native-chart-kit";
import { searchFood, parseFoodItem, getFoodByBarcode } from "@/lib/fatsecret";
import { CameraView, useCameraPermissions } from "expo-camera";

const screenWidth = Dimensions.get("window").width;

const getDateKey = (d: Date) => d.toISOString().split("T")[0];

const getLastNDays = (n: number) => {
  const arr = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    arr.push(getDateKey(d));
  }
  return arr;
};

// Definicje motywów kolorystycznych — primary to kolor akcentu, gradient to tło
const themes: any = {
  green: { primary: "#22c55e", gradient: ["#050a05", "#080808"] },
  blue: { primary: "#3b82f6", gradient: ["#05070a", "#080808"] },
  zloty: { primary: "#C9A227", gradient: ["#0D0900", "#1C1200", "#0D0900"] },
};

export default function Home() {
  const router = useRouter();

  const [activeDay, setActiveDay] = useState(getDateKey(new Date()));
  const [data, setData] = useState<any>({});
  const [settings, setSettings] = useState<any>({ theme: "green" });

  const [modalVisible, setModalVisible] = useState(false);
  const [chartVisible, setChartVisible] = useState(false);
  const [mealType, setMealType] = useState<
    "sniadanie" | "lunch" | "obiad" | "kolacja"
  >("sniadanie");

  const [name, setName] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [carbs, setCarbs] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [premiumVisible, setPremiumVisible] = useState(false);
  const calendarRef = useRef<ScrollView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Nasłuchuje zmiany stanu auth — wylogowuje do ekranu głównego gdy sesja wygaśnie
  // onSnapshot subskrybuje zmiany w Firestore i aktualizuje dane w czasie rzeczywistym
  useEffect(() => {
    let unsubSnap: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubSnap) {
        unsubSnap();
        unsubSnap = null;
      }
      if (!user) {
        router.replace("/");
        return;
      }

      unsubSnap = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        setSettings(d.settings || { theme: "green" });
        const dayData: any = {};
        Object.keys(d).forEach((k) => {
          if (/^\d{4}-\d{2}-\d{2}$/.test(k)) dayData[k] = d[k];
        });
        setData(dayData);
      });
    });

    return () => {
      unsubAuth();
      if (unsubSnap) unsubSnap();
    };
  }, [router]);

  // Pobiera kroki z Pedometru przy zmianie aktywnego dnia
  useEffect(() => {
    fetchSteps(activeDay);
  }, [activeDay]);

  // Zapisuje dane dnia do Firestore z merge — nie nadpisuje innych pól dokumentu
  const saveData = async (newData: any) => {
    const user = auth.currentUser;

    if (!user) return;

    const ref = doc(db, "users", user.uid);
    await setDoc(ref, newData, { merge: true });
    setData(newData);
  };

  useEffect(() => {
    setTimeout(() => {
      calendarRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#22c55e" />
      </View>
    );
  }

  const theme = themes[settings?.theme || "green"];

  const rawMeals = data[activeDay]?.meals || [];
  const meals = Array.isArray(rawMeals)
    ? { sniadanie: rawMeals, lunch: [], obiad: [], kolacja: [] }
    : rawMeals;

  const current = {
    meals: {
      sniadanie: meals.sniadanie || [],
      lunch: meals.lunch || [],
      obiad: meals.obiad || [],
      kolacja: meals.kolacja || [],
    },
  };

  const todaySteps = data[activeDay]?.steps || 0;
  const stepGoal = settings?.stepGoal || 10000;

  // Slider do kroków jest fajny, ale niestety Google Fit i Apple Health nie pozwalają na ręczne ustawianie kroków, więc musi chwilowo zniknąć...
  //const saveSteps = (val: number) => {
  //const updated = { ...data, [activeDay]: { ...data[activeDay], steps: Math.round(val) } };
  //saveData(updated);
  //};

  // Czyta kroki z wbudowanego licznika kroków iPhone (CoreMotion)
  // Używa Math.max — ręcznie ustawiona wyższa wartość nie zostanie nadpisana
  async function fetchSteps(day: string) {
    const isAvailable = await Pedometer.isAvailableAsync();
    if (!isAvailable) return;
    const start = new Date(day + "T00:00:00");
    const end = new Date(day + "T23:59:59");
    try {
      const result = await Pedometer.getStepCountAsync(start, end);
      if (result?.steps) {
        const user = auth.currentUser;
        if (!user) return;
        setData((prev: any) => {
          const current = prev[day]?.steps || 0;
          const best = Math.max(result.steps, current);
          if (best > current) {
            setDoc(
              doc(db, "users", user.uid),
              { [day]: { steps: best } },
              { merge: true },
            );
          }
          return { ...prev, [day]: { ...prev[day], steps: best } };
        });
      }
    } catch (e) {
      console.log("Pedometer error:", e);
    }
  }

  const closeModal = () => {
    setModalVisible(false);
    setName("");
    setProtein("");
    setFat("");
    setCarbs("");
    setResults([]);
  };

  const buyPremium = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? snap.data() : {};
    await setDoc(ref, {
      ...existing,
      settings: { ...existing.settings, premium: true },
    });
    setSettings((prev: any) => ({ ...prev, premium: true }));
    setPremiumVisible(false);
  };
  // Dodaje posiłek do aktywnego dnia i kategorii (śniadanie/lunch/obiad/kolacja)
  const addMeal = () => {
    if (!name) return;
    const p = Number(protein) || 0;
    const f = Number(fat) || 0;
    const c = Number(carbs) || 0;
    const kcal = p * 4 + c * 4 + f * 9;
    const meal = { name, protein: p, fat: f, carbs: c, kcal };
    const updated = {
      ...data,
      [activeDay]: {
        ...data[activeDay],
        meals: {
          ...current.meals,
          [mealType]: [...current.meals[mealType], meal],
        },
      },
    };

    saveData(updated);
    closeModal();
  };
  // Usuwa posiłek z danej kategorii po indeksie
  const removeMeal = (
    type: "sniadanie" | "lunch" | "obiad" | "kolacja",
    index: number,
  ) => {
    const updated = {
      ...data,
      [activeDay]: {
        ...data[activeDay],
        meals: {
          ...current.meals,
          [type]: current.meals[type].filter(
            (_: any, i: number) => i !== index,
          ),
        },
      },
    };
    saveData(updated);
  };

  // Wyszukuje produkty w bazie FatSecret przez Cloud Function
  const findFood = async () => {
    try {
      if (!name) return;

      const foods = await searchFood(name);

      setResults(Array.isArray(foods) ? foods : foods ? [foods] : []);
    } catch (e) {
      console.log("FATSECRET:", e);

      setResults([]);
    }
  };
  // Obsługuje zeskanowany kod kreskowy — pobiera produkt z Open Food Facts i dodaje go do posiłków
  const handleBarcodeScan = async ({ data: barcode }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setScannerVisible(false);

    const food = await getFoodByBarcode(barcode);
    if (!food) {
      setScanned(false);
      return;
    }

    const meal = {
      name: food.name,
      protein: food.protein,
      fat: food.fat,
      carbs: food.carbs,
      kcal: food.calories,
    };

    const updated = {
      ...data,
      [activeDay]: {
        ...data[activeDay],
        meals: {
          ...current.meals,
          [mealType]: [...current.meals[mealType], meal],
        },
      },
    };

    await saveData(updated);
    setResults([]);
    setModalVisible(false);
    setScanned(false);
  };

  const openScanner = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (result.granted) {
        setModalVisible(false);
        setScannerVisible(true);
      }
      return;
    }
    setModalVisible(false);
    setScannerVisible(true);
  };

  const allMeals = [
    ...current.meals.sniadanie,
    ...current.meals.lunch,
    ...current.meals.obiad,
    ...current.meals.kolacja,
  ];

  const totalProtein = allMeals.reduce((s: any, m: any) => s + m.protein, 0);
  const totalFat = allMeals.reduce((s: any, m: any) => s + m.fat, 0);
  const totalCarbs = allMeals.reduce((s: any, m: any) => s + m.carbs, 0);
  const totalKcal = allMeals.reduce((s: any, m: any) => s + m.kcal, 0);

  const calorieGoal = settings?.calorieGoal || 2000;

  const last7 = getLastNDays(7);
  const DAY_LETTERS = ["N", "P", "W", "Ś", "C", "P", "S"];

  // Kalorie z ostatnich 7 dni do wykresu
  const weekCalories = last7.map((d) => {
    const day = data[d];
    if (!day) return 0;

    const meals = day.meals;

    if (Array.isArray(meals)) {
      return meals.reduce((s: any, m: any) => s + m.kcal, 0);
    }

    return [
      ...(meals?.sniadanie || []),
      ...(meals?.lunch || []),
      ...(meals?.obiad || []),
      ...(meals?.kolacja || []),
    ].reduce((s: any, m: any) => s + m.kcal, 0);
  });

  const chartData = {
    labels: last7.map((d) => d.slice(5)),
    datasets: [
      {
        data: weekCalories.some((v) => v > 0) ? weekCalories : [1],
      },
    ],
  };

  const calendarDays = getLastNDays(30);

  return (
    <LinearGradient
      colors={[
        theme.primary,
        theme.primary,
        theme.gradient[0],
        theme.gradient[1],
      ]}
      locations={[0, 0.12, 0.13, 1]}
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
        {/* HEADER */}
        <View style={[styles.topBar, { backgroundColor: theme.primary }]}>
          <Text style={styles.logo}>CalTrack</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 210 }}>
          {/* KALENDARZ */}
          <ScrollView ref={calendarRef} horizontal style={styles.calendar}>
            {calendarDays.map((d) => {
              const date = new Date(d + "T12:00:00");
              const letter = DAY_LETTERS[date.getDay()];
              const active = activeDay === d;
              return (
                <Pressable key={d} onPress={() => setActiveDay(d)}>
                  <View
                    style={[
                      styles.day,
                      active && { backgroundColor: theme.primary },
                    ]}
                  >
                    <Text
                      style={[styles.dayLetter, active && { color: "#000" }]}
                    >
                      {letter}
                    </Text>
                    <Text style={[styles.dayText, active && { color: "#000" }]}>
                      {d.slice(5)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* KROKI */}
          <View style={styles.stepsCard}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <Text style={styles.stepsLabel}>KROKI</Text>
              <Text style={[styles.stepsValue, { color: theme.primary }]}>
                {todaySteps} / {stepGoal}
              </Text>
            </View>
            {/* <Slider
                    style={{width:"100%",height:36}}
                    minimumValue={0}
                    maximumValue={stepGoal * 1.5}
                    value={todaySteps}
                    step={100}
                    minimumTrackTintColor={theme.primary}
                    maximumTrackTintColor="#1a1a1a"
                    thumbTintColor={theme.primary}
                    onSlidingComplete={saveSteps}
                  /> */}
          </View>

          {/* SEKCJE */}
          {(["sniadanie", "lunch", "obiad", "kolacja"] as const).map((type) => {
            const label =
              type === "sniadanie"
                ? "ŚNIADANIE"
                : type === "lunch"
                  ? "LUNCH"
                  : type === "obiad"
                    ? "OBIAD"
                    : "KOLACJA";
            const sectionMeals = current.meals[type];
            const sp = Math.round(
              sectionMeals.reduce((s: any, m: any) => s + m.protein, 0),
            );
            const sf = Math.round(
              sectionMeals.reduce((s: any, m: any) => s + m.fat, 0),
            );
            const sc = Math.round(
              sectionMeals.reduce((s: any, m: any) => s + m.carbs, 0),
            );
            return (
              <View key={type} style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.sectionTitle}>{label}</Text>
                  <Pressable
                    onPress={() => {
                      setMealType(type);
                      setModalVisible(true);
                    }}
                  >
                    <Text style={[styles.addPlus, { color: theme.primary }]}>
                      +
                    </Text>
                  </Pressable>
                </View>
                {sectionMeals.map((item: any, index: number) => (
                  <Animated.View
                    key={index}
                    entering={FadeInDown.delay(index * 40)}
                    style={styles.meal}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{item.name}</Text>
                      <Text style={styles.kcal}>
                        {Math.round(item.kcal)} kcal
                      </Text>
                    </View>
                    <Pressable onPress={() => removeMeal(type, index)}>
                      <Ionicons name="close" size={16} color="#ef4444" />
                    </Pressable>
                  </Animated.View>
                ))}
                <View style={styles.macroRow}>
                  <Text style={styles.macroB}>
                    {sp}
                    <Text style={styles.macroSuffix}>B</Text>
                  </Text>
                  <Text style={styles.macroDivider}> | </Text>
                  <Text style={styles.macroT}>
                    {sf}
                    <Text style={styles.macroSuffix}>T</Text>
                  </Text>
                  <Text style={styles.macroDivider}> | </Text>
                  <Text style={styles.macroW}>
                    {sc}
                    <Text style={styles.macroSuffix}>W</Text>
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* DOLNY PANEL */}
        <View style={styles.bottomWrap}>
          <View style={[styles.bottomBar, { borderColor: theme.primary }]}>
            <Text style={[styles.kcalBig, { color: theme.primary }]}>
              {Math.round(totalKcal)}/{calorieGoal} KCAL
            </Text>
            <Text style={styles.macroDivider}> | </Text>
            <Text style={styles.macroB}>
              {Math.round(totalProtein)}
              <Text style={styles.macroSuffix}>B</Text>
            </Text>
            <Text style={styles.macroDivider}> | </Text>
            <Text style={styles.macroT}>
              {Math.round(totalFat)}
              <Text style={styles.macroSuffix}>T</Text>
            </Text>
            <Text style={styles.macroDivider}> | </Text>
            <Text style={styles.macroW}>
              {Math.round(totalCarbs)}
              <Text style={styles.macroSuffix}>W</Text>
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width:
                    `${Math.min(totalKcal / calorieGoal, 1) * 100}%` as any,
                  backgroundColor: theme.primary,
                },
              ]}
            />
          </View>
        </View>

        {/* PREMIUM */}
        <Modal visible={premiumVisible} transparent animationType="fade">
          <BlurView intensity={60} style={styles.modalWrap}>
            <LinearGradient
              colors={["#1a1200", "#3d2b00", "#1a1200"]}
              style={styles.premiumBox}
            >
              <Text style={styles.premiumStar}>⭐</Text>
              <Text style={styles.premiumTitle}>CalTrack</Text>
              <Text style={styles.premiumSub}>PREMIUM</Text>
              <Text style={styles.premiumDesc}>
                Odblokuj ekskluzywny złoty motyw i wspieraj rozwój aplikacji.
              </Text>

              <Pressable style={styles.premiumBtn} onPress={buyPremium}>
                <Text style={styles.premiumBtnText}>KUP PREMIUM</Text>
              </Pressable>

              {settings?.premium && (
                <Text
                  style={{
                    color: "#FFD700",
                    textAlign: "center",
                    marginTop: 12,
                    fontFamily: "Inter_600SemiBold",
                  }}
                >
                  ✓ Masz już Premium!
                </Text>
              )}

              <Pressable
                onPress={() => setPremiumVisible(false)}
                style={{ marginTop: 16 }}
              >
                <Text style={{ color: "#555", textAlign: "center" }}>
                  Zamknij
                </Text>
              </Pressable>
            </LinearGradient>
          </BlurView>
        </Modal>

        {/* WYKRES */}
        <Modal visible={chartVisible} transparent animationType="fade">
          <BlurView intensity={40} style={styles.modalWrap}>
            <View style={styles.chartModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Wykres tygodniowy</Text>
                <Pressable onPress={() => setChartVisible(false)}>
                  <Ionicons name="close" size={24} color="white" />
                </Pressable>
              </View>

              <LineChart
                data={chartData}
                width={screenWidth - 40}
                height={220}
                chartConfig={{
                  backgroundGradientFrom: "#020617",
                  backgroundGradientTo: "#020617",
                  color: () => theme.primary,
                  labelColor: () => "#94a3b8",
                }}
              />
            </View>
          </BlurView>
        </Modal>

        {/* MODAL DODAWANIA */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <BlurView intensity={40} style={styles.modalWrap}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {mealType === "sniadanie"
                    ? "Śniadanie"
                    : mealType === "obiad"
                      ? "Obiad"
                      : "Kolacja"}
                </Text>
                <Pressable onPress={closeModal}>
                  <Ionicons name="close" size={24} color="white" />
                </Pressable>
              </View>

              <TextInput
                placeholder="Nazwa"
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholderTextColor="#94a3b8"
              />
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                <Pressable
                  style={[
                    styles.button,
                    { backgroundColor: "#334155", flex: 1 },
                  ]}
                  onPress={findFood}
                >
                  <Text style={{ color: "white" }}>Szukaj</Text>
                </Pressable>
                {Platform.OS !== "web" && (
                  <Pressable
                    style={[
                      styles.button,
                      { backgroundColor: "#334155", paddingHorizontal: 16 },
                    ]}
                    onPress={openScanner}
                  >
                    <Ionicons name="barcode-outline" size={20} color="white" />
                  </Pressable>
                )}
              </View>

              <ScrollView
                style={{
                  maxHeight: 250,
                  marginBottom: 10,
                }}
                keyboardShouldPersistTaps="always"
                nestedScrollEnabled
              >
                {results.map((item: any) => (
                  <Pressable
                    key={item.food_id}
                    style={{
                      padding: 10,
                      marginBottom: 8,
                      backgroundColor: "#ffffff10",
                      borderRadius: 10,
                    }}
                    onPress={() => {
                      const food = parseFoodItem(item);
                      const meal = {
                        name: food.name,
                        protein: food.protein,
                        fat: food.fat,
                        carbs: food.carbs,
                        kcal: food.calories,
                      };
                      const updated = {
                        ...data,
                        [activeDay]: {
                          ...data[activeDay],
                          meals: {
                            ...current.meals,
                            [mealType]: [...current.meals[mealType], meal],
                          },
                        },
                      };
                      saveData(updated);
                      setResults([]);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={{ color: "white" }}>{item.food_name}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <TextInput
                placeholder="Białko"
                value={protein}
                keyboardType="numeric"
                onChangeText={setProtein}
                style={styles.input}
                placeholderTextColor="#94a3b8"
              />
              <TextInput
                placeholder="Tłuszcz"
                value={fat}
                keyboardType="numeric"
                onChangeText={setFat}
                style={styles.input}
                placeholderTextColor="#94a3b8"
              />
              <TextInput
                placeholder="Węglowodany"
                value={carbs}
                keyboardType="numeric"
                onChangeText={setCarbs}
                style={styles.input}
                placeholderTextColor="#94a3b8"
              />

              {settings?.theme === "zloty" ? (
                <LinearGradient
                  colors={["#B8860B", "#FFD700", "#B8860B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 12 }}
                >
                  <Pressable style={[styles.button]} onPress={addMeal}>
                    <Text
                      style={{ color: "#1a1200", fontFamily: "Inter_700Bold" }}
                    >
                      Dodaj ręcznie
                    </Text>
                  </Pressable>
                </LinearGradient>
              ) : (
                <Pressable
                  style={[styles.button, { backgroundColor: theme.primary }]}
                  onPress={addMeal}
                >
                  <Text style={{ color: "white" }}>Dodaj ręcznie</Text>
                </Pressable>
              )}
            </View>
          </BlurView>
        </Modal>

        {scannerVisible && (
          <View style={StyleSheet.absoluteFillObject}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
              barcodeScannerSettings={{
                barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
              }}
            />
            <Pressable
              style={{
                position: "absolute",
                top: 50,
                right: 20,
                backgroundColor: "#00000080",
                borderRadius: 20,
                padding: 8,
              }}
              onPress={() => {
                setScannerVisible(false);
                setScanned(false);
                setModalVisible(true);
              }}
            >
              <Ionicons name="close" size={28} color="white" />
            </Pressable>
            <View
              style={{ position: "absolute", bottom: 60, alignSelf: "center" }}
            >
              <Text style={{ color: "white", fontSize: 14 }}>
                Nakieruj na kod kreskowy produktu
              </Text>
            </View>
          </View>
        )}
        {!scannerVisible && (
          <View style={styles.tabBar}>
            <Pressable
              style={styles.tabItem}
              onPress={() => setChartVisible(true)}
            >
              <Ionicons name="bar-chart-outline" size={22} color="#555" />
            </Pressable>
            <Pressable
              style={styles.tabItem}
              onPress={() => router.push("/statystyki")}
            >
              <Ionicons name="stats-chart-outline" size={22} color="#555" />
            </Pressable>
            <Pressable
              style={[styles.tabItem, styles.tabCenter]}
              onPress={() => setPremiumVisible(true)}
            >
              <Ionicons name="star" size={24} color="#b8860b" />
            </Pressable>
            <Pressable
              style={styles.tabItem}
              onPress={() => router.push("/settings")}
            >
              <Ionicons name="settings-outline" size={22} color="#555" />
            </Pressable>
            <Pressable
              style={styles.tabItem}
              onPress={async () => {
                try {
                  await signOut(auth);
                  router.replace("/");
                } catch {}
              }}
            >
              <Ionicons name="log-out-outline" size={22} color="#ef4444" />
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#050505",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  logo: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#050a05" },

  calendar: { paddingHorizontal: 20, marginBottom: 10, marginTop: 14 },
  day: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "#ffffff08",
    marginRight: 6,
    minWidth: 44,
  },
  dayLetter: { color: "white", fontFamily: "Inter_700Bold", fontSize: 13 },
  dayText: { color: "#555", fontSize: 10, marginTop: 2 },

  card: {
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: "#111318",
    borderRadius: 18,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionTitle: {
    color: "white",
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: 1,
  },
  addPlus: { fontSize: 28, lineHeight: 32 },
  meal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 5,
  },
  name: { color: "white", fontSize: 13 },
  kcal: { color: "#555", fontSize: 11 },

  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  macroDivider: { color: "#333", fontSize: 14 },
  macroSuffix: { fontSize: 11 },
  macroB: { color: "#22c55e", fontSize: 14, fontFamily: "Inter_700Bold" },
  macroT: { color: "#f97316", fontSize: 14, fontFamily: "Inter_700Bold" },
  macroW: { color: "#3b82f6", fontSize: 14, fontFamily: "Inter_700Bold" },

  bottomWrap: {
    position: "absolute",
    bottom: 70,
    left: 0,
    right: 0,
    padding: 16,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#080808",
    gap: 2,
  },
  kcalBig: { fontFamily: "Inter_700Bold", fontSize: 13 },
  progressTrack: {
    height: 4,
    backgroundColor: "#1a1a1a",
    borderRadius: 4,
    marginTop: 6,
    overflow: "hidden",
  },
  progressFill: { height: 4, borderRadius: 4 },

  modalWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modal: {
    width: "100%",
    backgroundColor: "#0a0a0a",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  chartModal: { backgroundColor: "#0a0a0a", padding: 20, borderRadius: 20 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { color: "white", fontSize: 17, fontFamily: "Inter_700Bold" },

  input: {
    backgroundColor: "#111318",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    color: "white",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  button: { padding: 12, borderRadius: 12, alignItems: "center" },
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#0a0a0a",
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
    paddingBottom: 20,
    paddingTop: 10,
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabCenter: {
    backgroundColor: "#1a1200",
    borderRadius: 28,
    marginHorizontal: 6,
    paddingVertical: 6,
  },
  stepsCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#ffffff10",
  },
  stepsLabel: { color: "white", fontFamily: "Inter_700Bold", fontSize: 14 },
  stepsValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  premiumBox: {
    width: "85%",
    padding: 28,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFD70044",
  },
  premiumStar: { fontSize: 48, marginBottom: 8 },
  premiumTitle: {
    color: "#FFD700",
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: 3,
  },
  premiumSub: {
    color: "#b8860b",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 6,
    marginBottom: 16,
  },
  premiumDesc: {
    color: "#888",
    textAlign: "center",
    fontSize: 13,
    marginBottom: 24,
    lineHeight: 20,
  },
  premiumBtn: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  premiumBtnText: {
    color: "#1a1200",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: 2,
  },
});

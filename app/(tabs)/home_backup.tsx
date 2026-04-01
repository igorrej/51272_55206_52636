import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";

export default function Home() {

  // 🔥 LISTA
  const meals = [
    { id: 1, name: "Kurczak z ryżem", protein: 30, fat: 5, carbs: 40 },
    { id: 2, name: "Jajecznica", protein: 18, fat: 15, carbs: 2 },
    { id: 3, name: "Owsianka", protein: 6, fat: 3, carbs: 35 },
    { id: 4, name: "Kanapka z serem", protein: 10, fat: 8, carbs: 25 },
    { id: 5, name: "Makaron", protein: 8, fat: 2, carbs: 50 },
    { id: 6, name: "Ryż", protein: 4, fat: 1, carbs: 45 },
    { id: 7, name: "Tuńczyk", protein: 25, fat: 3, carbs: 0 },
    { id: 8, name: "Sałatka", protein: 5, fat: 2, carbs: 10 },
    { id: 9, name: "Pizza", protein: 12, fat: 15, carbs: 60 },
    { id: 10, name: "Burger", protein: 20, fat: 25, carbs: 40 }
  ];

  const [modalVisible, setModalVisible] = useState(false);
  const [addedMeals, setAddedMeals] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filteredMeals, setFilteredMeals] = useState(meals);

  const steps = 7200;
  const stepGoal = 10000;
  const calorieGoal = 2000;

  useEffect(() => {
    loadMeals();
  }, []);

  const loadMeals = async () => {
    const data = await AsyncStorage.getItem("meals");
    if (data) setAddedMeals(JSON.parse(data));
  };

  const saveMeals = async (newMeals: any[]) => {
    setAddedMeals(newMeals);
    await AsyncStorage.setItem("meals", JSON.stringify(newMeals));
  };

  const addMeal = (meal: any) => {
    const updated = [...addedMeals, meal];
    saveMeals(updated);
    setModalVisible(false);
    setSearch("");
    setFilteredMeals(meals);
  };

  const removeMeal = (index: number) => {
    const updated = addedMeals.filter((_, i) => i !== index);
    saveMeals(updated);
  };

  // 🔥 WYSZUKIWANIE
  const handleSearch = (text: string) => {
    setSearch(text);

    const filtered = meals.filter(m =>
      m.name.toLowerCase().includes(text.toLowerCase())
    );

    setFilteredMeals(filtered);
  };

  const protein = addedMeals.reduce((s, m) => s + (m.protein || 0), 0);
  const fat = addedMeals.reduce((s, m) => s + (m.fat || 0), 0);
  const carbs = addedMeals.reduce((s, m) => s + (m.carbs || 0), 0);

  const calories = protein * 4 + carbs * 4 + fat * 9;

  const caloriePercent = Math.min(Math.round((calories / calorieGoal) * 100), 100);
  const stepPercent = Math.min(Math.round((steps / stepGoal) * 100), 100);

  const macroTotal = protein + fat + carbs || 1;

  return (
    <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.container}>

      {/* TOP */}
      <View style={styles.topBar}>
        <Text style={styles.logo}>CalTrack</Text>
      </View>

      {/* POSIŁKI */}
      <View style={styles.mealsWrapper}>
        <Text style={styles.sectionTitle}>Twoje posiłki</Text>

        <FlatList
          data={addedMeals}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={<Text style={styles.empty}>Brak posiłków</Text>}
          renderItem={({ item, index }) => (
            <View style={styles.mealCard}>
              <View>
                <Text style={styles.mealName}>{item.name}</Text>
                <Text style={styles.mealMacro}>
                  B:{item.protein} T:{item.fat} W:{item.carbs}
                </Text>
              </View>

              <Pressable onPress={() => removeMeal(index)}>
                <Ionicons name="close-circle" size={22} color="#ff6b6b" />
              </Pressable>
            </View>
          )}
        />
      </View>

      {/* DÓŁ */}
      <View style={styles.bottomContainer}>

        <View style={styles.card}>
          <View style={styles.header}>
            <Ionicons name="flame" size={18} color="#ff6b6b" />
            <Text style={styles.label}>Kalorie</Text>
          </View>

          <Text style={styles.value}>
            {calories} / {calorieGoal} kcal
          </Text>

          <View style={styles.progressBar}>
            <View style={{ width: `${(protein / macroTotal) * 100}%`, backgroundColor: "#4ade80" }}/>
            <View style={{ width: `${(fat / macroTotal) * 100}%`, backgroundColor: "#facc15" }}/>
            <View style={{ width: `${(carbs / macroTotal) * 100}%`, backgroundColor: "#60a5fa" }}/>
          </View>

          <Text style={styles.percent}>{caloriePercent}% celu</Text>

          <Pressable style={styles.button} onPress={() => setModalVisible(true)}>
            <Text style={styles.buttonText}>Dodaj posiłek</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.header}>
            <Ionicons name="walk" size={18} color="#4ade80" />
            <Text style={styles.label}>Kroki</Text>
          </View>

          <Text style={styles.value}>
            {steps} / {stepGoal}
          </Text>

          <View style={styles.progressBar}>
            <View style={{ width: `${stepPercent}%`, backgroundColor: "#4ade80" }}/>
          </View>

          <Text style={styles.percent}>{stepPercent}% celu</Text>
        </View>

      </View>

      {/* MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >

          <View style={styles.modalBackground}>
            <View style={styles.modalContent}>

              <Text style={styles.modalTitle}>Dodaj posiłek</Text>

              <TextInput
                placeholder="Szukaj..."
                placeholderTextColor="#aaa"
                value={search}
                onChangeText={handleSearch}
                style={styles.search}
              />

              {/* 🔥 NAJWAŻNIEJSZY FIX */}
              <View style={{ flex: 1 }}>

                <FlatList
                  data={filteredMeals}
                  keyExtractor={(item) => item.id.toString()}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <Pressable onPress={() => addMeal(item)}>
                      <View style={styles.modalItem}>
                        <Text style={styles.modalText}>{item.name}</Text>
                        <Text style={{ color: "#aaa", fontSize: 12 }}>
                          B:{item.protein} T:{item.fat} W:{item.carbs}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                />

              </View>

              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.close}>Zamknij</Text>
              </Pressable>

            </View>
          </View>

        </KeyboardAvoidingView>

      </Modal>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, justifyContent:"space-between" },

  topBar:{
    backgroundColor:"rgba(255,255,255,0.08)",
    paddingTop:60,
    paddingBottom:14,
    paddingLeft:20
  },

  logo:{ fontSize:28, fontWeight:"bold", color:"white" },

  mealsWrapper:{ flex:1, paddingHorizontal:20, marginTop:10 },

  sectionTitle:{ color:"white", fontSize:18, marginBottom:10 },

  empty:{ color:"rgba(255,255,255,0.6)" },

  mealCard:{
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems:"center",
    backgroundColor:"rgba(255,255,255,0.08)",
    padding:14,
    borderRadius:18,
    marginBottom:10
  },

  mealName:{ color:"white", fontWeight:"bold" },
  mealMacro:{ color:"rgba(255,255,255,0.7)", fontSize:12 },

  bottomContainer:{ padding:20, gap:12 },

  card:{
    backgroundColor:"rgba(255,255,255,0.08)",
    borderRadius:20,
    padding:16
  },

  header:{ flexDirection:"row", gap:6 },
  label:{ color:"white" },

  value:{ color:"white", fontSize:18 },

  progressBar:{
    height:10,
    backgroundColor:"rgba(255,255,255,0.25)",
    borderRadius:10,
    flexDirection:"row",
    overflow:"hidden",
    marginVertical:8
  },

  percent:{ color:"white", fontSize:12 },

  button:{
    marginTop:10,
    backgroundColor:"#22c55e",
    padding:12,
    borderRadius:14,
    alignItems:"center"
  },

  buttonText:{ color:"white", fontWeight:"bold" },

  modalBackground:{
    flex:1,
    backgroundColor:"rgba(0,0,0,0.7)",
    justifyContent:"flex-end"
  },

  modalContent:{
    height:"85%",
    backgroundColor:"#1e1e2e",
    borderTopLeftRadius:24,
    borderTopRightRadius:24,
    padding:20
  },

  modalTitle:{ color:"white", fontSize:18, marginBottom:10 },

  search:{
    backgroundColor:"#2a2a3d",
    color:"white",
    padding:12,
    borderRadius:12,
    marginBottom:10
  },

  modalItem:{
    padding:14,
    borderBottomWidth:1,
    borderColor:"rgba(255,255,255,0.08)"
  },

  modalText:{ color:"white" },

  close:{
    color:"#22c55e",
    textAlign:"center",
    marginTop:12
  }
});
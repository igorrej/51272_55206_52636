import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { meals } from "./meals";

export default function Home() {

  const [modalVisible, setModalVisible] = useState(false);
  const [addedMeals, setAddedMeals] = useState<any[]>([]);
  const [search, setSearch] = useState("");

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
  };

  const removeMeal = (index: number) => {
    const updated = addedMeals.filter((_, i) => i !== index);
    saveMeals(updated);
  };

  const filteredMeals = meals.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

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
          ListEmptyComponent={
            <Text style={styles.empty}>Brak posiłków</Text>
          }
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

        {/* KALORIE */}
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

        {/* KROKI */}
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
                onChangeText={setSearch}
                style={styles.search}
              />

              <FlatList
                data={filteredMeals}
                keyExtractor={(item) => item.id.toString()}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 40 }}
                renderItem={({ item }) => (
                  <Pressable onPress={() => addMeal(item)}>
                    <View style={styles.modalItem}>
                      <Text style={styles.modalText}>{item.name}</Text>
                    </View>
                  </Pressable>
                )}
              />

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
paddingLeft:20,
borderBottomWidth:1,
borderColor:"rgba(255,255,255,0.15)"
},

logo:{
fontSize:28,
fontWeight:"bold",
color:"white"
},

mealsWrapper:{
flex:1,
paddingHorizontal:20,
marginTop:10
},

sectionTitle:{
color:"white",
fontSize:18,
marginBottom:10
},

empty:{ color:"rgba(255,255,255,0.6)" },

mealCard:{
flexDirection:"row",
justifyContent:"space-between",
alignItems:"center",
backgroundColor:"rgba(255,255,255,0.08)",
padding:14,
borderRadius:18,
marginBottom:10,
borderWidth:1,
borderColor:"rgba(255,255,255,0.25)",
shadowColor:"#000",
shadowOpacity:0.25,
shadowRadius:12,
shadowOffset:{ width:0, height:6 },
elevation:6
},

mealName:{ color:"white", fontWeight:"bold" },
mealMacro:{ color:"rgba(255,255,255,0.7)", fontSize:12 },

bottomContainer:{
padding:20,
gap:12
},

card:{
backgroundColor:"rgba(255,255,255,0.08)",
borderRadius:20,
padding:16,
borderWidth:1.2,
borderColor:"rgba(255,255,255,0.3)",
shadowColor:"#000",
shadowOpacity:0.3,
shadowRadius:14,
shadowOffset:{ width:0, height:8 },
elevation:8
},

header:{ flexDirection:"row", gap:6, alignItems:"center" },

label:{ color:"rgba(255,255,255,0.9)" },

value:{
fontSize:20,
color:"white",
fontWeight:"bold",
marginTop:4
},

progressBar:{
height:10,
backgroundColor:"rgba(255,255,255,0.25)",
borderRadius:10,
flexDirection:"row",
overflow:"hidden",
marginVertical:8
},

percent:{
color:"rgba(255,255,255,0.8)",
fontSize:12
},

button:{
marginTop:10,
backgroundColor:"rgba(34,197,94,0.8)",
padding:12,
borderRadius:14,
alignItems:"center",
shadowColor:"#000",
shadowOpacity:0.3,
shadowRadius:8,
shadowOffset:{ width:0, height:4 }
},

buttonText:{
color:"white",
fontWeight:"bold"
},

modalBackground:{
flex:1,
backgroundColor:"rgba(0,0,0,0.7)",
justifyContent:"flex-end"
},

modalContent:{
backgroundColor:"#1e1e2e",
borderTopLeftRadius:24,
borderTopRightRadius:24,
padding:20,
maxHeight:"85%"
},

modalTitle:{
color:"white",
fontSize:18,
marginBottom:10,
fontWeight:"bold"
},

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
marginTop:12,
fontWeight:"bold"
}

});
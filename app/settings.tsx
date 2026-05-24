import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

import { LinearGradient } from "expo-linear-gradient";

// 🎨 MOTYWY
const themes:any = {
  green: { primary:"#22c55e", gradient:["#020617","#0f172a"] },
  red: { primary:"#ef4444", gradient:["#1f0a0a","#450a0a"] },
  blue: { primary:"#3b82f6", gradient:["#020617","#0c1a3a"] },
  purple: { primary:"#a855f7", gradient:["#140a1f","#2a0a45"] },
  orange: { primary:"#f97316", gradient:["#1f120a","#45210a"] }
};

// ⚡ AKTYWNOŚĆ
const activityLevels:any = {
  low: 1.2,
  light: 1.375,
  medium: 1.55,
  high: 1.725
};

// 🧠 PROFESJONALNE LICZENIE
const calculateCalories = ({
  weight,
  height,
  age,
  gender,
  activity,
  goal
}:any) => {

  if (!weight || !height || !age) return 2000;

  // BMR (Mifflin-St Jeor)
  const bmr =
    gender === "female"
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5;

  const tdee = bmr * activityLevels[activity];

  if (goal === "masa") return Math.round(tdee + 300);
  if (goal === "redukcja") return Math.round(tdee - 400);

  return Math.round(tdee);
};

export default function Settings() {

  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");

  const [gender, setGender] = useState("male");
  const [goal, setGoal] = useState("masa");
  const [activity, setActivity] = useState("medium");

  const [themeName, setThemeName] = useState("green");

  const theme = themes[themeName];

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const snap = await getDoc(doc(db, "users", user.uid));

    if (snap.exists()) {
      const s = snap.data().settings || {};
      setWeight(s.weight || "");
      setHeight(s.height || "");
      setAge(s.age || "");
      setGender(s.gender || "male");
      setGoal(s.goal || "masa");
      setActivity(s.activity || "medium");
      setThemeName(s.theme || "green");
    }
  };

  const save = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const calories = calculateCalories({
      weight: Number(weight),
      height: Number(height),
      age: Number(age),
      gender,
      activity,
      goal
    });

    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? snap.data() : {};

    await setDoc(ref, {
      ...existing,
      settings: {
        weight,
        height,
        age,
        gender,
        goal,
        activity,
        theme: themeName,
        calorieGoal: calories
      }
    });

    alert("Zapisano 🔥");
  };

  return (
    <LinearGradient colors={theme.gradient} style={{flex:1}}>
      <SafeAreaView style={{flex:1,padding:20}}>
        <ScrollView>

          <Text style={[styles.title,{color:theme.primary}]}>
            Ustawienia
          </Text>

          <Text style={styles.label}>Waga (kg)</Text>
          <TextInput value={weight} onChangeText={setWeight} style={styles.input} keyboardType="numeric"/>

          <Text style={styles.label}>Wzrost (cm)</Text>
          <TextInput value={height} onChangeText={setHeight} style={styles.input} keyboardType="numeric"/>

          <Text style={styles.label}>Wiek</Text>
          <TextInput value={age} onChangeText={setAge} style={styles.input} keyboardType="numeric"/>

          {/* PŁEĆ */}
          <Text style={styles.label}>Płeć</Text>
          <View style={styles.row}>
            <Pressable style={[styles.btn, gender==="male" && {backgroundColor:theme.primary}]} onPress={()=>setGender("male")}>
              <Text style={styles.text}>Mężczyzna</Text>
            </Pressable>
            <Pressable style={[styles.btn, gender==="female" && {backgroundColor:theme.primary}]} onPress={()=>setGender("female")}>
              <Text style={styles.text}>Kobieta</Text>
            </Pressable>
          </View>

          {/* AKTYWNOŚĆ */}
          <Text style={styles.label}>Aktywność</Text>
          <View style={styles.row}>
            {Object.keys(activityLevels).map(a=>(
              <Pressable
                key={a}
                style={[styles.btn, activity===a && {backgroundColor:theme.primary}]}
                onPress={()=>setActivity(a)}
              >
                <Text style={styles.text}>{a}</Text>
              </Pressable>
            ))}
          </View>

          {/* CEL */}
          <Text style={styles.label}>Cel</Text>
          <View style={styles.row}>
            <Pressable style={[styles.btn, goal==="masa" && {backgroundColor:theme.primary}]} onPress={()=>setGoal("masa")}>
              <Text style={styles.text}>Masa</Text>
            </Pressable>

            <Pressable style={[styles.btn, goal==="redukcja" && {backgroundColor:theme.primary}]} onPress={()=>setGoal("redukcja")}>
              <Text style={styles.text}>Redukcja</Text>
            </Pressable>
          </View>

          {/* MOTYW */}
          <Text style={styles.label}>Motyw</Text>
          <View style={styles.row}>
            {Object.keys(themes).map(t=>(
              <Pressable
                key={t}
                style={[styles.themeBtn, themeName===t && {backgroundColor:themes[t].primary}]}
                onPress={()=>setThemeName(t)}
              >
                <Text style={styles.text}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={[styles.save,{backgroundColor:theme.primary}]} onPress={save}>
            <Text style={{color:"white"}}>Zapisz</Text>
          </Pressable>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  title:{fontSize:24,marginBottom:20},
  label:{color:"#94a3b8",marginBottom:5},
  input:{backgroundColor:"#ffffff10",padding:12,borderRadius:12,marginBottom:15,color:"white"},
  row:{flexDirection:"row",gap:10,flexWrap:"wrap",marginBottom:20},
  btn:{padding:10,borderRadius:10,backgroundColor:"#ffffff10"},
  themeBtn:{padding:10,borderRadius:10,backgroundColor:"#ffffff10"},
  text:{color:"white"},
  save:{padding:15,borderRadius:12,alignItems:"center"}
});
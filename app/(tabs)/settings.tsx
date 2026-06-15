import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator
} from "react-native";
import { useFonts, Inter_400Regular, Inter_700Bold } from "@expo-google-fonts/inter";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";


// MOTYWY
const themes:any = {
  green: { primary:"#22c55e", gradient:["#020617","#0f172a"] },
  red: { primary:"#ef4444", gradient:["#1f0a0a","#450a0a"] },
  blue: { primary:"#3b82f6", gradient:["#020617","#0c1a3a"] },
  purple: { primary:"#a855f7", gradient:["#140a1f","#2a0a45"] },
  orange: { primary:"#f97316", gradient:["#1f120a","#45210a"] },
  zloty: { primary: "#C9A227", gradient: ["#0D0900", "#1C1200", "#0D0900"] },
};

// AKTYWNOŚĆ
const activityLevels:any = {
  low: 1.2,
  light: 1.375,
  medium: 1.55,
  high: 1.725
};

// LICZENIE
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
  const router = useRouter();
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");

  const [gender, setGender] = useState("male");
  const [goal, setGoal] = useState("masa");
  const [activity, setActivity] = useState("medium");

  const [themeName, setThemeName] = useState("green");

  const [stepGoal, setStepGoal] = useState("10000");

  const [isPremium, setIsPremium] = useState(false);

  const theme = themes[themeName];
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_700Bold });

  useEffect(() => {
    load();
  }, []);

  if (!fontsLoaded) return <ActivityIndicator color={theme.primary} style={{flex:1,backgroundColor:"#050a05"}}/>;

  async function load() {
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
      setIsPremium(snap.data().settings?.premium || false);
      setStepGoal(String(s.stepGoal || "10000"));
    }
  }

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
        calorieGoal: calories,
        stepGoal: Number(stepGoal),
        premium: isPremium,
      }
    });

    alert("Zapisano");
  };

  return (
  <LinearGradient colors={theme.gradient} style={{flex:1}}>
    <SafeAreaView style={{flex:1}}>
      <View style={styles.header}>
        <Pressable onPress={()=>router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.primary}/>
        </Pressable>
        <Text style={[styles.title,{color:theme.primary}]}>Ustawienia</Text>
        <View style={{width:36}}/>
      </View>
      <ScrollView
        contentContainerStyle={{padding:20, paddingBottom:300}}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >

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
            {Object.keys(themes).filter(t => t !== "zloty" || isPremium).map(t=>(
              <Pressable
                key={t}
                style={[styles.themeBtn, themeName===t && {backgroundColor:themes[t].primary}]}
                onPress={()=>setThemeName(t)}
              >
                <Text style={styles.text}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Cel kroków</Text>
          <TextInput
            value={stepGoal}
            onChangeText={setStepGoal}
            style={styles.input}
            keyboardType="numeric"
            placeholder="10000"
            placeholderTextColor="#444"
          />

          <Pressable style={[styles.save,{backgroundColor:theme.primary}]} onPress={save}>
            <Text style={{color:"white"}}>Zapisz</Text>
          </Pressable>

         </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingHorizontal:20,paddingTop:16,paddingBottom:8},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:"#ffffff08",justifyContent:"center",alignItems:"center"},
  title:{fontSize:20,fontFamily:"Inter_700Bold"},
  label:{color:"#555",fontFamily:"Inter_700Bold",fontSize:11,letterSpacing:2,marginBottom:8,marginTop:18},
  input:{backgroundColor:"#111318",padding:14,borderRadius:14,marginBottom:4,color:"white",borderWidth:1,borderColor:"#1a1a1a",fontFamily:"Inter_400Regular"},
  row:{flexDirection:"row",gap:8,flexWrap:"wrap",marginBottom:4},
  btn:{paddingHorizontal:16,paddingVertical:10,borderRadius:12,backgroundColor:"#111318",borderWidth:1,borderColor:"#1a1a1a"},
  themeBtn:{paddingHorizontal:16,paddingVertical:10,borderRadius:12,backgroundColor:"#111318",borderWidth:1,borderColor:"#1a1a1a"},
  text:{color:"#888",fontFamily:"Inter_700Bold",fontSize:12},
  save:{padding:15,borderRadius:14,alignItems:"center",marginTop:24},
});
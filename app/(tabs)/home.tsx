import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
  ScrollView,
  ActivityIndicator
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useState, useCallback, useEffect } from "react";

import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold
} from "@expo-google-fonts/inter";

import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged  } from "firebase/auth";
import { useRouter, useFocusEffect } from "expo-router";

import { LineChart } from "react-native-chart-kit";
import { searchFood, getFood } from "@/lib/fatsecret";


const screenWidth = Dimensions.get("window").width;

// ---------- helpers ----------
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

// MOTYWY
const themes: any = {
  green: { primary: "#22c55e", gradient: ["#020617", "#0f172a"] },
  red: { primary: "#ef4444", gradient: ["#1f0a0a", "#450a0a"] },
  blue: { primary: "#3b82f6", gradient: ["#020617", "#0c1a3a"] },
  purple: { primary: "#a855f7", gradient: ["#140a1f", "#2a0a45"] },
  orange: { primary: "#f97316", gradient: ["#1f120a", "#45210a"] }
};

export default function Home() {
  const router = useRouter();
  useEffect(()=>{

  const unsub=
  onAuthStateChanged(
  auth,
  (user)=>{

  if(!user){

  router.replace("/");

  }

  }
  );

return unsub;

},[router]);

  const [activeDay, setActiveDay] = useState(getDateKey(new Date()));
  const [data, setData] = useState<any>({});
  const [settings, setSettings] = useState<any>({ theme: "green" });

  const [modalVisible, setModalVisible] = useState(false);
  const [chartVisible, setChartVisible] = useState(false);
  const [mealType, setMealType] = useState<"sniadanie" | "obiad" | "kolacja">("sniadanie");

  const [name, setName] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [carbs, setCarbs] = useState("");
  const [results,setResults]=useState<any[]>([]);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold
  });

  useFocusEffect(useCallback(() => { loadData(); }, []));

  async function loadData() {
    const user = auth.currentUser;
    if (!user) return;

    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const d = snap.data();
      setData(d.days || {});
      setSettings(d.settings || { theme: "green" });
    }
  }

const saveData = async (newData:any) => {

 const user = auth.currentUser;

 console.log(
   "UID ZAPIS:",
   user?.uid
 );

 console.log(
   "EMAIL:",
   user?.email
 );

 if(!user)return;

 const ref =
 doc(
   db,
   "users",
   user.uid
 );

  await setDoc(
  ref,
  {
  ...data,
  days:newData
  },
  {
  merge:true
  }
  );

 setData(newData);

};

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
    ? { sniadanie: rawMeals, obiad: [], kolacja: [] }
    : rawMeals;

  const current = {
    meals: {
      sniadanie: meals.sniadanie || [],
      obiad: meals.obiad || [],
      kolacja: meals.kolacja || []
    }
  };

  // ---------- dodawanie ----------
  const addMeal = () => {
    if (!name) return;

    const p = Number(protein) || 0;
    const f = Number(fat) || 0;
    const c = Number(carbs) || 0;

    const kcal = p * 4 + c * 4 + f * 9;

    const meal = { name, protein: p, fat: f, carbs: c, kcal };

    const updated={
      ...data,

      [activeDay]:{
      ...data[activeDay],

      meals:{
      ...current.meals,

      [mealType]:
        [
        ...current.meals[mealType],
        meal
        ]

        }

      }

    };

    saveData(updated);

    setName("");
    setProtein("");
    setFat("");
    setCarbs("");
    setResults([]);
    setModalVisible(false);
  };

  const removeMeal = (type: "sniadanie" | "obiad" | "kolacja", index: number) => {
    const updated = {
      ...data,
      [activeDay]: {
        ...data[activeDay],
        meals: {
          ...current.meals,
          [type]: current.meals[type].filter((_: any, i: number) => i !== index)
        }
      }
    };
    saveData(updated);
  };


  const findFood=async()=>{

  try{

    if(!name)return;

    const foods=
  await searchFood(name);

  setResults(
    Array.isArray(foods)
    ?foods
    :(foods?[foods]:[])
  );

  }catch(e){

  console.log(
  "FATSECRET:",
  e
  );

setResults([]);

}

};

  // ---------- SUMY ----------
  const allMeals = [
    ...current.meals.sniadanie,
    ...current.meals.obiad,
    ...current.meals.kolacja
  ];

  const totalProtein = allMeals.reduce((s:any,m:any)=>s+m.protein,0);
  const totalFat = allMeals.reduce((s:any,m:any)=>s+m.fat,0);
  const totalCarbs = allMeals.reduce((s:any,m:any)=>s+m.carbs,0);
  const totalKcal = allMeals.reduce((s:any,m:any)=>s+m.kcal,0);

  const calorieGoal = settings?.calorieGoal || 2000;

  const totalMacroKcal = totalProtein*4 + totalCarbs*4 + totalFat*9;

  const proteinPct = totalMacroKcal ? (totalProtein*4 / totalMacroKcal)*100 : 0;
  const carbsPct = totalMacroKcal ? (totalCarbs*4 / totalMacroKcal)*100 : 0;
  const fatPct = totalMacroKcal ? (totalFat*9 / totalMacroKcal)*100 : 0;

  // ---------- wykres ----------
  const last7 = getLastNDays(7);

  const weekCalories = last7.map(d => {
    const day = data[d];
    if (!day) return 0;

    const meals = day.meals;

    if (Array.isArray(meals)) {
      return meals.reduce((s:any,m:any)=>s+m.kcal,0);
    }

    return [
      ...(meals?.sniadanie || []),
      ...(meals?.obiad || []),
      ...(meals?.kolacja || [])
    ].reduce((s:any,m:any)=>s+m.kcal,0);
  });

  const chartData = {
    labels: last7.map(d=>d.slice(5)),
    datasets: [
      {
        data:
        weekCalories.some(v=>v>0)
        ?weekCalories
        :[1]
      }
    ]
  };

  const calendarDays = getLastNDays(30);

  return (
    <LinearGradient colors={theme.gradient} style={styles.container}>
      <SafeAreaView style={{flex:1}}>

        {/* HEADER */}
        <View style={styles.topBar}>
          <Text style={[styles.logo,{color:theme.primary}]}>
            CalTrack
          </Text>

          <View style={{flexDirection:"row",gap:15}}>
            <Pressable onPress={()=>setChartVisible(true)}>
              <Ionicons name="stats-chart-outline" size={22} color={theme.primary}/>
            </Pressable>

            <Pressable onPress={()=>router.push("/settings")}>
              <Ionicons name="settings-outline" size={22} color={theme.primary}/>
            </Pressable>

            <Pressable
              onPress={async()=>{

                try{

                await signOut(auth);

                router.replace("/");

                }catch(e){

                console.log(
                "LOGOUT ERROR:",
                 e
                );

              }

              }}
            >
            <Ionicons
              name="log-out-outline"
             size={22}
              color="#ef4444"
              />
          </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={{paddingBottom:160}}>

          {/* KALENDARZ */}
          <ScrollView horizontal style={styles.calendar}>
            {calendarDays.map(d=>(
              <Pressable key={d} onPress={()=>setActiveDay(d)}>
                <View style={[
                  styles.day,
                  activeDay===d && {backgroundColor:theme.primary}
                ]}>
                  <Text style={styles.dayText}>{d.slice(5)}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>

          {/* SEKCJE */}
          {(["sniadanie","obiad","kolacja"] as const).map(type=>(
            <View key={type} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.sectionTitle}>
                  {type==="sniadanie"?"Śniadanie":type==="obiad"?"Obiad":"Kolacja"}
                </Text>

                <Pressable onPress={()=>{
                  setMealType(type);
                  setModalVisible(true);
                }}>
                  <Ionicons name="add-circle" size={22} color={theme.primary}/>
                </Pressable>
              </View>

              {current.meals[type].map((item:any,index:number)=>(
                <Animated.View key={index} entering={FadeInDown.delay(index*40)} style={styles.meal}>
                  <View>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.kcal}>{item.kcal} kcal</Text>
                  </View>

                  <Pressable onPress={()=>removeMeal(type,index)}>
                    <Ionicons name="close" size={16} color="#ef4444"/>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          ))}

        </ScrollView>

        {/* DOLNY PANEL */}
        <View style={styles.bottomWrap}>
          <View style={styles.bottomCard}>

            <Text style={styles.big}>
              {totalKcal} / {calorieGoal} kcal
            </Text>

            <View style={styles.progressBar}>
              <View style={[styles.segment,{width:`${carbsPct}%`,backgroundColor:"#3b82f6"}]}/>
              <View style={[styles.segment,{width:`${fatPct}%`,backgroundColor:"#ef4444"}]}/>
              <View style={[styles.segment,{width:`${proteinPct}%`,backgroundColor:"#22c55e"}]}/>
            </View>

            <View style={styles.macros}>
              <Text style={styles.macro}>Węglowodany {Math.round(carbsPct)}%</Text>
              <Text style={styles.macro}>Tłuszcz {Math.round(fatPct)}%</Text>
              <Text style={styles.macro}>Białko {Math.round(proteinPct)}%</Text>
            </View>

          </View>
        </View>

        {/* 📊 WYKRES */}
        <Modal visible={chartVisible} transparent animationType="fade">
          <BlurView intensity={40} style={styles.modalWrap}>
            <View style={styles.chartModal}>
              <LineChart
                data={chartData}
                width={screenWidth - 40}
                height={220}
                chartConfig={{
                  backgroundGradientFrom:"#020617",
                  backgroundGradientTo:"#020617",
                  color:()=>theme.primary,
                  labelColor:()=>"#94a3b8"
                }}
              />

              <Pressable onPress={()=>setChartVisible(false)}>
                <Text style={{color:"white",marginTop:10}}>Zamknij</Text>
              </Pressable>
            </View>
          </BlurView>
        </Modal>

        {/* MODAL DODAWANIA */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <BlurView intensity={40} style={styles.modalWrap}>
            <View style={styles.modal}>
              <TextInput placeholder="Nazwa" value={name} onChangeText={setName} style={styles.input}/>
              <Pressable style={[styles.button,{backgroundColor:"#334155",marginBottom:10}]} onPress={findFood}>
                <Text style={{color:"white"}}>Szukaj</Text>
              </Pressable>

              <ScrollView
                style={{
                  maxHeight:250,
                  marginBottom:10
                }}
                keyboardShouldPersistTaps="always"
                nestedScrollEnabled
              >
                {results.map((item:any)=>(
                  <Pressable
                    key={item.food_id}
                    style={{padding:10,marginBottom:8,backgroundColor:"#ffffff10",borderRadius:10}}
                    onPress={async()=>{
                      setName("POBIERANIE...");
                      const food=
                      await getFood(
                        String(item.food_id)
                      );
                      
                      if(!food) {
                        setName(
                          "BŁĄD POBRANIA"
                        );
                        return;
                      }

                      const meal={

                        name:
                        food.name,

                        protein:
                        food.protein,

                        fat:
                        food.fat,

                        carbs:
                        food.carbs,

                        kcal:
                        food.calories

                      };

                      const updated={

                        ...data,

                        [activeDay]:{

                          ...data[activeDay],

                          meals:{

                            ...current.meals,

                            [mealType]:[

                              ...current
                              .meals[
                              mealType
                              ],

                              meal

                            ]

                          }

                        }

                      };

                      await saveData(
                        updated
                      );

                      setResults([]);
                      setModalVisible(false);

                    }}
                  >
                  <Text style={{color:"white"}}>{item.food_name}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <TextInput placeholder="Białko" value={protein} keyboardType="numeric" onChangeText={setProtein} style={styles.input}/>
              <TextInput placeholder="Tłuszcz" value={fat} keyboardType="numeric" onChangeText={setFat} style={styles.input}/>
              <TextInput placeholder="Węglowodany" value={carbs} keyboardType="numeric" onChangeText={setCarbs} style={styles.input}/>

              <Pressable style={[styles.button,{backgroundColor:theme.primary}]} onPress={addMeal}>
                <Text style={{color:"white"}}>Dodaj ręcznie</Text>
              </Pressable>
            </View>
          </BlurView>
        </Modal>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:{flex:1},
  loader:{flex:1,justifyContent:"center",alignItems:"center",backgroundColor:"#020617"},
  topBar:{flexDirection:"row",justifyContent:"space-between",padding:20},
  logo:{fontSize:20,fontFamily:"Inter_700Bold"},
  calendar:{paddingHorizontal:20,marginBottom:10},
  day:{padding:10,borderRadius:20,backgroundColor:"#ffffff10",marginRight:8},
  dayText:{color:"white"},
  card:{marginHorizontal:20,marginBottom:15,padding:18,borderRadius:20,backgroundColor:"#ffffff10"},
  row:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:10},
  sectionTitle:{color:"white",fontSize:17,fontFamily:"Inter_600SemiBold"},
  meal:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingVertical:6},
  name:{color:"white"},
  kcal:{color:"#94a3b8"},

  bottomWrap:{position:"absolute",bottom:0,left:0,right:0,padding:16},
  bottomCard:{backgroundColor:"#ffffff10",borderRadius:20,padding:16},
  big:{color:"white",fontSize:22,textAlign:"center",fontFamily:"Inter_700Bold"},

  progressBar:{flexDirection:"row",height:8,backgroundColor:"#ffffff20",borderRadius:10,overflow:"hidden",marginTop:10},
  segment:{height:8},

  macros:{marginTop:10},
  macro:{color:"#94a3b8",marginBottom:2},

  modalWrap:{flex:1,justifyContent:"center",alignItems:"center"},
  modal:{width:"85%",backgroundColor:"#020617",padding:20,borderRadius:20},
  chartModal:{backgroundColor:"#020617",padding:20,borderRadius:20},

  input:{backgroundColor:"#ffffff10",padding:12,borderRadius:12,marginBottom:10,color:"white"},
  button:{padding:12,borderRadius:12,alignItems:"center"}
});
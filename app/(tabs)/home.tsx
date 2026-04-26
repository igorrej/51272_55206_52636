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

import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";

import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "expo-router";


const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export default function Home() {
  const router = useRouter();

  const logout = async () => {
    try {
      await signOut(auth);

     router.replace("/");

   } catch (e) {
     console.log("LOGOUT ERROR:", e);
    }
  };

  const [activeDay, setActiveDay] = useState("Mon");

  const [data, setData] = useState<any>({});
  const [modalVisible, setModalVisible] = useState(false);

  const [name, setName] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [carbs, setCarbs] = useState("");
  const [kcal, setKcal] = useState("");

  const calorieGoal = 2000;
  const stepGoal = 10000;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      setData(snap.data());
    } else {
      const initial:any = {};
      days.forEach(d => {
        initial[d] = { meals: [], steps: 0 };
      });
      await setDoc(ref, initial);
      setData(initial);
    }
  };

  const saveData = async (newData:any) => {
    const user = auth.currentUser;
    if (!user) return;

    const ref = doc(db, "users", user.uid);

    await setDoc(ref, newData);
    setData(newData);
  };

  const current = data[activeDay] || { meals: [], steps: 0 };

  const addMeal = () => {
    if (!name) return;

    const p = Number(protein)||0;
    const f = Number(fat)||0;
    const c = Number(carbs)||0;
    const calc = p*4 + c*4 + f*9;

    const meal = {
      name,
      protein:p,
      fat:f,
      carbs:c,
      kcal:Number(kcal)||calc
    };

    const updated = {
      ...data,
      [activeDay]: {
        ...current,
        meals:[...current.meals, meal]
      }
    };

    saveData(updated);

    setName(""); setProtein(""); setFat(""); setCarbs(""); setKcal("");
    setModalVisible(false);
  };

  const removeMeal = (index:number) => {
    const updatedMeals = current.meals.filter((_:any,i:number)=>i!==index);

    const updated = {
      ...data,
      [activeDay]: {
        ...current,
        meals: updatedMeals
      }
    };

    saveData(updated);
  };

  const changeSteps = (val:number) => {
    const updated = {
      ...data,
      [activeDay]: {
        ...current,
        steps: Math.max(0, current.steps + val)
      }
    };

    saveData(updated);
  };

  const resetSteps = () => {
    const updated = {
      ...data,
      [activeDay]: {
        ...current,
        steps: 0
      }
    };

    saveData(updated);
  };

  const totalKcal = current.meals.reduce((s:any,m:any)=>s+m.kcal,0);
  const percentKcal = Math.min((totalKcal/calorieGoal)*100,100);
  const percentSteps = Math.min((current.steps/stepGoal)*100,100);

  return (
    <LinearGradient colors={["#667eea","#764ba2"]} style={styles.container}>

      <Pressable onPress={logout} style={styles.logoutBtn}>
        <Text style={styles.logoutText}>Wyloguj</Text>
      </Pressable>

      {/* DNI */}
      <View style={styles.days}>
        {days.map(d=>(
          <Pressable key={d} onPress={()=>setActiveDay(d)}>
            <View style={[
              styles.day,
              activeDay===d && styles.activeDay
            ]}>
              <Text style={{color:"white"}}>{d}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* KALORIE */}
      <View style={styles.card}>
        <Text style={styles.text}>{totalKcal} / {calorieGoal} kcal</Text>
        <View style={styles.bar}>
          <View style={[styles.fill,{width:`${percentKcal}%`}]} />
        </View>
      </View>

      {/* KROKI */}
      <View style={styles.card}>
        <Text style={styles.text}>{Math.round(current.steps)} / {stepGoal}</Text>

        <View style={styles.bar}>
          <View style={[styles.fill,{width:`${percentSteps}%`, backgroundColor:"#4ade80"}]} />
        </View>

        <View style={styles.row}>
          <Pressable style={styles.stepBtn} onPress={()=>changeSteps(1)}><Text>+1</Text></Pressable>
          <Pressable style={styles.stepBtn} onPress={()=>changeSteps(10)}><Text>+10</Text></Pressable>
          <Pressable style={styles.stepBtn} onPress={()=>changeSteps(100)}><Text>+100</Text></Pressable>
          <Pressable style={styles.stepBtn} onPress={()=>changeSteps(-10)}><Text>-10</Text></Pressable>
        </View>

        <Pressable onPress={resetSteps}>
          <Text style={{color:"red", marginTop:5}}>Reset</Text>
        </Pressable>
      </View>

      {/* LISTA */}
      <FlatList
        data={current.meals}
        keyExtractor={(_,i)=>i.toString()}
        contentContainerStyle={{paddingBottom:120}}
        renderItem={({item,index})=>(
          <View style={styles.meal}>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.text}>{item.kcal} kcal</Text>
            </View>

            <Pressable onPress={()=>removeMeal(index)}>
              <Text style={{color:"red"}}>X</Text>
            </Pressable>
          </View>
        )}
      />

      {/* FAB */}
      <Pressable style={styles.fab} onPress={()=>setModalVisible(true)}>
        <Text style={{color:"white", fontSize:20}}>+</Text>
      </Pressable>

      {/* MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={{flex:1}} behavior="padding">
          <View style={styles.modal}>
            <TextInput placeholder="Nazwa" value={name} onChangeText={setName} style={styles.input}/>
            <TextInput placeholder="Kcal" value={kcal} onChangeText={setKcal} style={styles.input}/>
            <TextInput placeholder="Białko" value={protein} onChangeText={setProtein} style={styles.input}/>
            <TextInput placeholder="Tłuszcz" value={fat} onChangeText={setFat} style={styles.input}/>
            <TextInput placeholder="Węglowodany" value={carbs} onChangeText={setCarbs} style={styles.input}/>

            <Pressable style={styles.button} onPress={addMeal}>
              <Text style={{color:"white"}}>Dodaj</Text>
            </Pressable>

            <Pressable onPress={()=>setModalVisible(false)}>
              <Text style={{color:"white", marginTop:10}}>Zamknij</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,padding:20},

  days:{flexDirection:"row",justifyContent:"space-between",marginBottom:10},
  
  day:{
    padding:8,
    borderRadius:10,
    backgroundColor:"rgba(255,255,255,0.2)"
  },

  activeDay:{
    backgroundColor:"#22c55e"
  },

  card:{
    backgroundColor:"rgba(255,255,255,0.2)",
    padding:15,
    borderRadius:12,
    marginBottom:10
  },

  text:{color:"white"},

  bar:{
    height:8,
    backgroundColor:"#ffffff44",
    borderRadius:10,
    marginTop:5
  },

  fill:{
    height:8,
    backgroundColor:"#22c55e",
    borderRadius:10
  },

  row:{
    flexDirection:"row",
    justifyContent:"space-between",
    marginTop:10
  },

  stepBtn:{
    backgroundColor:"white",
    padding:8,
    borderRadius:8
  },

  meal:{
    flexDirection:"row",
    justifyContent:"space-between",
    backgroundColor:"rgba(255,255,255,0.2)",
    padding:12,
    borderRadius:10,
    marginBottom:10
  },

  name:{color:"white",fontWeight:"bold"},

  fab:{
    position:"absolute",
    bottom:30,
    right:20,
    backgroundColor:"#22c55e",
    padding:18,
    borderRadius:50
  },

  modal:{
    flex:1,
    justifyContent:"center",
    backgroundColor:"#000000aa",
    padding:20
  },

  input:{
    backgroundColor:"white",
    padding:12,
    borderRadius:10,
    marginBottom:10
  },

  button:{
    backgroundColor:"#22c55e",
    padding:12,
    borderRadius:10,
    alignItems:"center"
  },

  logoutBtn:{
  backgroundColor:"#ef4444",
  paddingVertical:8,
  paddingHorizontal:14,
  borderRadius:12,
  alignSelf:"flex-end",
  marginBottom:10
},

logoutText:{
  color:"white",
  fontWeight:"bold"
}
});
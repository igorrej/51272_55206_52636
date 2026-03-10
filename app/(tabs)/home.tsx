import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function Home() {

  const calories = 1450;
  const calorieGoal = 2000;

  const protein = 90;
  const fat = 50;
  const carbs = 180;

  const steps = 7200;
  const stepGoal = 10000;

  const caloriePercent = Math.round((calories / calorieGoal) * 100);
  const stepPercent = Math.round((steps / stepGoal) * 100);

  const macroTotal = protein + fat + carbs;

  return (
    <LinearGradient
      colors={["#667eea", "#764ba2"]}
      style={styles.container}
    >

      {/* GÓRNY PANEL */}
      <View style={styles.topBar}>
        <Text style={styles.logo}>CalTrack</Text>
      </View>

      {/* DÓŁ */}
      <View style={styles.bottomContainer}>

        {/* KALORIE */}
        <View style={styles.card}>

          <View style={styles.header}>
            <Ionicons name="flame" size={20} color="#ff6b6b" />
            <Text style={styles.label}>Kalorie</Text>
          </View>

          <Text style={styles.value}>
            {calories} / {calorieGoal} kcal
          </Text>

          <View style={styles.progressBar}>

            <View style={{
              width: `${(protein / macroTotal) * 100}%`,
              backgroundColor: "#4ade80",
              height: "100%"
            }}/>

            <View style={{
              width: `${(fat / macroTotal) * 100}%`,
              backgroundColor: "#facc15",
              height: "100%"
            }}/>

            <View style={{
              width: `${(carbs / macroTotal) * 100}%`,
              backgroundColor: "#60a5fa",
              height: "100%"
            }}/>

          </View>

          <Text style={styles.percent}>
            {caloriePercent}% celu
          </Text>

          <View style={styles.macroRow}>
            <Text style={{color:"#4ade80"}}>B {protein}g</Text>
            <Text style={{color:"#facc15"}}>T {fat}g</Text>
            <Text style={{color:"#60a5fa"}}>W {carbs}g</Text>
          </View>

        </View>

        {/* KROKI */}
        <View style={styles.card}>

          <View style={styles.header}>
            <Ionicons name="walk" size={20} color="#4ade80" />
            <Text style={styles.label}>Kroki</Text>
          </View>

          <Text style={styles.value}>
            {steps} / {stepGoal}
          </Text>

          <View style={styles.progressBar}>
            <View style={{
              width: `${stepPercent}%`,
              backgroundColor: "#4ade80",
              height: "100%"
            }}/>
          </View>

          <Text style={styles.percent}>
            {stepPercent}% celu
          </Text>

        </View>

      </View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({

container:{
flex:1,
justifyContent:"space-between"
},

topBar:{
width:"100%",
backgroundColor:"rgba(255,255,255,0.2)",
paddingTop:60,
paddingBottom:14,
paddingLeft:20,
borderBottomWidth:1,
borderColor:"rgba(255,255,255,0.3)"
},

logo:{
fontSize:28,
fontWeight:"bold",
color:"white"
},

bottomContainer:{
paddingHorizontal:20,
marginBottom:40,
gap:14
},

card:{
backgroundColor:"rgba(255,255,255,0.2)",
borderRadius:18,
paddingVertical:14,
paddingHorizontal:16,
borderWidth:1,
borderColor:"rgba(255,255,255,0.3)"
},

header:{
flexDirection:"row",
alignItems:"center",
gap:6,
marginBottom:4
},

label:{
fontSize:16,
color:"white"
},

value:{
fontSize:20,
fontWeight:"bold",
color:"white",
marginBottom:6
},

progressBar:{
height:10,
width:"100%",
backgroundColor:"rgba(255,255,255,0.3)",
borderRadius:8,
overflow:"hidden",
flexDirection:"row"
},

percent:{
marginTop:4,
fontSize:13,
color:"white"
},

macroRow:{
flexDirection:"row",
justifyContent:"space-between",
marginTop:4
}

});
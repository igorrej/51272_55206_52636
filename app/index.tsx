import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import Animated,{
FadeInDown,
useSharedValue,
useAnimatedStyle,
withSpring
} from "react-native-reanimated";

import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import {
useFonts,
Inter_400Regular,
Inter_600SemiBold,
Inter_700Bold
} from "@expo-google-fonts/inter";

import {
signInWithEmailAndPassword,
createUserWithEmailAndPassword
} from "firebase/auth";

import {
doc,
getDoc,
setDoc
} from "firebase/firestore";

import { auth,db } from "@/lib/firebase";
import { useRouter } from "expo-router";

export default function Index(){

const router=useRouter();

const [email,setEmail]=useState("");
const [password,setPassword]=useState("");

const [registerEmail,setRegisterEmail]=useState("");
const [registerPassword,setRegisterPassword]=useState("");

const [registerVisible,setRegisterVisible]=useState(false);

const [secure,setSecure]=useState(true);
const [loading,setLoading]=useState(false);

// NOWE — zamiast Alert
const [message,setMessage]=useState("");
const [messageType,setMessageType]=useState<
"error"|"success"|null
>(null);

const scale=
useSharedValue(1);

const animatedButton=
useAnimatedStyle(()=>({
transform:[
{
scale:scale.value
}
]
}));

const [fontsLoaded]=
useFonts({

Inter_400Regular,
Inter_600SemiBold,
Inter_700Bold

});

if(!fontsLoaded){
return null;
}

const showError=(text:string)=>{

setMessage(text);
setMessageType("error");

};

const showSuccess=(text:string)=>{

setMessage(text);
setMessageType("success");

};

const clearMessage=()=>{

setMessage("");
setMessageType(null);

};

const ensureUserDoc=
async(uid:string)=>{

const ref=
doc(
db,
"users",
uid
);

const snap=
await getDoc(ref);

if(!snap.exists()){

await setDoc(
ref,
{
settings:{
theme:"green",
calorieGoal:2000
},
days:{}
}
);

}

};

const handleLogin=
async()=>{

clearMessage();

if(
!email||
!password
){

showError(
"Podaj email i hasło"
);

return;

}

try{

setLoading(true);

await Haptics
.impactAsync(
Haptics
.ImpactFeedbackStyle
.Medium
);

const userCred=
await signInWithEmailAndPassword(
auth,
email.trim(),
password
);

console.log(
"LOGIN UID:",
userCred.user.uid
);

await ensureUserDoc(
userCred.user.uid
);

showSuccess(
"Zalogowano"
);

setTimeout(()=>{

router.replace(
"/home"
);

},500);

}catch(e:any){

console.log(
"LOGIN ERROR:",
e
);

showError(
e.code||
"Błąd logowania"
);

}finally{

setLoading(false);

}

};

const handleRegister=
async()=>{

clearMessage();

if(
!registerEmail||
!registerPassword
){

showError(
"Uzupełnij dane"
);

return;

}

if(
registerPassword
.length<6
){

showError(
"Hasło min. 6 znaków"
);

return;

}

try{

setLoading(true);

const userCred=
await createUserWithEmailAndPassword(
auth,
registerEmail.trim(),
registerPassword
);

console.log(
"REGISTER UID:",
userCred.user.uid
);

await ensureUserDoc(
userCred.user.uid
);

showSuccess(
"Konto utworzone"
);

setRegisterVisible(
false
);

setTimeout(()=>{

router.replace(
"/home"
);

},700);

}catch(e:any){

console.log(
"REGISTER:",
e.code
);

if(
e.code===
"auth/email-already-in-use"
){

showError(
"To konto już istnieje"
);

return;

}

showError(
e.code||
"Błąd rejestracji"
);

}finally{

setLoading(false);

}

};

return(

<LinearGradient
colors={[
"#020617",
"#0f172a"
]}
style={styles.container}
>

<KeyboardAvoidingView
behavior={
Platform.OS==="ios"
?"padding"
:"height"
}
style={styles.inner}
>

<Text style={styles.title}>
CalTrack
</Text>

<Text style={styles.subtitle}>
Witaj!
</Text>

<View style={styles.inputWrapper}>

<Ionicons
name="mail-outline"
size={18}
color="#94a3b8"
/>

<TextInput
placeholder="Email"
placeholderTextColor="#94a3b8"
value={email}
onChangeText={setEmail}
style={styles.input}
/>

</View>

<View style={styles.inputWrapper}>

<Ionicons
name="lock-closed-outline"
size={18}
color="#94a3b8"
/>

<TextInput
placeholder="Hasło"
placeholderTextColor="#94a3b8"
secureTextEntry={secure}
value={password}
onChangeText={setPassword}
style={styles.input}
/>

<Pressable
onPress={()=>
setSecure(
!secure
)
}
>

<Ionicons
name={
secure
?
"eye-off-outline"
:
"eye-outline"
}
size={18}
color="#94a3b8"
/>

</Pressable>

</View>

{/* NOWE - komunikaty */}
{
message ? (

<View
style={[
styles.messageBox,

messageType==="error"
? styles.error
: styles.success
]}
>

<Text
style={styles.messageText}
>

{message}

</Text>

</View>

) : null
}

<Animated.View
style={animatedButton}
>

<Pressable
style={styles.button}
onPress={handleLogin}
>

{
loading
?

<ActivityIndicator
color="white"
/>

:

<Text style={styles.buttonText}>
Zaloguj się
</Text>

}

</Pressable>

</Animated.View>

<Pressable
onPress={()=>
setRegisterVisible(
true
)
}
>

<Text style={styles.register}>
Nie masz konta?
Zarejestruj się
</Text>

</Pressable>

<Modal
visible={registerVisible}
transparent
animationType="slide"
>

<View
style={styles.modalBg}
>

<View
style={styles.modal}
>

<Text
style={styles.modalTitle}
>

Rejestracja

</Text>

<TextInput
placeholder="Email"
placeholderTextColor="#94a3b8"
value={registerEmail}
onChangeText={
setRegisterEmail
}
style={styles.input}
/>

<TextInput
placeholder="Hasło"
placeholderTextColor="#94a3b8"
secureTextEntry
value={registerPassword}
onChangeText={
setRegisterPassword
}
style={styles.input}
/>

<Pressable
style={styles.button}
onPress={
handleRegister
}
>

<Text
style={styles.buttonText}
>

Utwórz konto

</Text>

</Pressable>

<Pressable
onPress={()=>
setRegisterVisible(
false
)
}
>

<Text
style={styles.register}
>

Anuluj

</Text>

</Pressable>

</View>

</View>

</Modal>

</KeyboardAvoidingView>

</LinearGradient>

);

}

const styles=
StyleSheet.create({

container:{
flex:1,
justifyContent:"center",
padding:20
},

inner:{
gap:18
},

title:{
fontSize:38,
color:"white",
fontFamily:
"Inter_700Bold",
textAlign:"center"
},

subtitle:{
color:"#94a3b8",
textAlign:"center",
marginBottom:30
},

inputWrapper:{
flexDirection:"row",
alignItems:"center",
backgroundColor:
"rgba(255,255,255,0.05)",
paddingHorizontal:14,
borderRadius:14,
borderWidth:1,
borderColor:
"rgba(255,255,255,0.1)",
gap:10
},

input:{
flex:1,
padding:14,
color:"white"
},

button:{
backgroundColor:"#22c55e",
padding:16,
borderRadius:14,
alignItems:"center"
},

buttonText:{
color:"white",
fontFamily:
"Inter_600SemiBold"
},

register:{
color:"#94a3b8",
textAlign:"center",
marginTop:10
},

modalBg:{
flex:1,
backgroundColor:"#00000099",
justifyContent:"center",
padding:20
},

modal:{
backgroundColor:"#0f172a",
padding:20,
borderRadius:20
},

modalTitle:{
color:"white",
fontSize:20,
marginBottom:20
},

messageBox:{
padding:12,
borderRadius:12
},

error:{
backgroundColor:
"rgba(239,68,68,0.15)"
},

success:{
backgroundColor:
"rgba(34,197,94,0.15)"
},

messageText:{
color:"white",
textAlign:"center",
fontFamily:
"Inter_600SemiBold"
}

});
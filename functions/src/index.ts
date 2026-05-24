import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import axios from "axios";
import { Buffer } from "buffer";

const CLIENT_ID=
defineSecret(
"FATSECRET_CLIENT_ID"
);

const CLIENT_SECRET=
defineSecret(
"FATSECRET_CLIENT_SECRET"
);

let accessToken="";

async function getToken(){

if(accessToken){
return accessToken;
}

const auth=
Buffer
.from(
`${CLIENT_ID.value()}:${CLIENT_SECRET.value()}`
)
.toString(
"base64"
);

const response=
await axios.post(

"https://oauth.fatsecret.com/connect/token",

"grant_type=client_credentials&scope=basic",

{
headers:{
Authorization:
`Basic ${auth}`,
"Content-Type":
"application/x-www-form-urlencoded"
}
}

);

accessToken=
response.data.access_token;

return accessToken;

}

export const searchFood=
onRequest(
{
cors:true,
secrets:[
CLIENT_ID,
CLIENT_SECRET
]
},
async(req,res)=>{

try{

const token=
await getToken();

const foodId=
String(
req.query.foodId||""
);

if(foodId){

const response=
await axios.post(

"https://platform.fatsecret.com/rest/server.api",

null,

{
headers:{
Authorization:
`Bearer ${token}`
},

params:{
method:
"food.get.v5",

food_id:
foodId,

format:
"json",

flag_default_serving:
true
}

}

);

console.log(
"RAW FOOD:",
JSON.stringify(
response.data,
null,
2
)
);

res.json(
response.data
);

return;

}

const query=
String(
req.query.q||""
);

const response=
await axios.post(

"https://platform.fatsecret.com/rest/server.api",

null,

{
headers:{
Authorization:
`Bearer ${token}`
},

params:{
method:
"foods.search",
search_expression:
query,
format:
"json"
}

}

);

res.json(
response.data
);

}catch(e:any){

console.log(
"FUNCTION ERROR:",
e?.response?.data
||
e
);

res
.status(500)
.json({
error:
e?.response?.data
||
e?.message
});

}

});
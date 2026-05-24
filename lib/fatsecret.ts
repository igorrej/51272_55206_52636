import axios from "axios";

const API_URL =
"https://us-central1-caltrack-efa95.cloudfunctions.net/searchFood";

export async function searchFood(
query:string
){

try{

if(!query?.trim()){
return [];
}

const response=
await axios.get(
API_URL,
{
params:{
q:query
}
}
);

console.log(
"FUNCTION RESPONSE:",
response.data
);

const foods=
response?.data?.foods?.food;

if(!foods){
return [];
}

return Array.isArray(
foods
)
? foods
: [foods];

}catch(e){

console.log(
"SEARCH ERROR:",
e
);

return [];

}

}

export async function getFood(
foodId:string
){

try{

const response=
await axios.get(
API_URL,
{
params:{
foodId
}
}
);

console.log(
"GET FOOD RESPONSE:",
response.data
);

const food=
response.data;

console.log(
"PARSED FOOD:",
food
);

if(!food){
return null;
}

const servings=
food?.servings?.serving;

const serving=
Array.isArray(servings)
? servings[0]
: servings;

if(!serving){
return null;
}

return{

name:
food.food_name,

calories:
Number(
serving.calories || 0
),

protein:
Number(
serving.protein || 0
),

fat:
Number(
serving.fat || 0
),

carbs:
Number(
serving.carbohydrate || 0
)

};

}catch(e){

console.log(
"FOOD ERROR:",
e
);

return null;

}

}
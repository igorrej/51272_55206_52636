import axios from "axios";

// Adres Cloud Function pośredniczącej w komunikacji z FatSecret API
const API_URL =
  "https://us-central1-caltrack-efa95.cloudfunctions.net/searchFood";

// Wyszukuje produkty spożywcze po nazwie przez Cloud Function
export async function searchFood(query: string) {
  try {
    if (!query?.trim()) return [];

    const response = await axios.get(API_URL, { params: { q: query } });

    console.log("FUNCTION RESPONSE:", response.data);

    const foods = response?.data?.foods?.food;

    if (!foods) return [];

    // FatSecret zwraca obiekt zamiast tablicy gdy jest tylko 1 wynik
    return Array.isArray(foods) ? foods : [foods];
  } catch (e) {
    console.log("SEARCH ERROR:", e);
    return [];
  }
}

// Parsuje opis produktu z FatSecret na czytelny obiekt z makroskładnikami
export function parseFoodItem(item: any) {
  const desc: string = item.food_description || "";

  // Wartości odżywcze są zakodowane jako tekst w polu food_description
  const calories = Number(desc.match(/Calories:\s*([\d.]+)/)?.[1] || 0);
  const fat = Number(desc.match(/Fat:\s*([\d.]+)/)?.[1] || 0);
  const carbs = Number(desc.match(/Carbs:\s*([\d.]+)/)?.[1] || 0);
  const protein = Number(desc.match(/Protein:\s*([\d.]+)/)?.[1] || 0);

  return { name: item.food_name, calories, fat, carbs, protein };
}

// Pobiera dane produktu po kodzie kreskowym z Open Food Facts (brak limitu API)
export async function getFoodByBarcode(barcode: string) {
  try {
    const response = await axios.get(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      {
        headers: {
          "User-Agent": "CalTrack/1.0 (contact@caltrack.app)",
        },
      },
    );

    if (response.data?.status !== 1) return null;

    const product = response.data.product;
    const nutriments = product?.nutriments;

    if (!nutriments) return null;

    // energy-kcal_100g może nie istnieć — fallback na konwersję z kJ
    const kcal =
      Number(nutriments["energy-kcal_100g"] || 0) ||
      Math.round(Number(nutriments["energy_100g"] || 0) / 4.184);

    return {
      name: product.product_name || product.brands || "Nieznany produkt",
      calories: kcal,
      protein: Number(nutriments["proteins_100g"] || 0),
      fat: Number(nutriments["fat_100g"] || 0),
      carbs: Number(nutriments["carbohydrates_100g"] || 0),
    };
  } catch (e) {
    console.log("BARCODE ERROR:", e);
    return null;
  }
}

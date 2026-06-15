// Cloud Function pośrednicząca między aplikacją a FatSecret API
// Ukrywa klucze API po stronie serwera (nie są widoczne w apce mobilnej)
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import axios from "axios";
import { Buffer } from "buffer";

// Klucze OAuth FatSecret przechowywane jako sekrety Firebase
const CLIENT_ID = defineSecret("FATSECRET_CLIENT_ID");
const CLIENT_SECRET = defineSecret("FATSECRET_CLIENT_SECRET");

// Token OAuth cachowany w pamięci funkcji (żywotność = żywotność instancji)
let accessToken = "";

// Pobiera token OAuth2 z FatSecret — używa cache żeby nie robić zbędnych requestów
async function getToken() {
  if (accessToken) return accessToken;

  const auth = Buffer.from(
    `${CLIENT_ID.value()}:${CLIENT_SECRET.value()}`,
  ).toString("base64");

  const response = await axios.post(
    "https://oauth.fatsecret.com/connect/token",
    "grant_type=client_credentials&scope=basic",
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  accessToken = response.data.access_token;
  return accessToken;
}

// Endpoint HTTP: GET /searchFood?q=<nazwa> → zwraca listę produktów z FatSecret
export const searchFood = onRequest(
  { cors: true, secrets: [CLIENT_ID, CLIENT_SECRET] },
  async (req, res) => {
    try {
      const token = await getToken();
      const query = String(req.query.q || "");

      const response = await axios.post(
        "https://platform.fatsecret.com/rest/server.api",
        null,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            method: "foods.search",
            search_expression: query,
            format: "json",
            region: "PL",
            language: "pl",
          },
        },
      );

      res.json(response.data);
    } catch (e: any) {
      console.log("FUNCTION ERROR:", e?.response?.data || e);
      res.status(500).json({ error: e?.response?.data || e?.message });
    }
  },
);

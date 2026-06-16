# CalTrack

Mobilna aplikacja do śledzenia kalorii, kroków, wagi i nawodnienia — zbudowana w React Native (Expo) z backendem Firebase.

---

## Funkcjonalności

- **Dziennik posiłków** — 4 kategorie (śniadanie, lunch, obiad, kolacja), ręczne dodawanie makroskładników
- **Wyszukiwarka produktów** — integracja z FatSecret API przez Firebase Cloud Function
- **Skaner kodów kreskowych** — Open Food Facts API (EAN-13, EAN-8)
- **Licznik kroków** — automatyczny odczyt z CoreMotion (iPhone) przez expo-sensors
- **Śledzenie wody** — 10 szklanek po 200ml, cel 2L/dzień
- **Waga dzienna** — rejestracja wagi z wykresem historycznym
- **Cel kaloryczny** — obliczany ze wzoru Mifflin-St Jeor (BMR × PAL ± korekta celu)
- **Kalendarz** — historia 30 dni, przełączanie między dniami
- **Statystyki** — łączne kcal, kroki, dni z celem wody, wykres wagi (LineChart)
- **Motywy kolorystyczne** — zielony, niebieski, złoty (premium)
- **Premium** — odblokowanie złotego motywu

---

## Technologie

| Warstwa | Technologia |
|---------|------------|
| Framework mobilny | React Native + Expo SDK 54 |
| Nawigacja | Expo Router (file-based routing) |
| Backend / baza danych | Firebase Firestore (NoSQL) |
| Autentykacja | Firebase Authentication |
| Animacje | react-native-reanimated |
| Wykresy | react-native-chart-kit |
| Czcionki | @expo-google-fonts/inter |
| Ikony | @expo/vector-icons (Ionicons) |
| Kroki | expo-sensors (Pedometer / CoreMotion) |
| Kamera | expo-camera |
| API proxy | Firebase Cloud Functions |
| Testy | Jest 29 + ts-jest |
| Język | TypeScript |

---

## Wymagania

- Node.js >= 18
- npm >= 9
- Expo Go (na telefonie) lub symulator iOS/Android
- Konto Firebase (Firestore + Authentication włączone)

---

## Uruchomienie w 5 minut

### 1. Klonuj repozytorium

```bash
git clone https://github.com/GSiekierski/51272_55206_52636-backend.git
cd 51272_55206_52636-backend
```

### 2. Zainstaluj zależności

```bash
npm install --legacy-peer-deps
```

### 3. Skonfiguruj Firebase

Utwórz plik `.env` w głównym katalogu projektu:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=twój_klucz
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=twój_projekt.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=twój_projekt
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=twój_projekt.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
```

> Klucze znajdziesz w Firebase Console → Ustawienia projektu → Aplikacje webowe.

### 4. Uruchom aplikację

```bash
npx expo start
```

Zeskanuj QR kod w aplikacji **Expo Go** na telefonie.

---

## Testy

```bash
npm test
```

13 testów jednostkowych pokrywa kluczową logikę:
- Obliczenia BMR/TDEE (wzór Mifflin-St Jeor)
- Parsowanie danych produktów z FatSecret API
- Wzór kaloryczny makroskładników (B×4, W×4, T×9)
- Sumowanie kalorii dnia z różnych kategorii posiłków
- Format klucza daty (YYYY-MM-DD)

---

## Struktura projektu

```
├── app/
│   ├── index.tsx          # Ekran logowania i rejestracji
│   └── (tabs)/
│       ├── home.tsx       # Ekran główny — dziennik, kroki, woda, waga
│       ├── settings.tsx   # Ustawienia użytkownika i cel kaloryczny
│       └── statystyki.tsx # Historia dni, wykresy, podsumowania
├── lib/
│   ├── firebase.ts        # Inicjalizacja Firebase (auth + db)
│   └── fatsecret.ts       # Klient API — wyszukiwarka i skaner
├── functions/
│   └── src/index.ts       # Cloud Function — proxy OAuth do FatSecret
└── __tests__/
    └── caltrack.test.ts   # Testy jednostkowe
```

---

## Architektura danych (Firestore)

Każdy użytkownik ma jeden dokument `/users/{uid}` z następującą strukturą:

```json
{
  "settings": {
    "weight": "80",
    "height": "180",
    "age": "25",
    "gender": "male",
    "goal": "redukcja",
    "activity": "medium",
    "theme": "green",
    "calorieGoal": 2100,
    "stepGoal": 10000,
    "premium": false
  },
  "2026-06-16": {
    "meals": {
      "sniadanie": [{ "name": "Jajka", "kcal": 180, "protein": 12, "fat": 14, "carbs": 1 }],
      "lunch": [],
      "obiad": [],
      "kolacja": []
    },
    "steps": 8432,
    "water": 6,
    "weight": 79.5
  }
}
```

Klucze dat (`YYYY-MM-DD`) są przechowywane bezpośrednio w dokumencie, co umożliwia filtrowanie przez regex bez dodatkowych zapytań.

---

## Wzorzec architektoniczny

Aplikacja stosuje uproszczony **MVVM**:

- **Model** — Firebase Firestore (dane użytkownika)
- **View** — komponenty JSX (ekrany)
- **ViewModel** — hooki React (`useState`, `useEffect`) + funkcje logiki biznesowej

Dodatkowo:
- **Observer** — `onSnapshot` (Firestore) subskrybuje zmiany w czasie rzeczywistym
- **Proxy** — Cloud Function ukrywa klucze OAuth FatSecret przed klientem
- **Repository** — `lib/fatsecret.ts` i `lib/firebase.ts` izolują dostęp do zewnętrznych serwisów

---

## Obliczanie celu kalorycznego

Wzór **Mifflin-St Jeor** (1990):

```
BMR (mężczyzna) = 10×waga + 6.25×wzrost − 5×wiek + 5
BMR (kobieta)   = 10×waga + 6.25×wzrost − 5×wiek − 161

TDEE = BMR × współczynnik aktywności
  low    = 1.20  (siedzący tryb życia)
  light  = 1.375 (lekka aktywność 1-3 dni/tydz.)
  medium = 1.55  (umiarkowana 3-5 dni/tydz.)
  high   = 1.725 (intensywna 6-7 dni/tydz.)

Cel kaloryczny:
  masa       = TDEE + 300 kcal
  redukcja   = TDEE − 400 kcal
  utrzymanie = TDEE
```
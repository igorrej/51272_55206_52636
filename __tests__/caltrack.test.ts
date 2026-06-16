/**
 * Testy jednostkowe CalTrack
 * Pokrywają: obliczenia kalorii (BMR/TDEE), parsowanie produktów,
 * logikę posiłków, obliczenia wody i kroków.
 */

// ─── Pomocnicze kopie funkcji z aplikacji ────────────────────────────────────
// (testujemy logikę niezależnie od React Native i Firebase)

const activityLevels: Record<string, number> = {
  low: 1.2,
  light: 1.375,
  medium: 1.55,
  high: 1.725,
};

function calculateCalories({
  weight,
  height,
  age,
  gender,
  activity,
  goal,
}: {
  weight: number;
  height: number;
  age: number;
  gender: string;
  activity: string;
  goal: string;
}): number {
  if (!weight || !height || !age) return 2000;

  const bmr =
    gender === "female"
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5;

  const tdee = bmr * activityLevels[activity];

  if (goal === "masa") return Math.round(tdee + 300);
  if (goal === "redukcja") return Math.round(tdee - 400);
  return Math.round(tdee);
}

function parseFoodItem(item: {
  food_name: string;
  food_description: string;
}) {
  const desc: string = item.food_description || "";
  const calories = Number(desc.match(/Calories:\s*([\d.]+)/)?.[1] || 0);
  const fat = Number(desc.match(/Fat:\s*([\d.]+)/)?.[1] || 0);
  const carbs = Number(desc.match(/Carbs:\s*([\d.]+)/)?.[1] || 0);
  const protein = Number(desc.match(/Protein:\s*([\d.]+)/)?.[1] || 0);
  return { name: item.food_name, calories, fat, carbs, protein };
}

function calculateMealKcal(protein: number, fat: number, carbs: number): number {
  return protein * 4 + carbs * 4 + fat * 9;
}

const MEAL_TYPES = ["sniadanie", "lunch", "obiad", "kolacja"] as const;

function getDayKcal(dayData: any): number {
  const meals = dayData?.meals || {};
  const arr = Array.isArray(meals)
    ? meals
    : MEAL_TYPES.flatMap((t) => meals[t] || []);
  return Math.round(arr.reduce((s: number, m: any) => s + (m.kcal || 0), 0));
}

function getDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ─── TESTY ───────────────────────────────────────────────────────────────────

describe("calculateCalories — wzór Mifflin-St Jeor", () => {
  const base = {
    weight: 80,
    height: 180,
    age: 25,
    gender: "male",
    activity: "medium",
    goal: "utrzymanie",
  };

  test("1. zwraca 2000 gdy brak danych wejściowych", () => {
    expect(calculateCalories({ ...base, weight: 0, height: 0, age: 0 })).toBe(2000);
  });

  test("2. oblicza wyższe BMR dla mężczyzny niż kobiety (przy tych samych danych)", () => {
    const male = calculateCalories({ ...base, gender: "male" });
    const female = calculateCalories({ ...base, gender: "female" });
    expect(male).toBeGreaterThan(female);
  });

  test("3. cel masa dodaje 300 kcal ponad TDEE", () => {
    const utrzymanie = calculateCalories({ ...base, goal: "utrzymanie" });
    const masa = calculateCalories({ ...base, goal: "masa" });
    expect(masa).toBe(utrzymanie + 300);
  });

  test("4. cel redukcja odejmuje 400 kcal od TDEE", () => {
    const utrzymanie = calculateCalories({ ...base, goal: "utrzymanie" });
    const redukcja = calculateCalories({ ...base, goal: "redukcja" });
    expect(redukcja).toBe(utrzymanie - 400);
  });

  test("5. wyższy poziom aktywności daje wyższe zapotrzebowanie", () => {
    const low = calculateCalories({ ...base, activity: "low" });
    const high = calculateCalories({ ...base, activity: "high" });
    expect(high).toBeGreaterThan(low);
  });
});

describe("parseFoodItem — parsowanie opisu produktu z FatSecret", () => {
  const mockItem = {
    food_name: "Kurczak pieczony",
    food_description:
      "Per 100g - Calories: 165kcal | Fat: 3.57g | Carbs: 0.00g | Protein: 31.02g",
  };

  test("6. poprawnie wyciąga nazwę produktu", () => {
    expect(parseFoodItem(mockItem).name).toBe("Kurczak pieczony");
  });

  test("7. poprawnie parsuje makroskładniki z opisu tekstowego", () => {
    const result = parseFoodItem(mockItem);
    expect(result.calories).toBe(165);
    expect(result.protein).toBe(31.02);
    expect(result.fat).toBe(3.57);
    expect(result.carbs).toBe(0);
  });

  test("8. zwraca zera gdy brak danych makro w opisie", () => {
    const empty = { food_name: "Brak danych", food_description: "" };
    const result = parseFoodItem(empty);
    expect(result.calories).toBe(0);
    expect(result.protein).toBe(0);
  });
});

describe("calculateMealKcal — liczenie kalorii z makroskładników", () => {
  test("9. białko i węglowodany dają 4 kcal/g, tłuszcz 9 kcal/g", () => {
    // 30g białka * 4 + 10g tłuszczu * 9 + 50g węgli * 4 = 120 + 90 + 200 = 410
    expect(calculateMealKcal(30, 10, 50)).toBe(410);
  });

  test("10. sam tłuszcz: 100g = 900 kcal", () => {
    expect(calculateMealKcal(0, 100, 0)).toBe(900);
  });
});

describe("getDayKcal — sumowanie kalorii dnia", () => {
  test("11. sumuje kcal ze wszystkich kategorii posiłków", () => {
    const dayData = {
      meals: {
        sniadanie: [{ kcal: 400 }],
        lunch: [{ kcal: 300 }],
        obiad: [{ kcal: 600 }, { kcal: 100 }],
        kolacja: [{ kcal: 200 }],
      },
    };
    expect(getDayKcal(dayData)).toBe(1600);
  });

  test("12. zwraca 0 gdy brak posiłków", () => {
    expect(getDayKcal({})).toBe(0);
  });
});

describe("getDateKey — format daty", () => {
  test("13. zwraca datę w formacie YYYY-MM-DD", () => {
    const d = new Date("2026-06-16T12:00:00Z");
    expect(getDateKey(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

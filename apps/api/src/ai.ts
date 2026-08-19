// Оценка КБЖУ и анализ питания через Google Gemini (бесплатный тариф)
const MODEL = 'gemini-3.6-flash';

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY не задан');
  return key;
}

async function gemini(prompt: string, json = false): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          ...(json ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as any;
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
  return text.trim();
}

export type KbjuEstimate = {
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
};

/** Оценка КБЖУ по текстовому описанию блюда (вариант 2) */
export async function estimateKbju(foodText: string): Promise<KbjuEstimate> {
  const prompt =
    `Ты диетолог. Оцени калорийность и БЖУ блюда по его описанию. ` +
    `Учитывай объём порции, если он указан, иначе средний размер порции. ` +
    `Верни ТОЛЬКО JSON без пояснений в формате: ` +
    `{"calories": число ккал, "protein": белки г, "fats": жиры г, "carbs": углеводы г}. ` +
    `Числа целые. Блюдо: "${foodText}"`;

  const raw = await gemini(prompt, true);
  try {
    const parsed = JSON.parse(raw);
    return {
      calories: Math.round(Number(parsed.calories) || 0),
      protein: Math.round(Number(parsed.protein) || 0),
      fats: Math.round(Number(parsed.fats) || 0),
      carbs: Math.round(Number(parsed.carbs) || 0),
    };
  } catch {
    throw new Error('Не удалось распознать ответ ИИ');
  }
}

/** Анализ питания клиента за период (вариант 4) */
export async function analyzeNutrition(
  entries: { food_text: string; calories: number; protein: number; fats: number; carbs: number; eaten_at: string }[],
): Promise<string> {
  if (entries.length === 0) return 'Нет записей питания за период.';

  const rows = entries
    .map(
      (e) =>
        `- ${new Date(e.eaten_at).toLocaleDateString('ru-RU')}: ${e.food_text} ` +
        `(${Math.round(e.calories)} ккал, Б ${Math.round(e.protein)} / Ж ${Math.round(e.fats)} / У ${Math.round(e.carbs)} г)`,
    )
    .join('\n');

  const totals = entries.reduce(
    (acc, e) => ({
      c: acc.c + (e.calories || 0),
      p: acc.p + (e.protein || 0),
      f: acc.f + (e.fats || 0),
      k: acc.k + (e.carbs || 0),
    }),
    { c: 0, p: 0, f: 0, k: 0 },
  );

  const prompt =
    `Ты персональный тренер и диетолог. Проанализируй питание клиента за неделю ` +
    `и дай короткий разбор на русском (3-5 предложений): что хорошо, что скорректировать ` +
    `по калориям и балансу БЖУ, конкретные советы. ` +
    `Суммарно за неделю: ${Math.round(totals.c)} ккал, ` +
    `белки ${Math.round(totals.p)} г, жиры ${Math.round(totals.f)} г, углеводы ${Math.round(totals.k)} г.\n\n` +
    `Записи:\n${rows}`;

  return gemini(prompt, false);
}
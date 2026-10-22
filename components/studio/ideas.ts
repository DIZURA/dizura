import type { Locale } from "@/types";
import type { Idea } from "./Studio";

/** Starter prompts per studio. Titles are localized; prompts stay English (models follow English best). */
type Raw = { en: string; ar: string; prompt: string };
const RAW: Record<"aiInfluencer" | "motion" | "image" | "video" | "adsStudio", Raw[]> = {
  aiInfluencer: [
    { en: "Morning coffee post", ar: "قهوة الصباح", prompt: "holding a cup of Arabic coffee, candid smile, soft morning light" },
    { en: "Product review", ar: "مراجعة منتج", prompt: "holding a skincare bottle toward the camera, talking-to-camera pose" },
    { en: "Travel vlog", ar: "مدونة سفر", prompt: "walking toward the camera in an old souq, travel vlog style" },
    { en: "Ramadan campaign", ar: "حملة رمضان", prompt: "festive Ramadan lanterns in the background, warm evening glow" },
  ],
  motion: [
    { en: "Perfume on marble", ar: "عطر على رخام", prompt: "luxury perfume bottle on black marble, golden reflections" },
    { en: "SUV in the dunes", ar: "سيارة في الكثبان", prompt: "a white SUV driving over red sand dunes at sunset" },
    { en: "Skyline at night", ar: "أفق المدينة ليلاً", prompt: "a futuristic Gulf city skyline at night, glowing towers" },
    { en: "Coffee pour", ar: "صبّ القهوة", prompt: "Arabic coffee being poured from a dallah into a small cup" },
  ],
  image: [
    { en: "Luxury perfume", ar: "عطر فاخر", prompt: "luxury oud perfume bottle on dark velvet, dramatic rim light, studio product photo" },
    { en: "Calligraphy café", ar: "مقهى الخط العربي", prompt: "cozy modern café with Arabic calligraphy wall art, warm light, interior photo" },
    { en: "Fashion editorial", ar: "تصوير أزياء", prompt: "high-fashion editorial portrait, bold colors, magazine cover style" },
    { en: "Food flat lay", ar: "طعام من الأعلى", prompt: "top-down flat lay of a Middle Eastern breakfast spread, natural light" },
  ],
  video: [
    { en: "Drone over dunes", ar: "درون فوق الكثبان", prompt: "aerial drone shot gliding over endless desert dunes at golden hour" },
    { en: "Rainy neon street", ar: "شارع نيون ممطر", prompt: "rainy neon-lit street at night, reflections on wet asphalt, cinematic" },
    { en: "Product turntable", ar: "منتج يدور", prompt: "a sleek smartwatch rotating on a turntable, studio lighting" },
    { en: "Horse at sunrise", ar: "حصان عند الشروق", prompt: "an Arabian horse galloping along the beach at sunrise, slow motion" },
  ],
  adsStudio: [
    { en: "Sneaker launch", ar: "إطلاق حذاء", prompt: "bold ad for a new running sneaker, floating shoe, dynamic splash, vibrant background" },
    { en: "Oud perfume", ar: "عطر العود", prompt: "premium oud perfume ad, smoke swirls, gold accents, dark luxurious mood" },
    { en: "Food delivery", ar: "توصيل طعام", prompt: "appetizing burger ad with flying ingredients, bright playful colors" },
    { en: "Skincare", ar: "العناية بالبشرة", prompt: "clean skincare ad, serum bottle with water droplets, soft pastel light" },
  ],
};

export function ideasFor(key: keyof typeof RAW, locale: Locale): Idea[] {
  return RAW[key].map((r, i) => ({ title: r[locale], prompt: r.prompt, angle: 135 + i * 55 }));
}

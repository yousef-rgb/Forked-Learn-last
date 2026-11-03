/**
 * Lightweight, dependency-free intent detection (English + Arabic).
 * It only decides what the *composer* does with a message; the manual mode switch (Auto/Chat/Image) always wins.
 */
export type Intent = 'chat' | 'generate' | 'edit' | 'both'

const GEN_VERB = /(generate|create|draw|make me|make a|design|render|paint|illustrate|imagine|produce|sketch|ولد|اعمل|اعملي|صمم|ارسم|ارسملي|انشئ|أنشئ|اصنع|عايز|عاوز|أريد|اريد)/i
const IMG_NOUN = /(image|picture|photo|illustration|logo|poster|wallpaper|artwork|icon|banner|portrait|infographic|avatar|sticker|drawing|thumbnail|صورة|صوره|صور|رسمة|رسمه|لوجو|شعار|بوستر|خلفية|ايقونة|أيقونة|انفوجراف|إنفوجراف|رسم)/i
/** Visual-scene wording that makes a bare "generate/create …" an image request even without the word "image". */
const VISUAL = /(cinematic|photorealistic|realistic|futuristic|pixel art|watercolor|oil painting|anime|3d render|concept art|digital art|at night|at sunset|sunset|neon|4k|8k|illustration|مستقبلي|واقعي|سينمائي)/i
const DRAW_ONLY = /^\s*(draw|paint|sketch|ارسم|ارسملي)\b/i
const IMG_OF = /\b(image|picture|photo|illustration) of\b|(صورة|صوره|رسمة) (ل|عن)/i
const EDIT_VERB = /(make (it|this|the|him|her|them)|change|edit|remove|replace|add |turn (it|this)|convert|brighten|darken|more |less |cinematic|background|lighting|style|enhance|غير|عدل|شيل|احذف|ضيف|خلي|حول|اجعل|زود|قلل)/i
const EXPLAIN = /^\s*(explain|what is|what's|what are|how (do|does|to|can)|why|define|who|when|summarize|translate|اشرح|يعني ايه|ايه هو|إيه|ازاي|كيف|لماذا|ليه|عرف|لخص|ترجم)/i
const ANALYZE = /(explain|describe|analy[sz]e|what is in|what's in|اشرح|وصف|حلل|ايه اللي في)/i

export function detectIntent(text: string, ctx: { hasRefs: boolean; hasRecentImage: boolean }): Intent {
  const t = text.trim()
  if (!t) return 'chat'
  const wantsNew = (GEN_VERB.test(t) && (IMG_NOUN.test(t) || VISUAL.test(t))) || IMG_OF.test(t) || DRAW_ONLY.test(t)
  const pureQuestion = EXPLAIN.test(t) && !wantsNew
  if (pureQuestion) return 'chat'
  if (wantsNew) return ctx.hasRefs && ANALYZE.test(t) ? 'both' : ctx.hasRefs ? 'edit' : 'generate'
  if ((ctx.hasRefs || ctx.hasRecentImage) && EDIT_VERB.test(t) && t.length <= 400 && !t.includes('```')) return 'edit'
  return 'chat'
}

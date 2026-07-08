export const SHEETS_IMPORT_PROMPT = `
You must create a Google Sheets spreadsheet for importing language flashcards.

⚠️ RETURN ONLY A GOOGLE SHEETS FORMULA.
- Return ONE formula that generates the entire table
- Use ARRAYFORMULA function or array structure with curly braces {}
- Do not include explanations, comments, or markdown
- The formula should be pasted directly into cell A1

SPREADSHEET STRUCTURE:
- Row 1 (header): front | back | phonetic
- Rows 2+: flashcard data (minimum 20 records)

FIELD RULES:
- front: word or phrase in study language (required)
- back: translation or definition in native language (required)
- phonetic: pronunciation in format specified below (required when applicable)

PHONETIC TYPE:
[PHONETIC_TYPE]
- "ipa": use standard IPA symbols (ex: /həˈloʊ/, /ˈwɔːtər/)
- "brazilianslang": Brazilian Portuguese approximation (ex: "rélou", "uórer")
- "hybrid": IPA + Brazilian in parentheses (ex: "həˈloʊ (rélou)")
- "none": leave column empty

DISTRIBUTION:
- Include phonetic in all records (except if type = "none")

FORMULA EXAMPLE (structural reference, adapt the content):
={"front","back","phonetic";"hello","olá","rélou";"goodbye","adeus","gudibái"}

FLASHCARD TOPIC:
[TOPIC_HERE]
`

// Available phonetic types
export type PhoneticType = 'ipa' | 'brazilianslang' | 'hybrid' | 'none'

export const PHONETIC_TYPE_LABELS: Record<PhoneticType, string> = {
  ipa: 'IPA (International Phonetic Alphabet)',
  brazilianslang: 'Brazilian Slang (Portuguese approximation)',
  hybrid: 'Hybrid (IPA + Brazilian)',
  none: 'No phonetic',
}

// Helper to build final prompt
export function buildSheetsPrompt(
  topic: string,
  phoneticType: PhoneticType,
): string {
  return SHEETS_IMPORT_PROMPT.replace('[TOPIC_HERE]', topic).replace(
    '[PHONETIC_TYPE]',
    phoneticType,
  )
}

/** Appends structured follow-up Q&A to optional notes for a new diagnose run. */
export function appendFollowUpAnswersToNotes(
  baseNotes: string,
  questions: string[],
  answers: Record<string, string>,
): string {
  const blocks: string[] = [];
  questions.forEach((q, i) => {
    const a = answers[String(i)]?.trim();
    if (a) blocks.push(`• ${q}\n  → ${a}`);
  });
  if (blocks.length === 0) return baseNotes.trimEnd();
  const insert = "\n\n[Nachfragen – Antworten]\n" + blocks.join("\n\n");
  const t = baseNotes.trimEnd();
  return t ? `${t}${insert}` : insert.trimStart();
}

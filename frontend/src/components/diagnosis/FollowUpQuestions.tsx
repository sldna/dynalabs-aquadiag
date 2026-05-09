export type FollowUpQuestionsProps = {
  title?: string;
  questions: string[];
};

export function FollowUpQuestions({
  title = "Rückfragen",
  questions,
}: FollowUpQuestionsProps) {
  if (questions.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-aqua-deep">{title}</h3>
      <ul className="space-y-2 text-sm text-aqua-deep/85">
        {questions.map((q) => (
          <li
            key={q}
            className="rounded-button bg-aqua-soft p-3 ring-1 ring-aqua-deep/10"
          >
            {q}
          </li>
        ))}
      </ul>
    </section>
  );
}

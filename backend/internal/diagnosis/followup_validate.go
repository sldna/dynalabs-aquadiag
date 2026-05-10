package diagnosis

import (
	"fmt"
	"strings"
	"unicode/utf8"

	"aquadiag/backend/internal/models"
)

const (
	maxFollowUpAnswerPairs   = 48
	maxFollowUpQuestionRunes = 500
	maxFollowUpAnswerRunes   = 4000 // aligns with PATCH /v1/diagnoses limits on answer length
)

// sanitizeFollowUpAnswers trims whitespace on question/answer; drops pairs where question is empty after trim.
func sanitizeFollowUpAnswers(items []models.FollowUpAnswerItem) []models.FollowUpAnswerItem {
	if len(items) == 0 {
		return nil
	}
	out := make([]models.FollowUpAnswerItem, 0, len(items))
	for _, it := range items {
		q := strings.TrimSpace(it.Question)
		a := strings.TrimSpace(it.Answer)
		if q == "" {
			continue
		}
		out = append(out, models.FollowUpAnswerItem{Question: q, Answer: a})
	}
	return out
}

func appendFollowUpAnswersValidation(errs *[]models.FieldError, items []models.FollowUpAnswerItem) {
	if len(items) > maxFollowUpAnswerPairs {
		*errs = append(*errs, models.FieldError{
			Field:   "follow_up_answers",
			Code:    "too_many",
			Message: fmt.Sprintf("Maximal %d Einträge in follow_up_answers.", maxFollowUpAnswerPairs),
		})
		return
	}
	for i, it := range items {
		prefix := fmt.Sprintf("follow_up_answers[%d]", i)
		q := strings.TrimSpace(it.Question)
		a := strings.TrimSpace(it.Answer)
		if q == "" {
			*errs = append(*errs, models.FieldError{
				Field:   prefix + ".question",
				Code:    "required",
				Message: "question darf nicht leer sein.",
			})
		}
		if utf8.RuneCountInString(q) > maxFollowUpQuestionRunes {
			*errs = append(*errs, models.FieldError{
				Field:   prefix + ".question",
				Code:    "too_long",
				Message: fmt.Sprintf("question maximal %d Zeichen.", maxFollowUpQuestionRunes),
			})
		}
		if utf8.RuneCountInString(a) > maxFollowUpAnswerRunes {
			*errs = append(*errs, models.FieldError{
				Field:   prefix + ".answer",
				Code:    "too_long",
				Message: fmt.Sprintf("answer maximal %d Zeichen.", maxFollowUpAnswerRunes),
			})
		}
	}
}

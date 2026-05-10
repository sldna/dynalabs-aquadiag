package diagnosis

import (
	"strings"
	"testing"

	"aquadiag/backend/internal/models"
)

func TestValidateDiagnoseRequest_FollowUpQuestionTooLong(t *testing.T) {
	n := 0.3
	req := models.DiagnoseRequest{
		Tank: &models.InlineTank{Name: "T", VolumeLiters: 100},
		Water: models.WaterTestInput{
			NitriteMgL: &n,
		},
		FollowUpAnswers: []models.FollowUpAnswerItem{
			{Question: strings.Repeat("x", maxFollowUpQuestionRunes+1), Answer: "ok"},
		},
	}
	req.FollowUpAnswers = sanitizeFollowUpAnswers(req.FollowUpAnswers)
	err := validateDiagnoseRequest(req)
	if err == nil {
		t.Fatal("expected validation error")
	}
}

func TestSanitizeFollowUpAnswers_DropsEmptyQuestion(t *testing.T) {
	got := sanitizeFollowUpAnswers([]models.FollowUpAnswerItem{
		{Question: "   ", Answer: "x"},
		{Question: "Hi", Answer: " there "},
	})
	if len(got) != 1 || got[0].Question != "Hi" || got[0].Answer != "there" {
		t.Fatalf("got %+v", got)
	}
}

package diagnosis

import "aquadiag/backend/internal/models"

// ValidationFailedError wird zurückgegeben, wenn POST /v1/diagnose strukturierte Feldfehler hat.
type ValidationFailedError struct {
	Errors []models.FieldError
}

func (e *ValidationFailedError) Error() string {
	return "request validation failed"
}

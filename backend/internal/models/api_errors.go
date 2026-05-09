package models

// FieldError beschreibt eine einzelne Validierungsverletzung (strukturiertes JSON).
type FieldError struct {
	Field   string `json:"field"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ErrorResponse ist die HTTP-Fehlerantwort für Validierung und Dekodierung.
type ErrorResponse struct {
	Code    string       `json:"code"`
	Message string       `json:"message"`
	Errors  []FieldError `json:"errors,omitempty"`
}

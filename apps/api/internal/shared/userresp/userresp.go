// Package userresp builds the "full user" JSON response shared by
// /auth/me and /users/me — both endpoints must return the same shape,
// since apps/web treats them as the same `User` type.
package userresp

// Fields is the full set of user attributes needed to build Resp,
// decoupled from any single feature package's User struct.
type Fields struct {
	ID                 string
	Email              string
	Nickname           string
	Name               *string
	IsEmailVerified    bool
	Provider           *string
	Providers          []string
	FSRSParameters     []float64
	DesiredRetention   float64
	OptimizationStatus *string
	LastOptimization   *string
	Timezone           *string
	CreatedAt          string
	UpdatedAt          string
}

type Resp struct {
	ID                 string    `json:"id"`
	Email              string    `json:"email"`
	Nickname           string    `json:"nickname"`
	Name               string    `json:"name,omitempty"`
	IsEmailVerified    bool      `json:"isEmailVerified"`
	Provider           *string   `json:"provider"`
	Providers          []string  `json:"providers"`
	FSRSParameters     []float64 `json:"fsrsParameters"`
	DesiredRetention   float64   `json:"desiredRetention"`
	OptimizationStatus *string   `json:"optimizationStatus"`
	LastOptimization   *string   `json:"lastOptimization"`
	Timezone           *string   `json:"timezone"`
	CreatedAt          string    `json:"createdAt"`
	UpdatedAt          string    `json:"updatedAt"`
}

func ToResp(f Fields) Resp {
	name := ""
	if f.Name != nil {
		name = *f.Name
	}
	providers := f.Providers
	if providers == nil {
		providers = []string{}
	}
	fsrsParams := f.FSRSParameters
	if fsrsParams == nil {
		fsrsParams = []float64{}
	}
	optStatus := f.OptimizationStatus
	if optStatus == nil || *optStatus == "" {
		idle := "idle"
		optStatus = &idle
	}
	return Resp{
		ID:                 f.ID,
		Email:              f.Email,
		Nickname:           f.Nickname,
		Name:               name,
		IsEmailVerified:    f.IsEmailVerified,
		Provider:           f.Provider,
		Providers:          providers,
		FSRSParameters:     fsrsParams,
		DesiredRetention:   f.DesiredRetention,
		OptimizationStatus: optStatus,
		LastOptimization:   f.LastOptimization,
		Timezone:           f.Timezone,
		CreatedAt:          f.CreatedAt,
		UpdatedAt:          f.UpdatedAt,
	}
}

package cards

import "testing"

func TestFormatIntervalDays(t *testing.T) {
	cases := []struct {
		name string
		days float64
		want string
	}{
		{"under a day rounds to minutes", 0.5, "720m"},
		{"very short interval rounds up to at least one minute", 0.0001, "1m"},
		{"a few days", 3.4, "3d"},
		{"just under a month", 29.9, "30d"},
		{"a couple months", 60, "2mo"},
		{"just under a year", 300, "10mo"},
		{"multiple years", 800, "2y"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := formatIntervalDays(tc.days); got != tc.want {
				t.Errorf("formatIntervalDays(%v) = %q, want %q", tc.days, got, tc.want)
			}
		})
	}
}

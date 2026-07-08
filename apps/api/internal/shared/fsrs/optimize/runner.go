package optimize

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"time"
)

const defaultBinary = "/app/openflaskcards-fsrs-optimize"

// Runner invokes the fsrs-rs sidecar binary.
type Runner struct {
	Binary  string
	Timeout time.Duration
}

// NewRunnerFromEnv builds a runner using FSRS_OPTIMIZER_BIN when set.
func NewRunnerFromEnv() Runner {
	bin := os.Getenv("FSRS_OPTIMIZER_BIN")
	if bin == "" {
		bin = defaultBinary
	}
	return Runner{
		Binary:  bin,
		Timeout: 120 * time.Second,
	}
}

// Run executes the sidecar with JSON on stdin and parses JSON from stdout.
func (r Runner) Run(ctx context.Context, input Input) (Result, error) {
	if r.Binary == "" {
		r.Binary = defaultBinary
	}
	timeout := r.Timeout
	if timeout <= 0 {
		timeout = 120 * time.Second
	}

	payload, err := json.Marshal(input)
	if err != nil {
		return Result{}, fmt.Errorf("marshal optimizer input: %w", err)
	}

	runCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	cmd := exec.CommandContext(runCtx, r.Binary)
	cmd.Stdin = bytes.NewReader(payload)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) && exitErr.ExitCode() == 2 {
			return Result{}, fmt.Errorf("%w: %s", ErrInsufficientData, stderr.String())
		}
		if runCtx.Err() == context.DeadlineExceeded {
			return Result{}, fmt.Errorf("optimizer timed out after %s", timeout)
		}
		return Result{}, fmt.Errorf("optimizer failed: %w: %s", err, stderr.String())
	}

	var result Result
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		return Result{}, fmt.Errorf("parse optimizer output: %w", err)
	}
	if len(result.Weights) != 21 {
		return Result{}, fmt.Errorf("optimizer returned %d weights, want 21", len(result.Weights))
	}
	return result, nil
}

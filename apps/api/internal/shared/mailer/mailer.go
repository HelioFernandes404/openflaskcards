// Package mailer sends transactional emails (currently just the password
// reset link). There is no existing email infrastructure in this repo, so
// this introduces the minimal real thing: an SMTP sender configured via env
// vars, matching the provider-config pattern already used for TTS.
package mailer

import (
	"context"
	"crypto/tls"
	"fmt"
	"net/smtp"
	"time"

	"go.uber.org/zap"
)

// Sender delivers a plain-text email. Implementations must be safe for
// concurrent use.
type Sender interface {
	Send(ctx context.Context, to, subject, body string) error
}

// Config holds SMTP connection settings. Host empty means "not configured":
// NewSender falls back to a logging sender so the app still starts (e.g. in
// local dev without SMTP set up), but no email is actually delivered.
type Config struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
}

// Configured reports whether enough settings are present to attempt a real
// SMTP delivery.
func (c Config) Configured() bool {
	return c.Host != "" && c.From != ""
}

// NewSender returns a real SMTP sender when cfg is configured, otherwise a
// sender that only logs (so missing SMTP config fails loud in logs instead
// of silently pretending to work, while not crashing the whole API).
func NewSender(cfg Config, log *zap.Logger) Sender {
	if !cfg.Configured() {
		log.Warn("mailer: SMTP not configured, emails will only be logged, not delivered")
		return &loggingSender{log: log}
	}
	return &smtpSender{cfg: cfg, log: log}
}

type smtpSender struct {
	cfg Config
	log *zap.Logger
}

func (s *smtpSender) Send(ctx context.Context, to, subject, body string) error {
	addr := fmt.Sprintf("%s:%d", s.cfg.Host, s.cfg.Port)
	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s\r\n",
		s.cfg.From, to, subject, body)

	done := make(chan error, 1)
	go func() {
		done <- s.deliver(addr, to, []byte(msg))
	}()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case err := <-done:
		return err
	}
}

func (s *smtpSender) deliver(addr, to string, msg []byte) error {
	var auth smtp.Auth
	if s.cfg.Username != "" {
		auth = smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)
	}

	// Most providers (SES, SendGrid, Mailgun, etc.) expect STARTTLS on 587.
	client, err := smtp.Dial(addr)
	if err != nil {
		return fmt.Errorf("mailer: dial: %w", err)
	}
	defer client.Close()

	if ok, _ := client.Extension("STARTTLS"); ok {
		if err := client.StartTLS(&tls.Config{ServerName: s.cfg.Host, MinVersion: tls.VersionTLS12}); err != nil {
			return fmt.Errorf("mailer: starttls: %w", err)
		}
	}

	if auth != nil {
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("mailer: auth: %w", err)
		}
	}

	if err := client.Mail(s.cfg.From); err != nil {
		return fmt.Errorf("mailer: mail from: %w", err)
	}
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("mailer: rcpt to: %w", err)
	}
	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("mailer: data: %w", err)
	}
	if _, err := w.Write(msg); err != nil {
		return fmt.Errorf("mailer: write: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("mailer: close: %w", err)
	}
	return client.Quit()
}

type loggingSender struct {
	log *zap.Logger
}

func (s *loggingSender) Send(_ context.Context, to, subject, _ string) error {
	s.log.Warn("mailer: SMTP not configured, dropping email",
		zap.String("to", to),
		zap.String("subject", subject),
		zap.Time("attempted_at", time.Now().UTC()),
	)
	return nil
}

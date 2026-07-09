use chrono::{DateTime, Utc};
use fsrs::{
    compute_parameters, optimal_retention, ComputeParametersInput, FSRSItem, FSRSReview,
    SimulatorConfig,
};
use serde::{Deserialize, Serialize};
use std::io::{self, Read};
use std::process::ExitCode;

const MIN_TRAIN_ITEMS: usize = 50;
const MIN_REVIEW_ROWS: usize = 100;

#[derive(Debug, Deserialize)]
struct Input {
    reviews: Vec<CardReviews>,
    current_retention: Option<f64>,
}

#[derive(Debug, Deserialize)]
struct CardReviews {
    card_id: String,
    entries: Vec<ReviewEntry>,
}

#[derive(Debug, Deserialize)]
struct ReviewEntry {
    at: DateTime<Utc>,
    rating: u32,
}

#[derive(Debug, Serialize)]
struct Output {
    weights: Vec<f64>,
    optimal_retention: f64,
    train_items: usize,
}

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(err) => {
            eprintln!("{}", err.message);
            if err.kind == ErrorKind::InsufficientData {
                ExitCode::from(2)
            } else {
                ExitCode::FAILURE
            }
        }
    }
}

#[derive(Debug, PartialEq)]
enum ErrorKind {
    InsufficientData,
    Internal,
}

#[derive(Debug)]
struct RunError {
    kind: ErrorKind,
    message: String,
}

impl RunError {
    fn insufficient(message: impl Into<String>) -> Self {
        Self {
            kind: ErrorKind::InsufficientData,
            message: message.into(),
        }
    }

    fn internal(message: impl Into<String>) -> Self {
        Self {
            kind: ErrorKind::Internal,
            message: message.into(),
        }
    }
}

fn run() -> Result<(), RunError> {
    let mut payload = String::new();
    io::stdin()
        .read_to_string(&mut payload)
        .map_err(|e| RunError::internal(format!("read stdin: {e}")))?;

    let input: Input = serde_json::from_str(&payload)
        .map_err(|e| RunError::internal(format!("parse input json: {e}")))?;

    let review_rows: usize = input
        .reviews
        .iter()
        .map(|card| card.entries.len())
        .sum();

    if review_rows < MIN_REVIEW_ROWS {
        return Err(RunError::insufficient(format!(
            "need at least {MIN_REVIEW_ROWS} review rows, got {review_rows}"
        )));
    }

    let train_set = build_train_set(&input.reviews);
    if train_set.len() < MIN_TRAIN_ITEMS {
        return Err(RunError::insufficient(format!(
            "need at least {MIN_TRAIN_ITEMS} train items after filtering, got {}",
            train_set.len()
        )));
    }

    let parameters = compute_parameters(ComputeParametersInput {
        train_set: train_set.clone(),
        ..Default::default()
    })
    .map_err(|e| RunError::internal(format!("compute_parameters: {e}")))?;

    if parameters.len() != 21 {
        return Err(RunError::internal(format!(
            "expected 21 weights, got {}",
            parameters.len()
        )));
    }

    if let Some(idx) = parameters.iter().position(|v| !v.is_finite()) {
        return Err(RunError::internal(format!(
            "compute_parameters produced non-finite weight at index {idx}: {}",
            parameters[idx]
        )));
    }

    let fallback_retention = input.current_retention.unwrap_or(0.9).clamp(0.7, 0.99) as f32;
    let optimal = optimal_retention(
        &SimulatorConfig::default(),
        &parameters,
        |_| true,
        None,
        None,
    )
    .unwrap_or(fallback_retention)
    .clamp(0.7, 0.99) as f64;

    if !optimal.is_finite() {
        return Err(RunError::internal(format!(
            "optimal_retention produced non-finite value: {optimal}"
        )));
    }

    let weights: Vec<f64> = parameters.iter().map(|v| f64::from(*v)).collect();
    let output = Output {
        weights,
        optimal_retention: optimal,
        train_items: train_set.len(),
    };

    let json = serde_json::to_string(&output)
        .map_err(|e| RunError::internal(format!("encode output json: {e}")))?;
    println!("{json}");
    Ok(())
}

fn build_train_set(reviews: &[CardReviews]) -> Vec<FSRSItem> {
    let mut items = Vec::new();

    for card in reviews {
        if card.entries.is_empty() {
            continue;
        }

        let mut accumulated = Vec::new();
        let mut last_at = card.entries[0].at;

        for entry in &card.entries {
            let delta_t = (entry.at - last_at).num_days().max(0) as u32;
            accumulated.push(FSRSReview {
                rating: entry.rating,
                delta_t,
            });
            items.push(FSRSItem {
                reviews: accumulated.clone(),
            });
            last_at = entry.at;
        }
    }

    items
        .into_iter()
        .filter(|item| item.long_term_review_cnt() > 0)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn build_train_set_filters_short_histories() {
        let reviews = vec![CardReviews {
            card_id: "card-1".into(),
            entries: vec![
                ReviewEntry {
                    at: Utc.with_ymd_and_hms(2025, 1, 1, 0, 0, 0).unwrap(),
                    rating: 3,
                },
                ReviewEntry {
                    at: Utc.with_ymd_and_hms(2025, 1, 3, 0, 0, 0).unwrap(),
                    rating: 4,
                },
            ],
        }];

        let train_set = build_train_set(&reviews);
        assert_eq!(train_set.len(), 1);
        assert_eq!(train_set[0].reviews.len(), 2);
        assert_eq!(train_set[0].reviews[1].delta_t, 2);
    }
}

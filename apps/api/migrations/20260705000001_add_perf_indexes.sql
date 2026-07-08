-- Composite indexes for the hot study-session paths:
-- ListDueCardsByDeck/CountDueCardsByDeck filter by (deck_id, due), and
-- CountNewCardsStudiedToday filters reviews by (user_id, review_datetime).
CREATE INDEX ix_cards_deck_id_due ON cards (deck_id, due);
CREATE INDEX ix_reviews_user_id_review_datetime ON reviews (user_id, review_datetime);

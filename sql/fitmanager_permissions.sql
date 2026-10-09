-- Extension additive FitManager.
-- Executer avec le proprietaire de la base apres projet.sql.
-- Ce script ne modifie et ne supprime aucun objet existant.

CREATE OR REPLACE VIEW fitmanager_adherents AS
SELECT adherent_id, nom, prenom, email, date_inscription
FROM adherents;

CREATE OR REPLACE VIEW fitmanager_abonnements AS
SELECT ab.abonnement_id, ab.adherent_id, a.nom, a.prenom, a.email,
       ab.type_abonnement, ab.date_debut, ab.date_fin, ab.actif
FROM abonnements AS ab
JOIN adherents AS a ON a.adherent_id = ab.adherent_id;

CREATE OR REPLACE VIEW fitmanager_cours AS
SELECT c.cours_id, c.nom, c.coach, c.date_heure, c.capacite_max,
       COUNT(r.reservation_id) FILTER (WHERE r.statut = 'confirmee')::INTEGER AS reservations_confirmees,
       GREATEST(c.capacite_max - COUNT(r.reservation_id) FILTER (WHERE r.statut = 'confirmee'), 0)::INTEGER AS places_disponibles
FROM cours AS c
LEFT JOIN reservations AS r ON r.cours_id = c.cours_id
GROUP BY c.cours_id, c.nom, c.coach, c.date_heure, c.capacite_max;

CREATE OR REPLACE VIEW fitmanager_dashboard_accueil AS
SELECT
    (SELECT COUNT(*)::INTEGER FROM adherents) AS total_adherents,
    (SELECT COUNT(*)::INTEGER FROM cours WHERE date_heure >= CURRENT_TIMESTAMP) AS cours_a_venir,
    (SELECT COUNT(*)::INTEGER FROM reservations WHERE statut = 'confirmee') AS reservations_confirmees,
    (SELECT COUNT(*)::INTEGER FROM abonnements WHERE actif AND CURRENT_DATE BETWEEN date_debut AND date_fin) AS abonnements_actifs;

CREATE OR REPLACE VIEW fitmanager_dashboard_compta AS
SELECT
    COUNT(*)::INTEGER AS total_paiements,
    COUNT(*) FILTER (WHERE statut = 'paye')::INTEGER AS paiements_valides,
    COUNT(*) FILTER (WHERE statut = 'en_attente')::INTEGER AS paiements_en_attente,
    COALESCE(SUM(montant) FILTER (WHERE statut = 'paye'), 0)::NUMERIC(12,2) AS montant_encaisse;

CREATE OR REPLACE FUNCTION fitmanager_annuler_reservation(p_reservation_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE reservations
    SET statut = 'annulee'
    WHERE reservation_id = p_reservation_id
      AND statut = 'confirmee';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation introuvable ou deja annulee.';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION fitmanager_maj_abonnement(
    p_adherent_id INTEGER,
    p_type_abonnement VARCHAR(30),
    p_date_debut DATE,
    p_date_fin DATE,
    p_actif BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_abonnement_id INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM adherents WHERE adherent_id = p_adherent_id) THEN
        RAISE EXCEPTION 'Adherent introuvable.';
    END IF;

    SELECT abonnement_id INTO v_abonnement_id
    FROM abonnements
    WHERE adherent_id = p_adherent_id
    ORDER BY date_debut DESC, abonnement_id DESC
    LIMIT 1
    FOR UPDATE;

    IF v_abonnement_id IS NULL THEN
        INSERT INTO abonnements (adherent_id, type_abonnement, date_debut, date_fin, actif)
        VALUES (p_adherent_id, p_type_abonnement, p_date_debut, p_date_fin, p_actif);
    ELSE
        UPDATE abonnements
        SET type_abonnement = p_type_abonnement,
            date_debut = p_date_debut,
            date_fin = p_date_fin,
            actif = p_actif
        WHERE abonnement_id = v_abonnement_id;
    END IF;
END;
$$;

GRANT SELECT ON fitmanager_adherents, fitmanager_abonnements, fitmanager_cours,
    fitmanager_dashboard_accueil TO role_accueil;
GRANT SELECT ON fitmanager_dashboard_compta TO role_comptabilite;

REVOKE ALL ON FUNCTION fitmanager_annuler_reservation(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION fitmanager_maj_abonnement(INTEGER, VARCHAR, DATE, DATE, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fitmanager_annuler_reservation(INTEGER) TO role_accueil;
GRANT EXECUTE ON FUNCTION fitmanager_maj_abonnement(INTEGER, VARCHAR, DATE, DATE, BOOLEAN) TO role_accueil;

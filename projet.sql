-- ============================================================
-- PROJET SQL AVANCE B2 - GESTION D'UNE SALLE DE SPORT
-- PostgreSQL / pgAdmin 4
-- ============================================================
-- Contenu :
-- 1. Tables
-- 2. Donnees de test
-- 3. Fonction et procedure
-- 4. Trigger
-- 5. Vues
-- 6. Roles et privileges
-- 7. Index et mesures de performance
-- ============================================================


-- ============================================================
-- 1. CREATION DES TABLES
-- ============================================================

CREATE TABLE adherents (
    adherent_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    date_inscription DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE abonnements (
    abonnement_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    adherent_id INTEGER NOT NULL
        REFERENCES adherents(adherent_id),
    type_abonnement VARCHAR(30) NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    actif BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT chk_dates_abonnement
        CHECK (date_fin >= date_debut)
);

CREATE TABLE cours (
    cours_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    coach VARCHAR(100) NOT NULL,
    date_heure TIMESTAMP NOT NULL,
    capacite_max INTEGER NOT NULL,

    CONSTRAINT chk_capacite_positive
        CHECK (capacite_max > 0)
);

CREATE TABLE reservations (
    reservation_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    adherent_id INTEGER NOT NULL
        REFERENCES adherents(adherent_id),
    cours_id INTEGER NOT NULL
        REFERENCES cours(cours_id),
    date_reservation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    statut VARCHAR(20) NOT NULL DEFAULT 'confirmee',

    CONSTRAINT chk_statut_reservation
        CHECK (statut IN ('confirmee', 'annulee')),

    CONSTRAINT uq_adherent_cours
        UNIQUE (adherent_id, cours_id)
);

CREATE TABLE paiements (
    paiement_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    abonnement_id INTEGER NOT NULL
        REFERENCES abonnements(abonnement_id),
    montant NUMERIC(10,2) NOT NULL,
    date_paiement DATE NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'paye',

    CONSTRAINT chk_montant_positif
        CHECK (montant > 0),

    CONSTRAINT chk_statut_paiement
        CHECK (statut IN ('paye', 'en_attente', 'refuse'))
);


-- ============================================================
-- 2. INSERTION DES DONNEES
-- ============================================================

-- 10 020 adherents
INSERT INTO adherents (
    nom, prenom, email, date_inscription
)
SELECT
    'Nom' || i,
    'Prenom' || i,
    'adherent' || i || '@exemple.fr',
    DATE '2025-01-01' + (i % 600)::INTEGER
FROM generate_series(1, 10020) AS s(i);


-- Un abonnement par adherent
INSERT INTO abonnements (
    adherent_id,
    type_abonnement,
    date_debut,
    date_fin,
    actif
)
SELECT
    adherent_id,
    CASE
        WHEN adherent_id % 3 = 0 THEN 'Premium'
        WHEN adherent_id % 3 = 1 THEN 'Standard'
        ELSE 'Etudiant'
    END,
    DATE '2025-01-01',
    DATE '2027-12-31',
    TRUE
FROM adherents;


-- Cinq cours de demonstration
INSERT INTO cours (
    nom, coach, date_heure, capacite_max
)
VALUES
    ('Yoga', 'Camille Martin',
     TIMESTAMP '2026-10-20 09:00:00', 20),
    ('Musculation', 'Lucas Bernard',
     TIMESTAMP '2026-10-20 10:00:00', 20),
    ('Pilates', 'Emma Petit',
     TIMESTAMP '2026-10-20 11:00:00', 20),
    ('Boxe', 'Hugo Robert',
     TIMESTAMP '2026-10-20 14:00:00', 20),
    ('Cycling', 'Lea Richard',
     TIMESTAMP '2026-10-20 16:00:00', 20);


-- Cours supplementaires : identifiants 6 a 1000
INSERT INTO cours (
    nom, coach, date_heure, capacite_max
)
SELECT
    CASE
        WHEN i % 4 = 0 THEN 'Yoga'
        WHEN i % 4 = 1 THEN 'Musculation'
        WHEN i % 4 = 2 THEN 'Pilates'
        ELSE 'Cycling'
    END || ' - groupe ' || i,
    'Coach ' || i,
    TIMESTAMP '2026-10-01 08:00:00'
        + (i % 300) * INTERVAL '1 day',
    20
FROM generate_series(6, 1000) AS s(i);


-- Cours special pour tester le trigger
-- Sa capacite est limitee a une place.
INSERT INTO cours (
    nom, coach, date_heure, capacite_max
)
VALUES (
    'Cours test capacite',
    'Coach Test',
    TIMESTAMP '2026-11-01 10:00:00',
    1
);


-- 10 000 reservations initiales
-- 10 reservations par cours pour les cours 1 a 1000.
INSERT INTO reservations (
    adherent_id,
    cours_id,
    date_reservation,
    statut
)
SELECT
    i::INTEGER,
    ((i - 1) / 10 + 1)::INTEGER,
    TIMESTAMP '2026-01-01 08:00:00'
        + (i % 300) * INTERVAL '1 day',
    'confirmee'
FROM generate_series(1, 10000) AS s(i);


-- Paiements de test
INSERT INTO paiements (
    abonnement_id,
    montant,
    date_paiement,
    statut
)
SELECT
    abonnement_id,
    CASE
        WHEN abonnement_id % 3 = 0 THEN 49.90
        WHEN abonnement_id % 3 = 1 THEN 29.90
        ELSE 19.90
    END,
    DATE '2026-01-01'
        + (abonnement_id % 365)::INTEGER,
    CASE
        WHEN abonnement_id % 20 = 0 THEN 'en_attente'
        ELSE 'paye'
    END
FROM abonnements;


-- Actualiser les statistiques
ANALYZE reservations;
ANALYZE paiements;


-- ============================================================
-- 3. FONCTION : NOMBRE DE RESERVATIONS D'UN ADHERENT
-- ============================================================

CREATE OR REPLACE FUNCTION nombre_reservations_adherent(
    p_adherent_id INTEGER
)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
    SELECT COUNT(*)::INTEGER
    FROM reservations
    WHERE adherent_id = p_adherent_id
      AND statut = 'confirmee';
$$;


-- ============================================================
-- 4. PROCEDURE : RESERVER UN COURS
-- ============================================================

CREATE OR REPLACE PROCEDURE reserver_cours(
    p_adherent_id INTEGER,
    p_cours_id INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Verifier l'existence d'un abonnement actif et valide.
    IF NOT EXISTS (
        SELECT 1
        FROM abonnements
        WHERE adherent_id = p_adherent_id
          AND actif = TRUE
          AND CURRENT_DATE BETWEEN date_debut AND date_fin
    ) THEN
        RAISE EXCEPTION
            'Reservation refusee : aucun abonnement actif pour l''adherent %.',
            p_adherent_id;
    END IF;

    -- Le trigger verifie la capacite du cours.
    INSERT INTO reservations (
        adherent_id, cours_id, statut
    )
    VALUES (
        p_adherent_id, p_cours_id, 'confirmee'
    );

    RAISE NOTICE
        'Reservation confirmee pour l''adherent % et le cours %.',
        p_adherent_id, p_cours_id;
END;
$$;


-- ============================================================
-- 5. TRIGGER : EMPECHER LA SURESERVATION
-- ============================================================

CREATE OR REPLACE FUNCTION verifier_capacite_cours()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_capacite INTEGER;
    v_nombre INTEGER;
    v_reservation_exclue INTEGER;
BEGIN
    -- Une reservation annulee ne consomme pas de place.
    IF NEW.statut <> 'confirmee' THEN
        RETURN NEW;
    END IF;

    -- Verrouiller le cours pour serialiser les reservations
    -- concurrentes portant sur le meme cours.
    SELECT capacite_max
    INTO v_capacite
    FROM cours
    WHERE cours_id = NEW.cours_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Reservation refusee : le cours % n''existe pas.',
            NEW.cours_id;
    END IF;

    -- Ne pas compter la ligne elle-meme lors d'une modification.
    IF TG_OP = 'UPDATE' THEN
        v_reservation_exclue := OLD.reservation_id;
    ELSE
        v_reservation_exclue := NULL;
    END IF;

    SELECT COUNT(*)
    INTO v_nombre
    FROM reservations
    WHERE cours_id = NEW.cours_id
      AND statut = 'confirmee'
      AND (
          v_reservation_exclue IS NULL
          OR reservation_id <> v_reservation_exclue
      );

    IF v_nombre >= v_capacite THEN
        RAISE EXCEPTION
            'Reservation refusee : cours % complet (%/% places).',
            NEW.cours_id,
            v_nombre,
            v_capacite;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verifier_capacite
BEFORE INSERT OR UPDATE OF cours_id, statut
ON reservations
FOR EACH ROW
EXECUTE FUNCTION verifier_capacite_cours();


-- ============================================================
-- 6. CREATION DES VUES
-- ============================================================

-- Vue destinee au personnel d'accueil
CREATE VIEW vue_accueil_reservations AS
SELECT
    r.reservation_id,
    a.adherent_id,
    a.nom,
    a.prenom,
    c.cours_id,
    c.nom AS nom_cours,
    c.date_heure,
    r.date_reservation,
    r.statut
FROM reservations AS r
JOIN adherents AS a
    ON a.adherent_id = r.adherent_id
JOIN cours AS c
    ON c.cours_id = r.cours_id;


-- Vue destinee au service comptable
CREATE VIEW vue_compta_paiements AS
SELECT
    p.paiement_id,
    ab.abonnement_id,
    a.adherent_id,
    a.nom,
    a.prenom,
    p.montant,
    p.date_paiement,
    p.statut
FROM paiements AS p
JOIN abonnements AS ab
    ON ab.abonnement_id = p.abonnement_id
JOIN adherents AS a
    ON a.adherent_id = ab.adherent_id;


-- ============================================================
-- 7. ROLES ET PRIVILEGES (DCL)
-- ============================================================

-- Creation idempotente des roles metiers et des utilisateurs.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'role_accueil'
    ) THEN
        CREATE ROLE role_accueil NOLOGIN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'role_comptabilite'
    ) THEN
        CREATE ROLE role_comptabilite NOLOGIN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'utilisateur_accueil'
    ) THEN
        CREATE ROLE utilisateur_accueil
            LOGIN PASSWORD 'AccueilDemo2026!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'utilisateur_compta'
    ) THEN
        CREATE ROLE utilisateur_compta
            LOGIN PASSWORD 'ComptaDemo2026!';
    END IF;
END;
$$;


-- Associer chaque utilisateur a son role metier
GRANT role_accueil TO utilisateur_accueil;
GRANT role_comptabilite TO utilisateur_compta;


-- Acces au schema
GRANT USAGE ON SCHEMA public
TO role_accueil, role_comptabilite;


-- Retirer les privileges directs sur les tables et vues.
REVOKE ALL ON ALL TABLES IN SCHEMA public
FROM PUBLIC, role_accueil, role_comptabilite;


-- Accorder uniquement la lecture de chaque vue au bon role.
GRANT SELECT ON vue_accueil_reservations
TO role_accueil;

GRANT SELECT ON vue_compta_paiements
TO role_comptabilite;


-- Donner a la procedure les droits necessaires pour reserver.
-- SECURITY DEFINER : execution avec les droits du proprietaire.
ALTER PROCEDURE reserver_cours(INTEGER, INTEGER)
    SECURITY DEFINER;

ALTER PROCEDURE reserver_cours(INTEGER, INTEGER)
    SET search_path = public, pg_temp;

REVOKE ALL ON PROCEDURE reserver_cours(INTEGER, INTEGER)
FROM PUBLIC;

GRANT EXECUTE ON PROCEDURE reserver_cours(INTEGER, INTEGER)
TO role_accueil;


-- Fonction de consultation pour le personnel d'accueil.
ALTER FUNCTION nombre_reservations_adherent(INTEGER)
    SECURITY DEFINER;

ALTER FUNCTION nombre_reservations_adherent(INTEGER)
    SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION nombre_reservations_adherent(INTEGER)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION nombre_reservations_adherent(INTEGER)
TO role_accueil;


-- ============================================================
-- 8. MESURES AVANT CREATION DES INDEX
-- ============================================================

-- Requete 1 : recherche des reservations d'un cours
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM reservations
WHERE cours_id = 777;


-- Requete 2 : recherche des paiements par date
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM paiements
WHERE date_paiement = DATE '2026-01-01';


-- ============================================================
-- 9. CREATION DES DEUX INDEX
-- ============================================================

CREATE INDEX idx_reservations_cours
ON reservations(cours_id);

CREATE INDEX idx_paiements_date
ON paiements(date_paiement);

ANALYZE reservations;
ANALYZE paiements;


-- ============================================================
-- 10. MESURES APRES CREATION DES INDEX
-- ============================================================

-- Comparer Execution Time, Buffers et le plan utilise.
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM reservations
WHERE cours_id = 777;


EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM paiements
WHERE date_paiement = DATE '2026-01-01';


-- ============================================================
-- FIN DU SCRIPT
-- ============================================================

-- Verifications :
-- SELECT COUNT(*) FROM adherents;       -- 10020
-- SELECT COUNT(*) FROM cours;           -- 1001
-- SELECT COUNT(*) FROM reservations;    -- 10000
-- SELECT COUNT(*) FROM paiements;       -- 10020
-- SELECT nombre_reservations_adherent(1);
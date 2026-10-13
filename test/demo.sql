-- ==================================================
-- DEMONSTRATION DU PROJET : SALLE DE SPORT
-- Executer ces tests separement dans pgAdmin 4
-- ==================================================


-- 1. Verifier le volume de donnees

SELECT COUNT(*) AS nombre_adherents
FROM adherents;

SELECT COUNT(*) AS nombre_reservations
FROM reservations;

SELECT COUNT(*) AS nombre_paiements
FROM paiements;


-- 2. Tester la fonction

SELECT nombre_reservations_adherent(1);


-- 3. Voir les reservations avec le role accueil

SET ROLE role_accueil;

SELECT *
FROM vue_accueil_reservations
LIMIT 5;

RESET ROLE;


-- 4. Voir les paiements avec le role comptabilite

SET ROLE role_comptabilite;

SELECT *
FROM vue_compta_paiements
LIMIT 5;

RESET ROLE;


-- 5. Mesurer les performances des reservations

EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM reservations
WHERE cours_id = 777;


-- 6. Mesurer les performances des paiements

EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM paiements
WHERE date_paiement = DATE '2026-01-01';


-- 7. Tester le trigger
-- Executer les deux CALL separement.
-- Le cours 1001 a une capacite maximale de 1 place.
-- La premiere reservation doit reussir.
-- La seconde doit etre refusee.

CALL reserver_cours(10001, 1001);

CALL reserver_cours(10002, 1001);
Attention : pour la démonstration du trigger, exécute les deux CALL séparément. Si tu exécutes tout le fichier en une fois, l'échec attendu de la deuxième réservation peut interrompre les requêtes suivantes.

6. Code de README.md
markdown

# Gestion d'une salle de sport — SQL avancé

## Sujet
Application PostgreSQL pour gérer les adhérents, les abonnements,
les cours collectifs, les réservations et les paiements.

## Technologies
- PostgreSQL
- pgAdmin 4
- Visual Studio Code
- Git et GitHub

## Fichiers
- `projet.sql` : création et configuration de la base.
- `demo.sql` : requêtes de démonstration.
- `.gitignore` : exclusion des fichiers temporaires et secrets.

## Fonction
`nombre_reservations_adherent` compte les réservations confirmées
d'un adhérent.

Preuve :
```sql
SELECT nombre_reservations_adherent(1);
```

## Procédure
`reserver_cours` vérifie qu'un adhérent possède un abonnement actif
avant de créer une réservation.

Preuve :
```sql
CALL reserver_cours(10001, 1001);
```

## Trigger
`trg_verifier_capacite` interdit de dépasser la capacité maximale
d'un cours, y compris lorsque plusieurs transactions réservent
des places simultanément.

Preuve : réserver deux fois le cours 1001, dont la capacité est de 1.

## Vues et rôles
- `role_accueil` consulte les réservations via `vue_accueil_reservations`.
- `role_comptabilite` consulte les paiements via `vue_compta_paiements`.

Preuve : tester une lecture autorisée et une lecture refusée pour
chaque rôle.

## Index
- `idx_reservations_cours`
- `idx_paiements_date`

Preuve : comparer `EXPLAIN (ANALYZE, BUFFERS)` avant et après
la création des index. Ajouter ici les temps réellement mesurés.

## Données
Le script génère 10 000 réservations initiales et plus de
10 000 adhérents.

## Membres du groupe
- Membre 1 :
- Membre 2 :
- Membre 3 :
- Membre 4 :
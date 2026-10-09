# SQL avancé — Gestion d'une salle de sport

## Sujet

Cette base PostgreSQL permet de gérer les adhérents, les abonnements,
les cours collectifs, les réservations et les paiements d'une salle de sport.

Le projet applique les notions SQL avancées du cours :
fonction, procédure, trigger, vues, rôles, privilèges et index.

## Installation

1. Créer une base PostgreSQL vide nommée `salle_sport`.
2. Ouvrir Query Tool dans pgAdmin 4.
3. Exécuter le fichier `projet.sql`.
4. Vérifier les données et les tests présentés ci-dessous.

Le script doit être exécuté avec un compte disposant des droits
nécessaires à la création des tables, fonctions, vues et rôles.

## 1. Fonction : nombre_reservations_adherent

**Ce qu'elle fait :**
Retourne le nombre de réservations confirmées d'un adhérent.

**Pourquoi elle est là :**
Elle encapsule une requête réutilisable et évite de répéter le calcul.

**La preuve :**

```sql
SELECT nombre_reservations_adherent(1);
```

Résultat attendu : 1 réservation confirmée pour l'adhérent 1.

## 2. Procédure : reserver_cours

**Ce qu'elle fait :**
Vérifie qu'un adhérent possède un abonnement actif avant de créer
une réservation.

**Pourquoi elle est là :**
Elle centralise une opération métier et évite de disperser les contrôles
dans les applications qui utilisent la base.

**La preuve :**

```sql
CALL reserver_cours(10001, 1001);
```

Sur le cours de test vide, la première réservation doit réussir.

## 3. Trigger : trg_verifier_capacite

**Ce qu'il fait :**
Refuse une réservation confirmée lorsque le nombre de places disponibles
est nul. Le contrôle est exécuté avant l'insertion ou la modification.

**Pourquoi dans la base plutôt que dans l'application :**
Toutes les applications doivent respecter la même règle.
Le contrôle est centralisé et le verrouillage de la ligne du cours
protège également contre les réservations concurrentes.

**La preuve :**

```sql
CALL reserver_cours(10001, 1001);
CALL reserver_cours(10002, 1001);
```

La première réservation réussit ; la seconde est refusée car le cours
a une capacité d'une place.

## 4. Vue : vue_accueil_reservations

**Ce qu'elle fait :**
Présente les informations utiles à l'accueil : adhérent, cours,
date et statut de réservation.

**Pourquoi elle est là :**
Elle fournit une interface de consultation adaptée au métier,
sans donner au personnel d'accueil un accès direct aux tables.

**La preuve :**

```sql
SET ROLE role_accueil;
SELECT * FROM vue_accueil_reservations LIMIT 5;
RESET ROLE;
```

La requête sur la vue doit fonctionner.

## 5. Vue : vue_compta_paiements

**Ce qu'elle fait :**
Présente les informations nécessaires au suivi des paiements :
adhérent, montant, date et statut.

**Pourquoi elle est là :**
La comptabilité consulte les informations financières sans avoir
besoin d'accéder directement aux tables de réservation.

**La preuve :**

```sql
SET ROLE role_comptabilite;
SELECT * FROM vue_compta_paiements LIMIT 5;
RESET ROLE;
```

La requête sur la vue doit fonctionner.

## 6. Rôles et privilèges (DCL)

**Ce qu'ils font :**
`role_accueil` peut consulter la vue des réservations et exécuter
la procédure de réservation. `role_comptabilite` peut consulter
la vue des paiements.

**Pourquoi ils sont là :**
Le principe du moindre privilège limite les accès à ce qui est
nécessaire pour chaque métier.

**La preuve :**

```sql
SET ROLE role_accueil;
SELECT * FROM vue_accueil_reservations LIMIT 5;
SELECT * FROM paiements LIMIT 5; -- doit échouer
RESET ROLE;

SET ROLE role_comptabilite;
SELECT * FROM vue_compta_paiements LIMIT 5;
SELECT * FROM reservations LIMIT 5; -- doit échouer
RESET ROLE;
```

Les vues sont accessibles, mais les tables protégées ne le sont pas
directement pour ces rôles.

## 7. Index et performances

**Ce qu'ils font :**
`idx_reservations_cours` accélère potentiellement les recherches
par cours. `idx_paiements_date` accélère potentiellement les recherches
par date de paiement.

**Pourquoi ils sont là :**
Les index peuvent éviter de parcourir toutes les lignes d'une table
lorsqu'une requête sélectionne une petite partie des données.

**La preuve :**
Comparer les sorties de `EXPLAIN (ANALYZE, BUFFERS)` avant et après
la création des index.

| Requête | Temps avant | Temps après |
|---|---:|---:|
| Réservations par cours | À compléter | À compléter |
| Paiements par date | À compléter | À compléter |

Les temps doivent être ceux mesurés sur votre environnement.
Le plan d'exécution permet également de vérifier si l'index est utilisé.

## 8. Volume de données

**Ce qu'il fait :**
Le script utilise `generate_series` pour générer automatiquement
10 020 adhérents, 1 001 cours et 10 000 réservations initiales.

**Pourquoi il est là :**
Un volume suffisant permet de tester les performances des requêtes
et de mesurer l'intérêt éventuel des index.

**La preuve :**

```sql
SELECT COUNT(*) FROM reservations;
-- Résultat attendu : 10000

SELECT COUNT(*) FROM adherents;
-- Résultat attendu : 10020
```

## Équipe

- Membre 1 : à compléter
- Membre 2 : à compléter
- Membre 3 : à compléter
- Membre 4 : à compléter

## Technologies

- PostgreSQL
- pgAdmin 4
- SQL et PL/pgSQL
- Git et GitHub
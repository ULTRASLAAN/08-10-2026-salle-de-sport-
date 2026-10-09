import { useEffect, useState } from 'react';
import {
  Activity, ArrowDownLeft, ArrowUpRight, BadgeEuro, CalendarDays, Check,
  ChevronDown, CircleUserRound, Clock3, Dumbbell, LayoutDashboard, LogOut,
  Menu, Search, ShieldCheck, Sparkles, Users, X,
} from 'lucide-react';

type Profile = 'accueil' | 'comptabilite';
type Page = 'dashboard' | 'adherents' | 'abonnements' | 'cours' | 'paiements';
type ApiError = { error?: string };
type Member = { adherent_id: number; nom: string; prenom: string; email: string; date_inscription: string };
type Membership = { abonnement_id: number; adherent_id: number; nom: string; prenom: string; email: string; type_abonnement: string; date_debut: string; date_fin: string; actif: boolean };
type Course = { cours_id: number; nom: string; coach: string; date_heure: string; capacite_max: number; reservations_confirmees: number; places_disponibles: number };
type Reservation = { reservation_id: number; adherent_id: number; nom: string; prenom: string; cours_id: number; nom_cours: string; date_heure: string; date_reservation: string; statut: string };
type Payment = { paiement_id: number; abonnement_id: number; adherent_id: number; nom: string; prenom: string; montant: string; date_paiement: string; statut: string };
type Dashboard = {
  total_adherents?: number;
  cours_a_venir?: number;
  reservations_confirmees?: number;
  abonnements_actifs?: number;
  total_paiements?: number;
  paiements_valides?: number;
  paiements_en_attente?: number;
  montant_encaisse?: string;
};

const pageTitles: Record<Page, string> = {
  dashboard: 'Vue d’ensemble',
  adherents: 'Adhérents',
  abonnements: 'Abonnements',
  cours: 'Cours & réservations',
  paiements: 'Paiements',
};

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem('fitmanager-token');
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ApiError;
    throw new Error(body.error ?? 'La requête n’a pas abouti.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function useData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const reload = () => setRevision((current) => current + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api<T>(path)
      .then((result) => { if (active) setData(result); })
      .catch((reason: Error) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, revision]);

  return { data, error, loading, reload };
}

function dateLabel(value: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', ...options }).format(new Date(value));
}

function money(value: string | number | undefined) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(value ?? 0));
}

function App() {
  const [profile, setProfile] = useState<Profile | null>(() => sessionStorage.getItem('fitmanager-profile') as Profile | null);
  const [page, setPage] = useState<Page>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function signOut() {
    sessionStorage.removeItem('fitmanager-token');
    sessionStorage.removeItem('fitmanager-profile');
    setProfile(null);
    setPage('dashboard');
  }

  function navigate(next: Page) {
    setPage(next);
    setMobileNavOpen(false);
  }

  if (!profile) return <Login onLogin={setProfile} />;

  const isAccounting = profile === 'comptabilite';
  const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Vue d’ensemble', icon: LayoutDashboard },
    ...(!isAccounting ? [
      { id: 'adherents' as Page, label: 'Adhérents', icon: Users },
      { id: 'abonnements' as Page, label: 'Abonnements', icon: BadgeEuro },
      { id: 'cours' as Page, label: 'Cours & réservations', icon: CalendarDays },
    ] : []),
    ...(isAccounting ? [{ id: 'paiements' as Page, label: 'Paiements', icon: BadgeEuro }] : []),
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#dashboard" onClick={(event) => { event.preventDefault(); navigate('dashboard'); }}>
          <span className="brand-mark"><Dumbbell size={19} strokeWidth={2.6} /></span>
          <span>fit<span className="brand-light">manager</span></span>
        </a>
        <div className="workspace-label">ESPACE DE TRAVAIL</div>
        <div className="workspace-switcher">
          <span className="workspace-avatar">FS</span>
          <span className="workspace-copy"><strong>Fit Studio</strong><small>Centre sportif</small></span>
          <ChevronDown size={15} className="muted-icon" />
        </div>
        <nav className="main-nav" aria-label="Navigation principale">
          <span className="nav-caption">MENU</span>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-link ${page === id ? 'nav-link-active' : ''}`} onClick={() => navigate(id)}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {page === id && <span className="nav-current" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="secure-note"><ShieldCheck size={17} /><span>Accès sécurisé<br /><small>Droits du profil respectés</small></span></div>
          <button className="profile-card" onClick={signOut} title="Se déconnecter">
            <span className="profile-avatar">{isAccounting ? 'C' : 'A'}</span>
            <span className="profile-copy"><strong>{isAccounting ? 'Comptabilité' : 'Accueil'}</strong><small>{isAccounting ? 'Gestion financière' : 'Équipe du club'}</small></span>
            <LogOut size={17} className="logout-icon" />
          </button>
        </div>
      </aside>
      {mobileNavOpen && <button className="nav-scrim" aria-label="Fermer le menu" onClick={() => setMobileNavOpen(false)} />}
      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Ouvrir le menu" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Fit Studio</span><span className="crumb-slash">/</span><strong>{pageTitles[page]}</strong></div>
          <div className="topbar-right"><span className="today-label">{new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span><span className="live-indicator"><i /> Connecté</span></div>
        </header>
        <section className="page-content" key={page}>
          {page === 'dashboard' && <DashboardPage profile={profile} navigate={navigate} />}
          {page === 'adherents' && <MembersPage />}
          {page === 'abonnements' && <MembershipsPage />}
          {page === 'cours' && <CoursesPage />}
          {page === 'paiements' && <PaymentsPage />}
        </section>
      </main>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (profile: Profile) => void }) {
  const [profile, setProfile] = useState<Profile>('accueil');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await api<{ token: string; profile: Profile }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ profile, password }),
      });
      sessionStorage.setItem('fitmanager-token', result.token);
      sessionStorage.setItem('fitmanager-profile', result.profile);
      onLogin(result.profile);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <div className="login-aside">
        <a className="brand login-brand" href="#"><span className="brand-mark"><Dumbbell size={19} strokeWidth={2.6} /></span><span>fit<span className="brand-light">manager</span></span></a>
        <div className="login-art">
          <span className="art-kicker"><Activity size={15} /> CLUB OPERATIONS</span>
          <div className="art-line art-line-one" /><div className="art-line art-line-two" />
          <p>Le club,<br />en <em>mouvement.</em></p>
          <span className="art-foot">UNE GESTION PLUS SIMPLE, CHAQUE JOUR.</span>
        </div>
        <span className="login-version">FITMANAGER · ESPACE PROFESSIONNEL</span>
      </div>
      <div className="login-panel">
        <div className="login-panel-inner">
          <span className="login-overline">BON RETOUR AU CLUB</span>
          <h1>Connexion</h1>
          <p className="login-intro">Accède à ton espace de gestion Fit Studio.</p>
          <form onSubmit={submit}>
            <label className="form-label">Ton espace</label>
            <div className="role-toggle">
              <button type="button" className={profile === 'accueil' ? 'role-option role-active' : 'role-option'} onClick={() => setProfile('accueil')}><Users size={17} /> Accueil</button>
              <button type="button" className={profile === 'comptabilite' ? 'role-option role-active' : 'role-option'} onClick={() => setProfile('comptabilite')}><BadgeEuro size={17} /> Comptabilité</button>
            </div>
            <label className="form-label" htmlFor="password">Mot de passe</label>
            <input id="password" className="text-input" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Saisir le mot de passe du profil" required />
            {error && <div className="form-error" role="alert"><X size={15} /> {error}</div>}
            <button className="primary-button login-submit" type="submit" disabled={submitting}>{submitting ? 'Connexion…' : 'Accéder à mon espace'} <ArrowUpRight size={17} /></button>
          </form>
          <div className="login-footnote"><ShieldCheck size={16} /><span>Les permissions PostgreSQL de ton profil sont appliquées à chaque requête.</span></div>
        </div>
      </div>
    </main>
  );
}

function DashboardPage({ profile, navigate }: { profile: Profile; navigate: (page: Page) => void }) {
  const { data, error, loading } = useData<Dashboard>('/dashboard');
  const isAccounting = profile === 'comptabilite';
  const cards = isAccounting ? [
    { label: 'Encaissé', value: money(data?.montant_encaisse), caption: 'Paiements au statut payé', icon: ArrowDownLeft, tone: 'mint' },
    { label: 'Paiements reçus', value: data?.paiements_valides ?? 0, caption: 'Transactions validées', icon: Check, tone: 'blue' },
    { label: 'En attente', value: data?.paiements_en_attente ?? 0, caption: 'À suivre', icon: Clock3, tone: 'amber' },
    { label: 'Transactions', value: data?.total_paiements ?? 0, caption: 'Enregistrements au total', icon: Activity, tone: 'rose' },
  ] : [
    { label: 'Adhérents', value: data?.total_adherents ?? 0, caption: 'Inscrits dans le club', icon: Users, tone: 'mint' },
    { label: 'Abonnements actifs', value: data?.abonnements_actifs ?? 0, caption: 'En cours de validité', icon: BadgeEuro, tone: 'blue' },
    { label: 'Cours à venir', value: data?.cours_a_venir ?? 0, caption: 'Prochaines séances', icon: CalendarDays, tone: 'amber' },
    { label: 'Réservations', value: data?.reservations_confirmees ?? 0, caption: 'Confirmées au total', icon: Check, tone: 'rose' },
  ];

  return <>
    <div className="page-heading"><div><span className="eyebrow">{isAccounting ? 'ESPACE COMPTABILITÉ' : 'ESPACE ACCUEIL'}</span><h1>Bonjour, {isAccounting ? 'équipe compta' : 'l’équipe'} <span className="heading-dot">.</span></h1><p>Voici le point sur l’activité de ton club.</p></div><span className="period-chip"><CalendarDays size={15} /> Aujourd’hui</span></div>
    {error && <ErrorBanner message={error} />}
    <div className="stats-grid">{cards.map(({ label, value, caption, icon: Icon, tone }) => <article className="stat-card" key={label}><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}><Icon size={18} /></span></div><strong className="stat-value">{loading ? '—' : value}</strong><span className="stat-caption">{caption}</span></article>)}</div>
    <section className="dashboard-lower">
      <div className="section-heading"><div><span className="eyebrow">ACCÈS RAPIDE</span><h2>Que souhaites-tu faire ?</h2></div><span className="subtle-label"><Sparkles size={15} /> Tes outils du quotidien</span></div>
      <div className="quick-grid">
        {(isAccounting ? [
          { title: 'Consulter les paiements', description: 'Suivre les règlements et leur statut.', page: 'paiements' as Page, icon: BadgeEuro, tag: 'COMPTABILITÉ' },
        ] : [
          { title: 'Trouver un adhérent', description: 'Recherche par nom, prénom ou email.', page: 'adherents' as Page, icon: Search, tag: 'FICHIER MEMBRES' },
          { title: 'Gérer les séances', description: 'Places disponibles et réservations.', page: 'cours' as Page, icon: CalendarDays, tag: 'PLANNING' },
          { title: 'Mettre à jour un forfait', description: 'Renouveler ou ajuster un abonnement.', page: 'abonnements' as Page, icon: BadgeEuro, tag: 'ABONNEMENTS' },
        ]).map(({ title, description, page: target, icon: Icon, tag }) => <button className="quick-link" key={target} onClick={() => navigate(target)}><span className="quick-icon"><Icon size={20} /></span><span className="quick-copy"><small>{tag}</small><strong>{title}</strong><span>{description}</span></span><ArrowUpRight size={18} className="quick-arrow" /></button>)}
      </div>
    </section>
    <div className="dashboard-note"><span className="note-mark"><ShieldCheck size={18} /></span><p><strong>Une base, des accès maîtrisés.</strong><br />Les chiffres affichés proviennent directement de PostgreSQL et respectent les droits de ton profil.</p><span className="note-status">DONNÉES EN DIRECT</span></div>
  </>;
}

function MembersPage() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const path = `/members?search=${encodeURIComponent(query)}`;
  const { data, error, loading } = useData<Member[]>(path);
  const count = data?.length ?? 0;
  return <>
    <div className="page-heading"><div><span className="eyebrow">FICHIER DU CLUB</span><h1>Les adhérents<span className="heading-dot">.</span></h1><p>Retrouve rapidement une personne inscrite au club.</p></div><span className="count-chip"><Users size={15} /> {loading ? '…' : count} affichés</span></div>
    <div className="toolbar"><label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') setQuery(search); }} placeholder="Nom, prénom ou adresse email" /><button onClick={() => setQuery(search)} aria-label="Rechercher"><ArrowUpRight size={16} /></button></label><span className="table-hint">Jusqu’à 50 résultats · recherche PostgreSQL</span></div>
    {error ? <ErrorBanner message={error} /> : <div className="data-table-wrap"><table className="data-table"><thead><tr><th>ADHÉRENT</th><th>EMAIL</th><th>INSCRIPTION</th><th>ID</th></tr></thead><tbody>{loading ? <LoadingRows columns={4} /> : data?.length ? data.map((member) => <tr key={member.adherent_id}><td><span className="person-cell"><span className="person-avatar">{member.prenom.slice(0, 1)}{member.nom.slice(0, 1)}</span><span><strong>{member.prenom} {member.nom}</strong><small>Adhérent #{member.adherent_id}</small></span></span></td><td>{member.email}</td><td>{dateLabel(member.date_inscription, { year: 'numeric' })}</td><td className="id-cell">{member.adherent_id}</td></tr>) : <EmptyRow columns={4} message="Aucun adhérent trouvé pour cette recherche." />}</tbody></table></div>}
  </>;
}

function MembershipsPage() {
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const { data, error: loadError, loading, reload } = useData<Membership[]>(`/memberships?search=${encodeURIComponent(search)}`);
  const [form, setForm] = useState({ adherentId: '', type: 'Standard', dateDebut: new Date().toISOString().slice(0, 10), dateFin: new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10), actif: true });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(''); setNotice('');
    try {
      await api('/memberships', { method: 'POST', body: JSON.stringify({ ...form, adherentId: Number(form.adherentId) }) });
      setNotice('Abonnement enregistré.'); reload();
    } catch (reason) { setError((reason as Error).message); }
  }

  return <>
    <div className="page-heading"><div><span className="eyebrow">SUIVI DES FORFAITS</span><h1>Abonnements<span className="heading-dot">.</span></h1><p>Consulte et mets à jour les abonnements des membres.</p></div><span className="count-chip"><BadgeEuro size={15} /> {loading ? '…' : data?.length ?? 0} dossiers</span></div>
    <section className="form-section"><div className="section-heading"><div><span className="eyebrow">MISE À JOUR</span><h2>Enregistrer un abonnement</h2></div></div>
      <form className="membership-form" onSubmit={submit}>
        <label>Identifiant adhérent<input className="text-input" type="number" min="1" required value={form.adherentId} onChange={(event) => setForm({ ...form, adherentId: event.target.value })} placeholder="Ex. 10001" /></label>
        <label>Formule<select className="text-input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>Standard</option><option>Premium</option><option>Etudiant</option></select></label>
        <label>Date de début<input className="text-input" type="date" required value={form.dateDebut} onChange={(event) => setForm({ ...form, dateDebut: event.target.value })} /></label>
        <label>Date de fin<input className="text-input" type="date" required value={form.dateFin} onChange={(event) => setForm({ ...form, dateFin: event.target.value })} /></label>
        <label className="checkbox-label"><input type="checkbox" checked={form.actif} onChange={(event) => setForm({ ...form, actif: event.target.checked })} /> Abonnement actif</label>
        <button className="primary-button form-submit" type="submit">Enregistrer <ArrowUpRight size={16} /></button>
      </form>
      {error && <ErrorBanner message={error} />}{notice && <div className="success-banner"><Check size={16} /> {notice}</div>}
    </section>
    <div className="toolbar"><label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filtrer par nom ou email" /></label><span className="table-hint">Abonnements issus de la base</span></div>
    {loadError ? <ErrorBanner message={loadError} /> : <div className="data-table-wrap"><table className="data-table"><thead><tr><th>ADHÉRENT</th><th>FORMULE</th><th>PÉRIODE</th><th>STATUT</th></tr></thead><tbody>{loading ? <LoadingRows columns={4} /> : data?.length ? data.map((item) => <tr key={item.abonnement_id}><td><span className="person-cell"><span className="person-avatar">{item.prenom.slice(0, 1)}{item.nom.slice(0, 1)}</span><span><strong>{item.prenom} {item.nom}</strong><small>{item.email}</small></span></span></td><td><span className="plan-tag">{item.type_abonnement}</span></td><td>{dateLabel(item.date_debut, { year: 'numeric' })} — {dateLabel(item.date_fin, { year: 'numeric' })}</td><td><StatusPill active={item.actif} label={item.actif ? 'Actif' : 'Inactif'} /></td></tr>) : <EmptyRow columns={4} message="Aucun abonnement trouvé." />}</tbody></table></div>}
  </>;
}

function CoursesPage() {
  const [adherentId, setAdherentId] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const courses = useData<Course[]>('/courses');
  const reservations = useData<Reservation[]>(`/reservations?search=${encodeURIComponent(search)}`);

  async function reserve(event: React.FormEvent) {
    event.preventDefault(); setActionError(''); setNotice('');
    try {
      await api('/reservations', { method: 'POST', body: JSON.stringify({ adherentId: Number(adherentId), coursId: Number(selectedCourse) }) });
      setNotice('Réservation confirmée.'); setRevision((value) => value + 1); courses.reload(); reservations.reload();
    } catch (reason) { setActionError((reason as Error).message); }
  }

  async function cancel(id: number) {
    setActionError(''); setNotice('');
    try {
      await api(`/reservations/${id}`, { method: 'DELETE' });
      setNotice('Réservation annulée.'); setRevision((value) => value + 1); courses.reload(); reservations.reload();
    } catch (reason) { setActionError((reason as Error).message); }
  }

  useEffect(() => { setSelectedCourse(''); }, [revision]);
  const availableCourses = courses.data ?? [];
  return <>
    <div className="page-heading"><div><span className="eyebrow">PLANNING DU CLUB</span><h1>Cours & réservations<span className="heading-dot">.</span></h1><p>Consulte les prochaines séances et gère les inscriptions.</p></div><span className="count-chip"><CalendarDays size={15} /> {courses.data?.length ?? '…'} à venir</span></div>
    <section className="form-section booking-section"><div className="section-heading"><div><span className="eyebrow">NOUVELLE INSCRIPTION</span><h2>Réserver une place</h2></div><span className="database-note"><ShieldCheck size={15} /> Contrôle de capacité en base</span></div>
      <form className="booking-form" onSubmit={reserve}>
        <label>Identifiant adhérent<input className="text-input" type="number" min="1" required value={adherentId} onChange={(event) => setAdherentId(event.target.value)} placeholder="Ex. 10001" /></label>
        <label className="course-select">Séance<select className="text-input" required value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)}><option value="">Choisir un cours</option>{availableCourses.map((course) => <option key={course.cours_id} value={course.cours_id} disabled={course.places_disponibles < 1}>{course.nom} · {dateLabel(course.date_heure, { hour: '2-digit', minute: '2-digit' })} · {course.places_disponibles} place(s)</option>)}</select></label>
        <button className="primary-button" type="submit">Confirmer la réservation <ArrowUpRight size={16} /></button>
      </form>
      {actionError && <ErrorBanner message={actionError} />}{notice && <div className="success-banner"><Check size={16} /> {notice}</div>}
    </section>
    {courses.error ? <ErrorBanner message={courses.error} /> : <div className="course-grid">{courses.loading ? <p className="loading-copy">Chargement des cours…</p> : availableCourses.slice(0, 6).map((course, index) => <article className="course-card" key={course.cours_id}><div className={`course-stripe stripe-${index % 4}`} /><div className="course-card-top"><span className="course-category">{course.nom.split(' - ')[0].toUpperCase()}</span><span className={`places-pill ${course.places_disponibles === 0 ? 'places-full' : ''}`}>{course.places_disponibles === 0 ? 'Complet' : `${course.places_disponibles} places`}</span></div><h3>{course.nom}</h3><p className="coach-line"><CircleUserRound size={15} /> {course.coach}</p><div className="course-meta"><span><CalendarDays size={15} /> {dateLabel(course.date_heure, { weekday: 'short', day: 'numeric', month: 'short' })}</span><span><Clock3 size={15} /> {dateLabel(course.date_heure, { hour: '2-digit', minute: '2-digit' })}</span></div><div className="capacity-track"><span style={{ width: `${Math.min(100, Math.round((course.reservations_confirmees / course.capacite_max) * 100))}%` }} /></div><div className="capacity-label"><span>{course.reservations_confirmees} inscrits</span><span>{course.capacite_max} places</span></div></article>)}</div>}
    <div className="section-heading reservations-heading"><div><span className="eyebrow">SUIVI DES INSCRIPTIONS</span><h2>Réservations récentes</h2></div><span className="subtle-label">Annulation disponible pour l’accueil</span></div>
    <div className="toolbar compact-toolbar"><label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filtrer par adhérent ou cours" /></label></div>
    {reservations.error ? <ErrorBanner message={reservations.error} /> : <div className="data-table-wrap"><table className="data-table"><thead><tr><th>ADHÉRENT</th><th>COURS</th><th>SÉANCE</th><th>STATUT</th><th></th></tr></thead><tbody>{reservations.loading ? <LoadingRows columns={5} /> : reservations.data?.length ? reservations.data.map((item) => <tr key={item.reservation_id}><td><strong>{item.prenom} {item.nom}</strong><small className="block-sub">#{item.adherent_id}</small></td><td>{item.nom_cours}</td><td>{dateLabel(item.date_heure, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td><StatusPill active={item.statut === 'confirmee'} label={item.statut === 'confirmee' ? 'Confirmée' : 'Annulée'} /></td><td>{item.statut === 'confirmee' && <button className="text-action danger-action" onClick={() => cancel(item.reservation_id)}><X size={14} /> Annuler</button>}</td></tr>) : <EmptyRow columns={5} message="Aucune réservation à afficher." />}</tbody></table></div>}
  </>;
}

function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const { data, error, loading } = useData<Payment[]>(`/payments?search=${encodeURIComponent(query)}`);
  const paid = (data ?? []).filter((payment) => payment.statut === 'paye').reduce((sum, payment) => sum + Number(payment.montant), 0);
  const pending = (data ?? []).filter((payment) => payment.statut === 'en_attente').length;
  return <>
    <div className="page-heading"><div><span className="eyebrow">ESPACE COMPTABILITÉ</span><h1>Suivi des paiements<span className="heading-dot">.</span></h1><p>Consulte les règlements et les paiements en attente.</p></div><span className="count-chip"><BadgeEuro size={15} /> {data?.length ?? '…'} mouvements</span></div>
    <div className="stats-grid payment-stats"><article className="stat-card"><div className="stat-top"><span>Encaissé (résultats)</span><span className="stat-icon mint"><ArrowDownLeft size={18} /></span></div><strong className="stat-value">{loading ? '—' : money(paid)}</strong><span className="stat-caption">Sur les lignes chargées</span></article><article className="stat-card"><div className="stat-top"><span>En attente</span><span className="stat-icon amber"><Clock3 size={18} /></span></div><strong className="stat-value">{loading ? '—' : pending}</strong><span className="stat-caption">À vérifier</span></article></div>
    <div className="toolbar"><label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') setQuery(search); }} placeholder="Rechercher un adhérent" /><button onClick={() => setQuery(search)} aria-label="Rechercher"><ArrowUpRight size={16} /></button></label><span className="table-hint">Vue comptable PostgreSQL</span></div>
    {error ? <ErrorBanner message={error} /> : <div className="data-table-wrap"><table className="data-table"><thead><tr><th>ADHÉRENT</th><th>DATE</th><th>MONTANT</th><th>STATUT</th><th>RÉF.</th></tr></thead><tbody>{loading ? <LoadingRows columns={5} /> : data?.length ? data.map((payment) => <tr key={payment.paiement_id}><td><span className="person-cell"><span className="person-avatar">{payment.prenom.slice(0, 1)}{payment.nom.slice(0, 1)}</span><span><strong>{payment.prenom} {payment.nom}</strong><small>Adhérent #{payment.adherent_id}</small></span></span></td><td>{dateLabel(payment.date_paiement, { year: 'numeric' })}</td><td><strong>{money(payment.montant)}</strong></td><td><StatusPill active={payment.statut === 'paye'} label={payment.statut === 'paye' ? 'Payé' : payment.statut === 'en_attente' ? 'En attente' : 'Refusé'} /></td><td className="id-cell">#{payment.paiement_id}</td></tr>) : <EmptyRow columns={5} message="Aucun paiement trouvé." />}</tbody></table></div>}
  </>;
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return <span className={`status-pill ${active ? 'status-active' : 'status-inactive'}`}><i />{label}</span>;
}

function ErrorBanner({ message }: { message: string }) {
  return <div className="error-banner" role="alert"><X size={16} />{message}</div>;
}

function LoadingRows({ columns }: { columns: number }) {
  return <tr><td colSpan={columns} className="empty-row">Chargement des données…</td></tr>;
}

function EmptyRow({ columns, message }: { columns: number; message: string }) {
  return <tr><td colSpan={columns} className="empty-row"><span className="empty-icon"><ArrowDownLeft size={18} /></span>{message}</td></tr>;
}

export default App;

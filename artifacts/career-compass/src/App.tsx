import { type FormEvent, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link, Route, Switch, useLocation, useParams } from 'wouter';
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, CalendarDays, Check, ChevronRight, CirclePlus, Compass, ExternalLink, FileText, LayoutDashboard, Menu, Pencil, Search, Trash2, X } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

type OpportunityType = 'Internship' | 'Research' | 'Scholarship' | 'Networking' | 'Fellowship' | 'Other';
type OpportunityStatus = 'Interested' | 'Preparing' | 'Applied' | 'Completed';
type Opportunity = {
  id: string; name: string; organization: string; type: OpportunityType; deadline: string;
  link: string; status: OpportunityStatus; nextStep: string; notes: string; createdAt: string;
};

const TYPES: OpportunityType[] = ['Internship', 'Research', 'Scholarship', 'Networking', 'Fellowship', 'Other'];
const STATUSES: OpportunityStatus[] = ['Interested', 'Preparing', 'Applied', 'Completed'];
const STORAGE_KEY = 'career-compass-opportunities';
const queryClient = new QueryClient();

const dateInput = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};
const makeSeed = (): Opportunity[] => [
  { id: 'seed-01', name: 'Product Design Intern', organization: 'Arcadia Labs', type: 'Internship', deadline: dateInput(8), link: 'https://example.com/arcadia', status: 'Preparing', nextStep: 'Polish the case study for portfolio review', notes: 'Small product studio working on tools for public libraries. Ask Maya for an introduction to the design lead.', createdAt: new Date().toISOString() },
  { id: 'seed-02', name: 'Undergraduate Research Fellowship', organization: 'Northwestern Institute for Data Ethics', type: 'Research', deadline: dateInput(17), link: 'https://example.com/nide', status: 'Interested', nextStep: 'Read Professor Shah’s latest paper', notes: 'The project explores how people make sense of algorithmic recommendations. Strong match for the media studies seminar.', createdAt: new Date().toISOString() },
  { id: 'seed-03', name: 'Bright Futures Scholarship', organization: 'The Harlow Foundation', type: 'Scholarship', deadline: dateInput(26), link: 'https://example.com/harlow', status: 'Interested', nextStep: 'Outline the 500-word personal statement', notes: 'Requires transcript, one recommendation, and a short statement about community impact.', createdAt: new Date().toISOString() },
  { id: 'seed-04', name: 'Alumni Coffee Chat', organization: 'Jordan Kim · Civic Works', type: 'Networking', deadline: dateInput(3), link: 'https://example.com/calendar', status: 'Applied', nextStep: 'Send a thank-you note after Friday’s call', notes: 'Jordan offered to introduce me to someone on the community research team.', createdAt: new Date().toISOString() },
  { id: 'seed-05', name: 'Summer Policy Fellowship', organization: 'Common Ground Network', type: 'Fellowship', deadline: dateInput(42), link: 'https://example.com/common-ground', status: 'Interested', nextStep: 'Compare this with the city internship', notes: 'Keep on the longlist while I learn more about location and housing support.', createdAt: new Date().toISOString() },
];

const readStored = (): Opportunity[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as Opportunity[];
    const seeds = makeSeed();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeds));
    return seeds;
  } catch {
    return makeSeed();
  }
};
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `op-${Date.now()}`);
const formatDate = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
const formatShortDate = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  return { day: date.getDate(), month: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date) };
};
const daysUntil = (value: string) => Math.ceil((new Date(`${value}T12:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
const deadlineLabel = (value: string) => {
  const days = daysUntil(value);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `In ${days} days`;
};
const statusClass = (status: OpportunityStatus) => `status status-${status.toLowerCase()}`;

type DataContextValue = {
  opportunities: Opportunity[];
  addOpportunity: (opportunity: Omit<Opportunity, 'id' | 'createdAt'>) => Opportunity;
  updateOpportunity: (id: string, changes: Partial<Opportunity>) => void;
  deleteOpportunity: (id: string) => void;
  notify: (message: string) => void;
};
const DataContext = createContext<DataContextValue | null>(null);
const useCareerData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('Career data is unavailable');
  return context;
};

function Sidebar() {
  const [location] = useLocation();
  const isActive = (path: string) => path === '/dashboard' ? location === '/' || location === '/dashboard' : location.startsWith(path);
  return <aside className="sidebar">
    <Link href="/dashboard" className="brand" data-testid="link-brand">
      <span className="brand-mark"><span /></span>
      <span><span className="brand-name">Career Compass</span><span className="brand-sub">Your next direction</span></span>
    </Link>
    <div className="nav-label">Workspace</div>
    <nav className="nav">
      <Link href="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`} data-testid="link-dashboard"><LayoutDashboard size={16} /> Overview</Link>
      <Link href="/opportunities" className={`nav-link ${isActive('/opportunities') ? 'active' : ''}`} data-testid="link-opportunities"><BriefcaseBusiness size={16} /> Opportunities</Link>
    </nav>
    <div className="sidebar-note"><strong>A little momentum</strong>Keep the next step small enough to start today.</div>
  </aside>;
}

function MobileBar() {
  const [location] = useLocation();
  return <div className="mobile-bar">
    <Link href="/dashboard" className="mobile-brand" data-testid="link-mobile-brand"><span className="brand-mark"><span /></span>Career Compass</Link>
    <nav className="mobile-nav">
      <Link href="/dashboard" className={location === '/' || location === '/dashboard' ? 'active' : ''} data-testid="link-mobile-dashboard"><LayoutDashboard size={17} /></Link>
      <Link href="/opportunities" className={location.startsWith('/opportunities') ? 'active' : ''} data-testid="link-mobile-opportunities"><BriefcaseBusiness size={17} /></Link>
    </nav>
  </div>;
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="app-shell"><Sidebar /><div className="main-area"><MobileBar />{children}</div></div>;
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="empty" data-testid="empty-state"><div className="empty-mark"><Compass size={18} /></div><h3>{title}</h3><p>{body}</p>{action}</div>;
}

function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  return <Link href={`/opportunities/${opportunity.id}`} className="op-card fade-in" data-testid={`card-opportunity-${opportunity.id}`}>
    <div className="op-card-top"><div><span className="op-card-name">{opportunity.name}</span><span className="op-card-org">{opportunity.organization}</span><span className="item-type">{opportunity.type}</span></div><span className={statusClass(opportunity.status)} data-testid={`status-opportunity-${opportunity.id}`}>{opportunity.status}</span></div>
    <div className="op-card-bottom"><div className="next-step"><label>Next step</label>{opportunity.nextStep || 'Choose one small step to keep this moving'}</div><div className="deadline-line"><strong>{deadlineLabel(opportunity.deadline)}</strong><br />{formatDate(opportunity.deadline)}</div></div>
  </Link>;
}

function Dashboard() {
  const { opportunities } = useCareerData();
  const active = opportunities.filter((item) => item.status !== 'Completed');
  const upcoming = [...active].sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 4);
  const focus = active.filter((item) => item.nextStep).sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 3);
  const applied = opportunities.filter((item) => item.status === 'Applied').length;
  return <main className="page fade-in" data-testid="page-dashboard">
    <header className="page-header"><div><div className="eyebrow">Monday, {new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(new Date())}</div><h1 className="page-title">Find your <em>next direction.</em></h1><p className="page-intro">A clear view of what is on the horizon, so the right opportunity gets your attention at the right time.</p></div><Link href="/opportunities/new" className="button button-accent" data-testid="button-add-opportunity"><CirclePlus size={16} /> Add opportunity</Link></header>
    <section className="hero-panel"><div className="hero-copy"><div className="eyebrow">Your compass for this week</div><h2>Small steps make a path.</h2><p>You are holding {active.length} active {active.length === 1 ? 'possibility' : 'possibilities'}. Start with the one that has the clearest next move.</p></div><div className="hero-side"><span className="hero-side-label">Closest deadline</span><span className="hero-side-number">{upcoming[0] ? deadlineLabel(upcoming[0].deadline).replace('In ', '') : '—'}</span><span className="hero-side-copy">{upcoming[0] ? upcoming[0].name : 'Nothing pressing'}</span></div></section>
    <section className="stats"><div className="stat"><span className="stat-number" data-testid="stat-active">{active.length}</span><span className="stat-label">Active paths</span></div><div className="stat"><span className="stat-number" data-testid="stat-applied">{applied}</span><span className="stat-label">In motion</span></div><div className="stat"><span className="stat-number" data-testid="stat-week">{active.filter((item) => daysUntil(item.deadline) <= 7).length}</span><span className="stat-label">Due this week</span></div></section>
    <div className="section-grid"><section><div className="section-heading"><h2>Coming up</h2><Link href="/opportunities" data-testid="link-see-all">See all <ArrowUpRight size={12} /></Link></div>{upcoming.length ? <div className="timeline">{upcoming.map((item) => { const date = formatShortDate(item.deadline); return <Link href={`/opportunities/${item.id}`} className="timeline-item" key={item.id} data-testid={`timeline-opportunity-${item.id}`}><div className="date-block"><span className="date-day">{date.day}</span><span className="date-month">{date.month}</span></div><div><span className="item-name">{item.name}</span><span className="item-org">{item.organization}</span><span className="item-type">{item.type}</span></div><span className={`item-deadline ${daysUntil(item.deadline) <= 7 ? 'urgent' : ''}`}>{deadlineLabel(item.deadline)}</span></Link>; })}</div> : <EmptyState title="Open horizon" body="Add an opportunity to start shaping your next few weeks." action={<Link href="/opportunities/new" className="button button-primary" data-testid="button-empty-add">Add your first one</Link>} />}</section><section><div className="section-heading"><h2>Focus list</h2><span className="eyebrow">Doable today</span></div>{focus.length ? <div className="focus-list">{focus.map((item, index) => <Link href={`/opportunities/${item.id}`} className="focus-row" key={item.id} data-testid={`focus-opportunity-${item.id}`}><span className="focus-marker">{String(index + 1).padStart(2, '0')}</span><span><strong>{item.nextStep}</strong><span>{item.name}</span></span></Link>)}</div> : <EmptyState title="A quiet moment" body="Completed opportunities and new possibilities will show up here." />}</section></div>
  </main>;
}

function Opportunities() {
  const { opportunities } = useCareerData();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<OpportunityType | 'All'>('All');
  const [status, setStatus] = useState<OpportunityStatus | 'All'>('All');
  const filtered = useMemo(() => opportunities.filter((item) => {
    const text = `${item.name} ${item.organization} ${item.nextStep}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (type === 'All' || item.type === type) && (status === 'All' || item.status === status);
  }).sort((a, b) => a.deadline.localeCompare(b.deadline)), [opportunities, query, type, status]);
  return <main className="page fade-in" data-testid="page-opportunities"><header className="page-header"><div><div className="eyebrow">Your opportunity map</div><h1 className="page-title">All your <em>possibilities.</em></h1><p className="page-intro">Keep every path visible. Filter down when you need to focus.</p></div><Link href="/opportunities/new" className="button button-primary" data-testid="button-new-opportunity"><CirclePlus size={16} /> New opportunity</Link></header><div className="search-bar"><div className="search-wrap"><Search size={16} /><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, organization, or next step" data-testid="input-search-opportunities" /></div>{(query || type !== 'All' || status !== 'All') && <button className="button button-quiet" onClick={() => { setQuery(''); setType('All'); setStatus('All'); }} data-testid="button-clear-filters"><X size={15} /> Clear</button>}</div><div className="filter-row"><button className={`filter-chip ${type === 'All' ? 'active' : ''}`} onClick={() => setType('All')} data-testid="filter-type-all">All types</button>{TYPES.map((option) => <button className={`filter-chip ${type === option ? 'active' : ''}`} key={option} onClick={() => setType(option)} data-testid={`filter-type-${option.toLowerCase()}`}>{option}</button>)}<span style={{ width: 8 }} />{(['All', ...STATUSES] as const).map((option) => <button className={`filter-chip ${status === option ? 'active' : ''}`} key={option} onClick={() => setStatus(option)} data-testid={`filter-status-${option.toLowerCase()}`}>{option === 'All' ? 'All statuses' : option}</button>)}</div><div className="results-meta" data-testid="text-results-count">{filtered.length} {filtered.length === 1 ? 'opportunity' : 'opportunities'} shown</div>{filtered.length ? <div className="opportunity-list">{filtered.map((item) => <OpportunityCard opportunity={item} key={item.id} />)}</div> : <EmptyState title="No paths found" body="Try a different search or clear your filters. Every direction starts with one possibility." action={<button className="button button-quiet" onClick={() => { setQuery(''); setType('All'); setStatus('All'); }} data-testid="button-empty-clear">Reset filters</button>} />}</main>;
}

const defaultForm = (): Omit<Opportunity, 'id' | 'createdAt'> => ({ name: '', organization: '', type: 'Internship', deadline: '', link: '', status: 'Interested', nextStep: '', notes: '' });
function OpportunityForm({ initial, editing, onSave }: { initial?: Opportunity; editing?: boolean; onSave: (data: Omit<Opportunity, 'id' | 'createdAt'>) => void }) {
  const [form, setForm] = useState<Omit<Opportunity, 'id' | 'createdAt'>>(initial ? { name: initial.name, organization: initial.organization, type: initial.type, deadline: initial.deadline, link: initial.link, status: initial.status, nextStep: initial.nextStep, notes: initial.notes } : defaultForm());
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); onSave(form); };
  return <form className="form-card" onSubmit={submit} data-testid="opportunity-form"><div className="form-grid">
    <div className="field full"><label htmlFor="name">Opportunity name <span>*</span></label><input className="input" id="name" required value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="e.g. Product Design Intern" data-testid="input-opportunity-name" /></div>
    <div className="field"><label htmlFor="organization">Organization <span>*</span></label><input className="input" id="organization" required value={form.organization} onChange={(event) => set('organization', event.target.value)} placeholder="Who is it with?" data-testid="input-opportunity-organization" /></div>
    <div className="field"><label htmlFor="type">Type</label><select className="select" id="type" value={form.type} onChange={(event) => set('type', event.target.value)} data-testid="select-opportunity-type">{TYPES.map((item) => <option key={item}>{item}</option>)}</select></div>
    <div className="field"><label htmlFor="deadline">Deadline <span>*</span></label><input className="input" id="deadline" required type="date" value={form.deadline} onChange={(event) => set('deadline', event.target.value)} data-testid="input-opportunity-deadline" /></div>
    <div className="field"><label htmlFor="status">Status</label><select className="select" id="status" value={form.status} onChange={(event) => set('status', event.target.value)} data-testid="select-opportunity-status">{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></div>
    <div className="field full"><label htmlFor="link">Link</label><input className="input" id="link" type="url" value={form.link} onChange={(event) => set('link', event.target.value)} placeholder="https://" data-testid="input-opportunity-link" /><span className="field-hint">The posting, application, or contact page.</span></div>
    <div className="field full"><label htmlFor="nextStep">Next step</label><input className="input" id="nextStep" value={form.nextStep} onChange={(event) => set('nextStep', event.target.value)} placeholder="What is the smallest useful action?" data-testid="input-opportunity-next-step" /></div>
    <div className="field full"><label htmlFor="notes">Notes</label><textarea className="textarea" id="notes" value={form.notes} onChange={(event) => set('notes', event.target.value)} placeholder="Why does this path matter? Keep useful context here." data-testid="textarea-opportunity-notes" /></div>
  </div><div className="form-actions"><Link href={editing && initial ? `/opportunities/${initial.id}` : '/opportunities'} className="button button-quiet" data-testid="button-cancel-form">Cancel</Link><button className="button button-primary" type="submit" data-testid="button-save-opportunity"><Check size={15} /> {editing ? 'Save changes' : 'Add opportunity'}</button></div></form>;
}

function NewOpportunity() {
  const { addOpportunity, notify } = useCareerData();
  const [, setLocation] = useLocation();
  return <main className="page form-page fade-in" data-testid="page-new-opportunity"><Link href="/opportunities" className="eyebrow" data-testid="link-back-opportunities"><ArrowLeft size={12} /> Back to opportunities</Link><header style={{ margin: '20px 0 26px' }}><h1 className="page-title">Set a new <em>direction.</em></h1><p className="page-intro">Capture the details now. You can always refine the plan as you learn more.</p></header><OpportunityForm onSave={(data) => { const opportunity = addOpportunity(data); notify('Opportunity added to your compass'); setLocation(`/opportunities/${opportunity.id}`); }} /></main>;
}

function Detail() {
  const { id } = useParams<{ id: string }>();
  const { opportunities, updateOpportunity, deleteOpportunity, notify } = useCareerData();
  const [, setLocation] = useLocation();
  const opportunity = opportunities.find((item) => item.id === id);
  const [editing, setEditing] = useState(false);
  if (!opportunity) return <main className="page"><EmptyState title="This path moved" body="We could not find that opportunity. It may have been removed." action={<Link href="/opportunities" className="button button-primary" data-testid="button-return-opportunities">Back to opportunities</Link>} /></main>;
  if (editing) return <main className="page form-page fade-in" data-testid="page-edit-opportunity"><Link href={`/opportunities/${opportunity.id}`} className="eyebrow" onClick={() => setEditing(false)} data-testid="link-back-detail"><ArrowLeft size={12} /> Back to details</Link><header style={{ margin: '20px 0 26px' }}><h1 className="page-title">Refine the <em>route.</em></h1><p className="page-intro">Update anything that will help future-you take the next step.</p></header><OpportunityForm initial={opportunity} editing onSave={(data) => { updateOpportunity(opportunity.id, data); setEditing(false); notify('Changes saved'); }} /></main>;
  return <main className="page fade-in" data-testid={`page-opportunity-detail-${opportunity.id}`}><Link href="/opportunities" className="eyebrow" data-testid="link-detail-back"><ArrowLeft size={12} /> All opportunities</Link><div className="detail-head"><div><div className="eyebrow" style={{ marginTop: 20 }}>{opportunity.type}</div><h1 className="detail-title">{opportunity.name}<span>{opportunity.organization}</span></h1></div><div className="detail-actions"><button className="button button-quiet" onClick={() => setEditing(true)} data-testid="button-edit-opportunity"><Pencil size={14} /> Edit</button><button className="button button-danger" onClick={() => { if (window.confirm('Delete this opportunity?')) { deleteOpportunity(opportunity.id); notify('Opportunity deleted'); setLocation('/opportunities'); } }} data-testid="button-delete-opportunity"><Trash2 size={14} /> Delete</button></div></div><div className="detail-layout"><div><div className="detail-section"><h2>Current status</h2><div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{STATUSES.map((status) => <button className={`filter-chip ${opportunity.status === status ? 'active' : ''}`} key={status} onClick={() => { updateOpportunity(opportunity.id, { status }); notify(`Marked as ${status.toLowerCase()}`); }} data-testid={`button-status-${status.toLowerCase()}`}>{status}</button>)}</div></div><div className="detail-section"><h2>Next step</h2><div className="detail-next"><small>Keep moving</small>{opportunity.nextStep || 'Choose one small action to move this forward.'}</div></div><div className="detail-section"><h2>Notes</h2><p className="detail-note" data-testid="text-opportunity-notes">{opportunity.notes || 'No notes yet. Add context while it is fresh.'}</p></div></div><aside><div className="meta-block"><label>Deadline</label><p data-testid="text-opportunity-deadline">{formatDate(opportunity.deadline)}<br /><span style={{ color: daysUntil(opportunity.deadline) <= 7 ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))', fontSize: 11 }}>{deadlineLabel(opportunity.deadline)}</span></p></div><div className="meta-block"><label>Status</label><p><span className={statusClass(opportunity.status)} data-testid="text-opportunity-status">{opportunity.status}</span></p></div>{opportunity.link && <div className="meta-block"><label>Source link</label><a href={opportunity.link} target="_blank" rel="noreferrer" data-testid="link-opportunity-source">Open posting <ExternalLink size={12} /></a></div>}<div className="meta-block"><label>Added</label><p>{formatDate(opportunity.createdAt.slice(0, 10))}</p></div></aside></div></main>;
}

function Router() {
  return <Shell><ErrorBoundary resetKey={window.location.pathname}><Switch><Route path="/" component={Dashboard} /><Route path="/dashboard" component={Dashboard} /><Route path="/opportunities/new" component={NewOpportunity} /><Route path="/opportunities" component={Opportunities} /><Route path="/opportunities/:id" component={Detail} /><Route component={NotFound} /></Switch></ErrorBoundary></Shell>;
}

function App() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(readStored);
  const [toast, setToast] = useState('');
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(opportunities)); }, [opportunities]);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
  const value: DataContextValue = {
    opportunities,
    addOpportunity: (data) => { const opportunity = { ...data, id: uid(), createdAt: new Date().toISOString() }; setOpportunities((current) => [opportunity, ...current]); return opportunity; },
    updateOpportunity: (id, changes) => setOpportunities((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item)),
    deleteOpportunity: (id) => setOpportunities((current) => current.filter((item) => item.id !== id)),
    notify,
  };
  return <QueryClientProvider client={queryClient}><TooltipProvider><DataContext.Provider value={value}><Router />{toast && <div className="toast" role="status" data-testid="toast-message">{toast}</div>}</DataContext.Provider><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
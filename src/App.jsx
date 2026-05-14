import React, { useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'frankie-finance-tracker-v1';
const APP_THEME_COLOR = '#0f172a';
const PAYCHECK_ID = 'ssi-income';
const PAYCHECK_LABEL = 'SSI Income';
const ACCOUNT_ID = 'acct-frankie';
const ACCOUNT_NAME = 'Frankie';
const tabOrder = ['bills', 'debt', 'expenses', 'dashboard', 'accounts'];

const paycheckColor = { bg: '#dbeafe', text: '#1e3a8a', border: '#93c5fd' };

const tabThemes = {
  bills: { tint: '#fff7ed', accent: '#ea580c', iconBg: '#ffedd5' },
  debt: { tint: '#fdf2f8', accent: '#be185d', iconBg: '#fce7f3' },
  expenses: { tint: '#fffbeb', accent: '#b45309', iconBg: '#fef3c7' },
  dashboard: { tint: '#f5f3ff', accent: '#6d28d9', iconBg: '#ede9fe' },
  accounts: { tint: '#f0fdfa', accent: '#0f766e', iconBg: '#ccfbf1' },
};

const uid = () => Math.random().toString(36).slice(2, 10);
const currency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
const fmtShortDate = (d) => (d ? d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) : '—');
const selectAllProps = {
  onFocus: (e) => e.target.select(),
  onClick: (e) => e.currentTarget.select(),
};
const sanitizeMoneyInput = (value) => {
  const cleaned = String(value).replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) return cleaned;
  return parts[0] + '.' + parts.slice(1).join('');
};
const moneyStringFromNumber = (value) => (Number(value) === 0 ? '' : String(value));
const moneyNumberFromString = (value) => {
  if (value === '' || value === '.') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const makeIcon = (symbol) => ({ className = '' }) => (
  <span className={className} aria-hidden="true">
    {symbol}
  </span>
);

const AlertCircle = makeIcon('!');
const CalendarDays = makeIcon('📅');
const Check = makeIcon('✓');
const ChevronLeft = makeIcon('‹');
const ChevronRight = makeIcon('›');
const CreditCard = makeIcon('💳');
const DollarSign = makeIcon('$');
const Download = makeIcon('⬇');
const Pencil = makeIcon('✎');
const PiggyBank = makeIcon('🐖');
const Plus = makeIcon('+');
const Receipt = makeIcon('🧾');
const Trash2 = makeIcon('🗑');
const Upload = makeIcon('⬆');
const Wallet = makeIcon('👛');
const X = makeIcon('✕');

function createDefaultState() {
  return {
    currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    bills: [
      { id: uid(), name: 'Phone', dueDay: 8, amount: 85, status: 'Pending' },
      { id: uid(), name: 'Internet', dueDay: 24, amount: 60, status: 'Pending' },
      { id: uid(), name: 'Rent', dueDay: 1, amount: 1200, status: 'Pending' },
    ],
    debts: [
      { id: uid(), name: 'Credit Card', dueDay: 20, minPayment: 75, interestRate: 24.99, balance: 2100, status: 'Pending' },
      { id: uid(), name: 'Personal Loan', dueDay: 28, minPayment: 130, interestRate: 10.25, balance: 4800, status: 'Pending' },
    ],
    expenses: [
      { id: uid(), name: 'Groceries', day: 5, amount: 150 },
      { id: uid(), name: 'Gas', day: 12, amount: 60 },
    ],
    paycheckSettings: {
      [PAYCHECK_ID]: { baseIncome: 0, extraIncome: 0, extraDebtActual: 0 },
    },
    accounts: [{ id: ACCOUNT_ID, name: ACCOUNT_NAME, type: 'Checking', openingBalance: 0 }],
    history: [],
  };
}

function normalizeState(raw) {
  const fallback = createDefaultState();
  return {
    currentMonth: typeof raw?.currentMonth === 'string' ? raw.currentMonth : fallback.currentMonth,
    bills: Array.isArray(raw?.bills) ? raw.bills : fallback.bills,
    debts: Array.isArray(raw?.debts) ? raw.debts.map((d) => ({ ...d, status: d.status ?? 'Pending' })) : fallback.debts,
    expenses: Array.isArray(raw?.expenses) ? raw.expenses.map((e) => ({ ...e, day: e.day ?? 1 })) : fallback.expenses,
    paycheckSettings: raw?.paycheckSettings
      ? { [PAYCHECK_ID]: { ...fallback.paycheckSettings[PAYCHECK_ID], ...raw.paycheckSettings[PAYCHECK_ID] } }
      : fallback.paycheckSettings,
    accounts: Array.isArray(raw?.accounts) && raw.accounts.length ? raw.accounts : fallback.accounts,
    history: Array.isArray(raw?.history) ? raw.history : [],
  };
}

function loadInitialState() {
  if (typeof window === 'undefined') return normalizeState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : normalizeState();
  } catch {
    return normalizeState();
  }
}

function getBillFlags(bill, currentMonth) {
  const today = new Date();
  const viewedMonthKey = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getTime();
  const actualMonthKey = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  const isCurrentViewedMonth = viewedMonthKey === actualMonthKey;
  const isPastViewedMonth = viewedMonthKey < actualMonthKey;
  const todayDay = today.getDate();

  const isDueSoon =
    bill.status !== 'Paid' &&
    (isCurrentViewedMonth
      ? bill.dueDay >= todayDay && bill.dueDay <= Math.min(todayDay + 7, 31)
      : !isPastViewedMonth && bill.dueDay <= 7);

  const isOverdue = bill.status !== 'Paid' && (isPastViewedMonth || (isCurrentViewedMonth && bill.dueDay < todayDay));

  return { isDueSoon, isOverdue };
}

function filterBills(items, filter) {
  if (filter === 'Due Soon') return items.filter((item) => item.isDueSoon);
  if (filter === 'Overdue') return items.filter((item) => item.isOverdue);
  if (filter === 'Paid') return items.filter((item) => item.status === 'Paid');
  return items;
}

function AppButton({ children, variant = 'solid', size = 'md', className = '', type = 'button', ...props }) {
  const base = 'inline-flex items-center justify-center rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50';
  const sizes = { icon: 'h-9 w-9', sm: 'px-3 py-2 text-sm', md: 'px-4 py-2 text-sm' };
  const variants = {
    solid: 'bg-slate-900 text-white hover:bg-slate-800',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-700 hover:bg-slate-100',
  };
  return (
    <button type={type} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

function AppCard({ children, className = '', style }) {
  return <div className={`rounded-3xl border border-slate-300 bg-white shadow-sm ${className}`} style={style}>{children}</div>;
}

function AppCardHeader({ children, className = '' }) {
  return <div className={`p-4 pb-2 ${className}`}>{children}</div>;
}

function AppCardContent({ children, className = '' }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

function AppBadge({ children, className = '' }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>{children}</span>;
}

function AppInput(props) {
  return <input className={`w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 ${props.className || ''}`} {...props} />;
}

function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-3xl border border-slate-300 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="text-base font-semibold">{title}</div>
          <AppButton variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></AppButton>
        </div>
        <div className="p-4">{children}</div>
        {footer ? <div className="border-t border-slate-200 p-4">{footer}</div> : null}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function PaycheckPill() {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: paycheckColor.bg, color: paycheckColor.text }}>
      {PAYCHECK_LABEL}
    </span>
  );
}

function QuickPaidButton({ status, onToggle }) {
  if (status === 'Paid') return null;
  return (
    <AppButton size="sm" className="rounded-xl" onClick={onToggle}>
      <Check className="mr-1 h-3.5 w-3.5" /> Mark Paid
    </AppButton>
  );
}

function FilterBar({ value, onChange }) {
  const options = ['All', 'Due Soon', 'Overdue', 'Paid'];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <AppButton key={option} size="sm" variant={value === option ? 'solid' : 'outline'} onClick={() => onChange(option)}>
          {option}
        </AppButton>
      ))}
    </div>
  );
}

function SummaryCard({ title, value, icon, theme = 'dashboard' }) {
  const colors = tabThemes[theme];
  return (
    <AppCard>
      <AppCardContent>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.iconBg, color: colors.accent }}>
            {icon}
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.accent }}>{title}</span>
        </div>
        <div className="text-lg font-bold leading-tight text-slate-900">{value}</div>
      </AppCardContent>
    </AppCard>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="text-slate-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function TopListBar({ title, value, onAdd, addLabel }) {
  return (
    <AppCard>
      <AppCardContent className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">{title}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
        <AppButton onClick={onAdd}><Plus className="mr-1 h-4 w-4" /> {addLabel}</AppButton>
      </AppCardContent>
    </AppCard>
  );
}

function BillDialog({ state, setState, onSave }) {
  const [draft, setDraft] = useState({ id: uid(), name: '', dueDay: 1, amount: '', status: 'Pending' });

  useEffect(() => {
    if (state.open) setDraft(state.item ? { ...state.item, amount: moneyStringFromNumber(state.item.amount) } : { id: uid(), name: '', dueDay: 1, amount: '', status: 'Pending' });
  }, [state]);

  return (
    <Modal open={state.open} title={state.item ? 'Edit Bill' : 'Add Bill'} onClose={() => setState({ open: false, item: null })} footer={<AppButton className="w-full" onClick={() => { onSave({ ...draft, amount: moneyNumberFromString(draft.amount) }); setState({ open: false, item: null }); }}>Save</AppButton>}>
      <div className="space-y-4">
        <Field label="Bill Name"><AppInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
        <Field label="Due Day"><AppInput type="number" min={1} max={31} {...selectAllProps} value={draft.dueDay} onChange={(e) => setDraft({ ...draft, dueDay: Number(e.target.value) })} /></Field>
        <Field label="Amount"><AppInput type="text" inputMode="decimal" {...selectAllProps} value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: sanitizeMoneyInput(e.target.value) })} /></Field>
        <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm">
          <span>Status Paid</span>
          <input type="checkbox" checked={draft.status === 'Paid'} onChange={(e) => setDraft({ ...draft, status: e.target.checked ? 'Paid' : 'Pending' })} />
        </label>
      </div>
    </Modal>
  );
}

function DebtDialog({ state, setState, onSave }) {
  const [draft, setDraft] = useState({ id: uid(), name: '', dueDay: 1, minPayment: '', interestRate: '', balance: '', status: 'Pending' });

  useEffect(() => {
    if (state.open) setDraft(state.item ? { ...state.item, minPayment: moneyStringFromNumber(state.item.minPayment), interestRate: moneyStringFromNumber(state.item.interestRate), balance: moneyStringFromNumber(state.item.balance) } : { id: uid(), name: '', dueDay: 1, minPayment: '', interestRate: '', balance: '', status: 'Pending' });
  }, [state]);

  return (
    <Modal open={state.open} title={state.item ? 'Edit Debt' : 'Add Debt'} onClose={() => setState({ open: false, item: null })} footer={<AppButton className="w-full" onClick={() => { onSave({ ...draft, minPayment: moneyNumberFromString(draft.minPayment), interestRate: moneyNumberFromString(draft.interestRate), balance: moneyNumberFromString(draft.balance) }); setState({ open: false, item: null }); }}>Save</AppButton>}>
      <div className="space-y-4">
        <Field label="Debt Name"><AppInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
        <Field label="Due Day"><AppInput type="number" min={1} max={31} {...selectAllProps} value={draft.dueDay} onChange={(e) => setDraft({ ...draft, dueDay: Number(e.target.value) })} /></Field>
        <Field label="Minimum Payment"><AppInput type="text" inputMode="decimal" {...selectAllProps} value={draft.minPayment} onChange={(e) => setDraft({ ...draft, minPayment: sanitizeMoneyInput(e.target.value) })} /></Field>
        <Field label="Interest Rate"><AppInput type="text" inputMode="decimal" {...selectAllProps} value={draft.interestRate} onChange={(e) => setDraft({ ...draft, interestRate: sanitizeMoneyInput(e.target.value) })} /></Field>
        <Field label="Current Balance"><AppInput type="text" inputMode="decimal" {...selectAllProps} value={draft.balance} onChange={(e) => setDraft({ ...draft, balance: sanitizeMoneyInput(e.target.value) })} /></Field>
        <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm">
          <span>Status Paid</span>
          <input type="checkbox" checked={draft.status === 'Paid'} onChange={(e) => setDraft({ ...draft, status: e.target.checked ? 'Paid' : 'Pending' })} />
        </label>
      </div>
    </Modal>
  );
}

function ExpenseDialog({ state, setState, onSave }) {
  const [draft, setDraft] = useState({ id: uid(), name: '', day: 1, amount: '' });

  useEffect(() => {
    if (state.open) setDraft(state.item ? { ...state.item, amount: moneyStringFromNumber(state.item.amount) } : { id: uid(), name: '', day: 1, amount: '' });
  }, [state]);

  return (
    <Modal open={state.open} title={state.item ? 'Edit Expense' : 'Add Expense'} onClose={() => setState({ open: false, item: null })} footer={<AppButton className="w-full" onClick={() => { onSave({ ...draft, amount: moneyNumberFromString(draft.amount) }); setState({ open: false, item: null }); }}>Save</AppButton>}>
      <div className="space-y-4">
        <Field label="Expense Name"><AppInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
        <Field label="Day"><AppInput type="number" min={1} max={31} {...selectAllProps} value={draft.day} onChange={(e) => setDraft({ ...draft, day: Number(e.target.value) })} /></Field>
        <Field label="Amount"><AppInput type="text" inputMode="decimal" {...selectAllProps} value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: sanitizeMoneyInput(e.target.value) })} /></Field>
      </div>
    </Modal>
  );
}

function PaycheckDialog({ open, setOpen, settings, onSave }) {
  const [draft, setDraft] = useState({ baseIncome: '', extraIncome: '', extraDebtActual: '' });

  useEffect(() => {
    if (open) {
      setDraft({
        baseIncome: moneyStringFromNumber(settings.baseIncome),
        extraIncome: moneyStringFromNumber(settings.extraIncome),
        extraDebtActual: moneyStringFromNumber(settings.extraDebtActual),
      });
    }
  }, [open, settings]);

  return (
    <Modal open={open} title="Edit SSI Income" onClose={() => setOpen(false)} footer={<AppButton className="w-full" onClick={() => { onSave({ baseIncome: moneyNumberFromString(draft.baseIncome), extraIncome: moneyNumberFromString(draft.extraIncome), extraDebtActual: moneyNumberFromString(draft.extraDebtActual) }); setOpen(false); }}>Save</AppButton>}>
      <div className="space-y-4">
        <Field label="Base Income"><AppInput type="text" inputMode="decimal" {...selectAllProps} value={draft.baseIncome} onChange={(e) => setDraft({ ...draft, baseIncome: sanitizeMoneyInput(e.target.value) })} /></Field>
        <Field label="Extra Income (This Month)"><AppInput type="text" inputMode="decimal" {...selectAllProps} value={draft.extraIncome} onChange={(e) => setDraft({ ...draft, extraIncome: sanitizeMoneyInput(e.target.value) })} /></Field>
        <Field label="Extra Debt Applied (This Month)"><AppInput type="text" inputMode="decimal" {...selectAllProps} value={draft.extraDebtActual} onChange={(e) => setDraft({ ...draft, extraDebtActual: sanitizeMoneyInput(e.target.value) })} /></Field>
      </div>
    </Modal>
  );
}

function AccountDialog({ state, setState, onSave }) {
  const [draft, setDraft] = useState({ id: ACCOUNT_ID, name: ACCOUNT_NAME, type: 'Checking', openingBalance: '' });

  useEffect(() => {
    if (state.open) setDraft(state.item ? { ...state.item, openingBalance: moneyStringFromNumber(state.item.openingBalance) } : { id: ACCOUNT_ID, name: ACCOUNT_NAME, type: 'Checking', openingBalance: '' });
  }, [state]);

  return (
    <Modal open={state.open} title="Edit Account" onClose={() => setState({ open: false, item: null })} footer={<AppButton className="w-full" onClick={() => { onSave({ ...draft, openingBalance: moneyNumberFromString(draft.openingBalance) }); setState({ open: false, item: null }); }}>Save</AppButton>}>
      <div className="space-y-4">
        <Field label="Account Name"><AppInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
        <Field label="Account Type">
          <select className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
            <option value="Checking">Checking</option>
            <option value="Savings">Savings</option>
          </select>
        </Field>
        <Field label="Account Balance"><AppInput type="text" inputMode="decimal" {...selectAllProps} value={draft.openingBalance} onChange={(e) => setDraft({ ...draft, openingBalance: sanitizeMoneyInput(e.target.value) })} /></Field>
      </div>
    </Modal>
  );
}

export default function App() {
  const initialState = useMemo(() => loadInitialState(), []);
  const importInputRef = useRef(null);

  const [currentMonth, setCurrentMonth] = useState(new Date(initialState.currentMonth));
  const [bills, setBills] = useState(initialState.bills);
  const [debts, setDebts] = useState(initialState.debts);
  const [expenses, setExpenses] = useState(initialState.expenses);
  const [paycheckSettings, setPaycheckSettings] = useState(initialState.paycheckSettings);
  const [accounts, setAccounts] = useState(initialState.accounts);
  const [history, setHistory] = useState(initialState.history);
  const [billsFilter, setBillsFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('bills');
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);
  });
  const [storagePersistence, setStoragePersistence] = useState('checking');
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState('checking');

  const [billDialog, setBillDialog] = useState({ open: false, item: null });
  const [debtDialog, setDebtDialog] = useState({ open: false, item: null });
  const [expenseDialog, setExpenseDialog] = useState({ open: false, item: null });
  const [paycheckDialog, setPaycheckDialog] = useState(false);
  const [accountDialog, setAccountDialog] = useState({ open: false, item: null });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const routeTab = params.get('tab');
    const routeMonth = Number(params.get('month'));
    const routeYear = Number(params.get('year'));

    if (tabOrder.includes(routeTab)) setActiveTab(routeTab);
    if (Number.isInteger(routeMonth) && Number.isInteger(routeYear) && routeMonth >= 1 && routeMonth <= 12) {
      setCurrentMonth(new Date(routeYear, routeMonth - 1, 1));
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    document.title = "Frankie's Finance Tracker";

    const ensureMeta = (selector, attrs) => {
      let tag = document.head.querySelector(selector);
      if (!tag) {
        tag = document.createElement('meta');
        Object.entries(attrs).forEach(([key, value]) => tag.setAttribute(key, value));
        document.head.appendChild(tag);
      }
      return tag;
    };

    ensureMeta('meta[name="theme-color"]', { name: 'theme-color' }).setAttribute('content', APP_THEME_COLOR);
    ensureMeta('meta[name="apple-mobile-web-app-capable"]', { name: 'apple-mobile-web-app-capable' }).setAttribute('content', 'yes');
    ensureMeta('meta[name="apple-mobile-web-app-status-bar-style"]', { name: 'apple-mobile-web-app-status-bar-style' }).setAttribute('content', 'default');
    ensureMeta('meta[name="apple-mobile-web-app-title"]', { name: 'apple-mobile-web-app-title' }).setAttribute('content', "Frankie Tracker");

    const updateDeviceStatus = () => {
      setIsOnline(window.navigator.onLine);
      setIsStandalone(Boolean(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true));
    };

    updateDeviceStatus();
    window.addEventListener('online', updateDeviceStatus);
    window.addEventListener('offline', updateDeviceStatus);

    const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
    const mediaListener = () => updateDeviceStatus();
    if (mediaQuery?.addEventListener) mediaQuery.addEventListener('change', mediaListener);
    else if (mediaQuery?.addListener) mediaQuery.addListener(mediaListener);

    return () => {
      window.removeEventListener('online', updateDeviceStatus);
      window.removeEventListener('offline', updateDeviceStatus);
      if (mediaQuery?.removeEventListener) mediaQuery.removeEventListener('change', mediaListener);
      else if (mediaQuery?.removeListener) mediaQuery.removeListener(mediaListener);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const checkPersistentStorage = async () => {
      if (typeof navigator === 'undefined' || !navigator.storage?.persisted) {
        if (!cancelled) setStoragePersistence('unsupported');
        return;
      }

      try {
        const persisted = await navigator.storage.persisted();
        if (!cancelled) setStoragePersistence(persisted ? 'granted' : 'not-granted');
      } catch {
        if (!cancelled) setStoragePersistence('unsupported');
      }
    };

    checkPersistentStorage();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const checkServiceWorkerStatus = async () => {
      if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
      if (!('serviceWorker' in navigator)) {
        if (!cancelled) setServiceWorkerStatus('unsupported');
        return;
      }

      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isSecure) {
        if (!cancelled) setServiceWorkerStatus('needs-https');
        return;
      }

      try {
        const existingRegistration = await navigator.serviceWorker.getRegistration();
        if (!cancelled) setServiceWorkerStatus(existingRegistration ? 'registered' : 'ready-for-host');
      } catch {
        if (!cancelled) setServiceWorkerStatus('ready-for-host');
      }
    };

    checkServiceWorkerStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    url.searchParams.set('month', String(currentMonth.getMonth() + 1));
    url.searchParams.set('year', String(currentMonth.getFullYear()));
    window.history.replaceState({}, '', url.toString());
  }, [activeTab, currentMonth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currentMonth: currentMonth.toISOString(),
        bills,
        debts,
        expenses,
        paycheckSettings,
        accounts,
        history,
      })
    );
  }, [currentMonth, bills, debts, expenses, paycheckSettings, accounts, history]);

  const requestPersistentStorage = async () => {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
      setStoragePersistence('unsupported');
      window.alert('Persistent storage is not supported on this browser.');
      return;
    }

    try {
      const granted = await navigator.storage.persist();
      setStoragePersistence(granted ? 'granted' : 'not-granted');
      window.alert(granted ? 'Persistent storage was enabled if supported on this device.' : 'Persistent storage was not granted on this browser.');
    } catch {
      setStoragePersistence('unsupported');
      window.alert('Persistent storage could not be requested on this browser.');
    }
  };

  const storageStatusLabel = storagePersistence === 'granted' ? 'Persistent' : storagePersistence === 'not-granted' ? 'Standard' : storagePersistence === 'unsupported' ? 'Unsupported' : 'Checking…';
  const serviceWorkerStatusLabel = serviceWorkerStatus === 'registered' ? 'Offline Cache Active' : serviceWorkerStatus === 'ready-for-host' ? 'Ready When Hosted' : serviceWorkerStatus === 'needs-https' ? 'Needs HTTPS' : serviceWorkerStatus === 'unsupported' ? 'Unsupported' : 'Checking…';

  const payDate = useMemo(() => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1), [currentMonth]);
  const income = paycheckSettings[PAYCHECK_ID].baseIncome + paycheckSettings[PAYCHECK_ID].extraIncome;

  const assignedBills = useMemo(() => bills.map((bill) => {
    const flags = getBillFlags(bill, currentMonth);
    return { ...bill, ...flags };
  }).sort((a, b) => a.dueDay - b.dueDay), [bills, currentMonth]);

  const visibleDebts = useMemo(() => debts.map((debt) => ({ ...debt })).sort((a, b) => a.dueDay - b.dueDay), [debts]);

  const billsTotal = useMemo(() => assignedBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0), [assignedBills]);
  const debtTotal = useMemo(() => visibleDebts.reduce((sum, debt) => sum + Number(debt.balance || 0), 0), [visibleDebts]);
  const expenseTotal = useMemo(() => expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0), [expenses]);
  const debtMinTotal = useMemo(() => visibleDebts.reduce((sum, debt) => sum + Number(debt.minPayment || 0), 0), [visibleDebts]);
  const actualExtraDebtAmount = Number((paycheckSettings[PAYCHECK_ID].extraDebtActual || 0).toFixed(2));
  const totalObligations = billsTotal + expenseTotal + debtMinTotal + actualExtraDebtAmount;
  const remaining1 = income - totalObligations;
  const living = remaining1 > 0 ? Number((remaining1 * 0.25).toFixed(2)) : 0;
  const remaining2 = remaining1 - living;
  const savings = remaining2 > 0 ? Number((remaining2 * 0.15).toFixed(2)) : 0;
  const suggestedExtraDebtAmount = remaining2 - savings > 0 ? Number((remaining2 - savings).toFixed(2)) : 0;
  const targetDebt = [...visibleDebts].filter((debt) => debt.balance > 0).sort((a, b) => b.interestRate - a.interestRate || b.balance - a.balance)[0];

  const accountSummary = useMemo(() => {
    const account = accounts[0] || { id: ACCOUNT_ID, name: ACCOUNT_NAME, type: 'Checking', openingBalance: 0 };
    const deposits = income;
    const billTotal = billsTotal;
    const debtTotalDue = debtMinTotal;
    const expenseTotalDue = expenseTotal;
    const extraDebtTotal = actualExtraDebtAmount;
    const projectedBalance = Number(account.openingBalance || 0) + deposits - billTotal - debtTotalDue - expenseTotalDue - extraDebtTotal;
    return { ...account, deposits, billTotal, debtTotal: debtTotalDue, expenseTotal: expenseTotalDue, extraDebtTotal, projectedBalance };
  }, [accounts, income, billsTotal, debtMinTotal, expenseTotal, actualExtraDebtAmount]);

  const ledgerEntries = useMemo(() => {
    const entries = [];
    entries.push({ id: 'paycheck', day: 1, label: PAYCHECK_LABEL, subtitle: 'Monthly income', amount: income, kind: 'deposit' });
    assignedBills.forEach((bill) => entries.push({ id: `bill-${bill.id}`, day: bill.dueDay, label: bill.name, subtitle: 'Bill', amount: bill.amount, kind: 'withdrawal', status: bill.status }));
    visibleDebts.forEach((debt) => entries.push({ id: `debt-${debt.id}`, day: debt.dueDay, label: debt.name, subtitle: 'Debt payment', amount: debt.minPayment, kind: 'withdrawal', status: debt.status }));
    expenses.forEach((expense) => entries.push({ id: `expense-${expense.id}`, day: expense.day, label: expense.name, subtitle: 'Expense', amount: expense.amount, kind: 'withdrawal', status: 'Planned' }));
    if (actualExtraDebtAmount > 0) {
      entries.push({ id: 'extra-debt', day: 1, label: targetDebt?.name || 'Extra Debt', subtitle: 'Extra debt payment', amount: actualExtraDebtAmount, kind: 'withdrawal', status: 'Planned' });
    }
    return entries.sort((a, b) => a.day - b.day || (a.kind === 'deposit' ? -1 : 1));
  }, [income, assignedBills, visibleDebts, expenses, actualExtraDebtAmount, targetDebt]);

  const exportBackup = () => {
    const payload = { currentMonth: currentMonth.toISOString(), bills, debts, expenses, paycheckSettings, accounts, history };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frankie-finance-tracker-backup-${currentMonth.getFullYear()}-${currentMonth.getMonth() + 1}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = normalizeState(JSON.parse(text));
      setCurrentMonth(new Date(parsed.currentMonth));
      setBills(parsed.bills);
      setDebts(parsed.debts);
      setExpenses(parsed.expenses);
      setPaycheckSettings(parsed.paycheckSettings);
      setAccounts(parsed.accounts);
      setHistory(parsed.history);
    } catch {
      window.alert('That backup file could not be read.');
    } finally {
      event.target.value = '';
    }
  };

  const previousMonth = () => {
    if (!history.length) return;
    const last = history[history.length - 1];
    setCurrentMonth(new Date(last.currentMonth));
    setBills(last.bills);
    setDebts(last.debts);
    setExpenses(last.expenses);
    setPaycheckSettings(last.paycheckSettings);
    setAccounts(last.accounts);
    setHistory((prev) => prev.slice(0, -1));
  };

  const nextMonth = () => {
    const snapshot = JSON.parse(JSON.stringify({ currentMonth: currentMonth.toISOString(), bills, debts, expenses, paycheckSettings, accounts }));
    const nextOpeningBalance = accountSummary.projectedBalance;

    setHistory((prev) => [...prev, snapshot]);
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setBills((prev) => prev.map((bill) => ({ ...bill, status: 'Pending' })));
    setDebts((prev) => prev.map((debt) => ({
      ...debt,
      balance: Math.max(0, debt.balance - (debt.status === 'Paid' ? debt.minPayment : 0) - (targetDebt?.id === debt.id ? actualExtraDebtAmount : 0)),
      status: 'Pending',
    })));
    setPaycheckSettings((prev) => ({
      [PAYCHECK_ID]: { ...prev[PAYCHECK_ID], extraIncome: 0, extraDebtActual: 0 },
    }));
    setAccounts((prev) => prev.map((account, index) => index === 0 ? { ...account, openingBalance: nextOpeningBalance } : account));
  };

  const toggleBillPaid = (id) => setBills((prev) => prev.map((bill) => (bill.id === id ? { ...bill, status: bill.status === 'Paid' ? 'Pending' : 'Paid' } : bill)));
  const toggleDebtPaid = (id) => setDebts((prev) => prev.map((debt) => (debt.id === id ? { ...debt, status: debt.status === 'Paid' ? 'Pending' : 'Paid' } : debt)));

  const renderedLedgerEntries = (() => {
    let runningBalance = Number(accountSummary.openingBalance || 0);
    return ledgerEntries.map((entry) => {
      runningBalance += entry.kind === 'deposit' ? Number(entry.amount || 0) : -Number(entry.amount || 0);
      return (
        <div key={entry.id} className="rounded-xl bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{entry.label}</div>
              <div className="text-xs text-slate-500">Day {entry.day} • {entry.subtitle}</div>
              {entry.status ? <div className="mt-1 text-[11px] text-slate-500">{entry.status}</div> : null}
            </div>
            <div className="text-right">
              <div className={`font-semibold ${entry.kind === 'deposit' ? 'text-emerald-700' : 'text-slate-900'}`}>
                {entry.kind === 'deposit' ? '+' : '-'}{currency(entry.amount)}
              </div>
              <div className="mt-1 text-xs text-slate-500">Running: {currency(runningBalance)}</div>
            </div>
          </div>
        </div>
      );
    });
  })();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f7f3eb' }}>
      <div className="mx-auto max-w-md px-4 pb-24 pt-4">
        <div className="mb-3 rounded-2xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Your data saves automatically on this device.</div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-slate-500">Frankie's Finance Tracker</div>
            <div className="text-2xl font-bold tracking-tight">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
          </div>
          <div className="flex items-center gap-2">
            <AppButton variant="outline" onClick={previousMonth} disabled={!history.length}><ChevronLeft className="mr-1 h-4 w-4" /> Prev</AppButton>
            <AppButton onClick={nextMonth}>Next Month <ChevronRight className="ml-1 h-4 w-4" /></AppButton>
          </div>
        </div>

        <div className="grid h-auto w-full grid-cols-5 gap-1 rounded-2xl border border-slate-300 bg-white p-1 shadow-sm">
          {[
            ['bills', 'Bills'],
            ['debt', 'Debt'],
            ['expenses', 'Expenses'],
            ['dashboard', 'Paychecks'],
            ['accounts', 'Accounts'],
          ].map(([value, label]) => (
            <button key={value} type="button" onClick={() => setActiveTab(value)} className={`min-w-0 whitespace-normal rounded-xl border border-slate-300 px-1 py-2 text-center text-[11px] font-semibold leading-tight ${activeTab === value ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'bills' ? (
          <div className="space-y-4 pt-4">
            <AppCard style={{ backgroundColor: tabThemes.bills.tint }}><AppCardContent><div className="text-sm font-semibold" style={{ color: tabThemes.bills.accent }}>Bills Overview</div><div className="mt-1 text-sm text-slate-600">Keep track of recurring bills, what is due soon, and what is already paid.</div></AppCardContent></AppCard>
            <TopListBar title="Monthly Bills Total" value={currency(billsTotal)} onAdd={() => setBillDialog({ open: true, item: null })} addLabel="Add Bill" />
            <FilterBar value={billsFilter} onChange={setBillsFilter} />
            <div className="space-y-3">
              {filterBills(assignedBills, billsFilter).length ? filterBills(assignedBills, billsFilter).map((bill) => (
                <AppCard key={bill.id} style={{ borderLeft: `6px solid ${paycheckColor.border}` }}>
                  <AppCardContent>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{bill.name}</div>
                        <div className="mt-2"><PaycheckPill /></div>
                        <div className="mt-2 text-sm text-slate-500">Due {bill.dueDay}</div>
                        <div className="mt-2 flex items-center gap-2">
                          {bill.status === 'Paid' ? (
                            <button type="button" onClick={() => toggleBillPaid(bill.id)} className="inline-flex items-center rounded-full border border-green-700 bg-green-700 px-2.5 py-1 text-xs font-medium text-white">Paid</button>
                          ) : (
                            <>
                              <AppBadge className={bill.isOverdue ? 'border-red-800 bg-red-700 text-white' : bill.isDueSoon ? 'border-red-200 bg-red-100 text-red-800' : 'border-slate-200 bg-slate-100 text-slate-800'}>{bill.isOverdue ? 'Overdue' : bill.isDueSoon ? 'Due Soon' : 'Pending'}</AppBadge>
                              <QuickPaidButton status={bill.status} onToggle={() => toggleBillPaid(bill.id)} />
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{currency(bill.amount)}</div>
                        <div className="mt-3 flex gap-2">
                          <AppButton size="icon" variant="outline" onClick={() => setBillDialog({ open: true, item: bill })}><Pencil className="h-4 w-4" /></AppButton>
                          <AppButton size="icon" variant="outline" onClick={() => setBills((prev) => prev.filter((row) => row.id !== bill.id))}><Trash2 className="h-4 w-4" /></AppButton>
                        </div>
                      </div>
                    </div>
                  </AppCardContent>
                </AppCard>
              )) : <AppCard><AppCardContent className="text-sm text-slate-500">No matching bills for this filter.</AppCardContent></AppCard>}
            </div>
          </div>
        ) : null}

        {activeTab === 'debt' ? (
          <div className="space-y-4 pt-4">
            <AppCard style={{ backgroundColor: tabThemes.debt.tint }}><AppCardContent><div className="text-sm font-semibold" style={{ color: tabThemes.debt.accent }}>Debt Overview</div><div className="mt-1 text-sm text-slate-600">Watch balances, payments, and extra debt applied without making the screen feel heavy.</div></AppCardContent></AppCard>
            <TopListBar title="Total Debt Remaining" value={currency(debtTotal)} onAdd={() => setDebtDialog({ open: true, item: null })} addLabel="Add Debt" />
            <div className="space-y-3">
              {visibleDebts.map((debt) => (
                <AppCard key={debt.id} style={{ borderLeft: `6px solid ${paycheckColor.border}` }}>
                  <AppCardContent>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{debt.name}</div>
                        <div className="mt-2"><PaycheckPill /></div>
                        <div className="mt-2 text-sm text-slate-500">Due {debt.dueDay}</div>
                        <div className="mt-1 text-sm text-slate-500">Min {currency(debt.minPayment)} • {debt.interestRate}%</div>
                        <div className="mt-2 flex items-center gap-2 text-sm"><AlertCircle className="h-4 w-4 text-slate-400" /><span>Balance: {currency(debt.balance)}</span></div>
                        <div className="mt-2 flex items-center gap-2">
                          {debt.status === 'Paid' ? (
                            <button type="button" onClick={() => toggleDebtPaid(debt.id)} className="inline-flex items-center rounded-full border border-green-700 bg-green-700 px-2.5 py-1 text-xs font-medium text-white">Paid</button>
                          ) : (
                            <>
                              <AppBadge className="border-slate-200 bg-slate-100 text-slate-800">Pending</AppBadge>
                              <QuickPaidButton status={debt.status} onToggle={() => toggleDebtPaid(debt.id)} />
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <AppButton size="icon" variant="outline" onClick={() => setDebtDialog({ open: true, item: debt })}><Pencil className="h-4 w-4" /></AppButton>
                        <AppButton size="icon" variant="outline" onClick={() => setDebts((prev) => prev.filter((row) => row.id !== debt.id))}><Trash2 className="h-4 w-4" /></AppButton>
                      </div>
                    </div>
                  </AppCardContent>
                </AppCard>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === 'expenses' ? (
          <div className="space-y-4 pt-4">
            <AppCard style={{ backgroundColor: tabThemes.expenses.tint }}><AppCardContent><div className="text-sm font-semibold" style={{ color: tabThemes.expenses.accent }}>Expenses Overview</div><div className="mt-1 text-sm text-slate-600">Track changing expenses that show up during the month.</div></AppCardContent></AppCard>
            <TopListBar title="Monthly Expenses Total" value={currency(expenseTotal)} onAdd={() => setExpenseDialog({ open: true, item: null })} addLabel="Add Expense" />
            <div className="space-y-3">
              {expenses.map((expense) => (
                <AppCard key={expense.id} style={{ borderLeft: `6px solid ${paycheckColor.border}` }}>
                  <AppCardContent>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{expense.name}</div>
                        <div className="mt-2 text-sm text-slate-500">Day {expense.day}</div>
                        <div className="mt-2 text-sm text-slate-500"><PaycheckPill /></div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{currency(expense.amount)}</div>
                        <div className="mt-3 flex gap-2">
                          <AppButton size="icon" variant="outline" onClick={() => setExpenseDialog({ open: true, item: expense })}><Pencil className="h-4 w-4" /></AppButton>
                          <AppButton size="icon" variant="outline" onClick={() => setExpenses((prev) => prev.filter((row) => row.id !== expense.id))}><Trash2 className="h-4 w-4" /></AppButton>
                        </div>
                      </div>
                    </div>
                  </AppCardContent>
                </AppCard>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === 'dashboard' ? (
          <div className="space-y-4 pt-4">
            <AppCard style={{ backgroundColor: tabThemes.dashboard.tint }}><AppCardContent><div className="text-sm font-semibold" style={{ color: tabThemes.dashboard.accent }}>Paychecks Overview</div><div className="mt-1 text-sm text-slate-600">Frankie receives SSI Income on the 1st of every month.</div></AppCardContent></AppCard>
            <AppCard>
              <AppCardHeader><div className="text-base font-semibold">Frankie’s Phone Setup</div></AppCardHeader>
              <AppCardContent className="space-y-3 text-sm text-slate-600">
                <div>This version is set up to be simple and app-like, without notifications.</div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="font-medium text-slate-700">How Frankie should install it</div>
                  <div className="mt-2 space-y-1 text-xs text-slate-500">
                    <div>1. Open the hosted link in Safari on iPhone.</div>
                    <div>2. Tap Share.</div>
                    <div>3. Tap Add to Home Screen.</div>
                    <div>4. Open it from the new phone icon like an app.</div>
                  </div>
                </div>
              </AppCardContent>
            </AppCard>
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard title="Monthly Income" value={currency(income)} icon={<DollarSign className="h-4 w-4" />} theme="dashboard" />
              <SummaryCard title="Obligations" value={currency(totalObligations)} icon={<Receipt className="h-4 w-4" />} theme="dashboard" />
              <SummaryCard title="Left After Bills" value={currency(income - totalObligations)} icon={<PiggyBank className="h-4 w-4" />} theme="dashboard" />
              <SummaryCard title="Debt Still Due" value={currency(debtTotal)} icon={<CreditCard className="h-4 w-4" />} theme="dashboard" />
            </div>
            <AppCard style={{ borderLeft: `6px solid ${paycheckColor.border}` }}>
              <AppCardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-2"><PaycheckPill /></div>
                    <div className="text-lg font-semibold">{PAYCHECK_LABEL}</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-500"><CalendarDays className="h-4 w-4" /> {fmtShortDate(payDate)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <AppBadge className="border-slate-900 bg-slate-900 text-white">{currency(income)}</AppBadge>
                    <AppButton size="sm" variant="outline" onClick={() => setPaycheckDialog(true)}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</AppButton>
                  </div>
                </div>
              </AppCardHeader>
              <AppCardContent>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="Bills" value={currency(billsTotal + expenseTotal)} />
                    <Stat label="Debt" value={currency(debtMinTotal + actualExtraDebtAmount)} />
                    <Stat label="Living" value={currency(living)} />
                    <Stat label="Savings" value={currency(savings)} />
                    <Stat label="Extra Income" value={currency(paycheckSettings[PAYCHECK_ID].extraIncome)} />
                    <Stat label="Extra Debt Entered" value={currency(actualExtraDebtAmount)} />
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3"><div className="text-slate-500">Suggested Extra Debt</div><div className="font-semibold">{currency(suggestedExtraDebtAmount)}</div><div className="mt-1 text-xs text-slate-500">Target: {targetDebt?.name || 'None'}</div></div>
                </div>
              </AppCardContent>
            </AppCard>
          </div>
        ) : null}

        {activeTab === 'accounts' ? (
          <div className="space-y-4 pt-4">
            <AppCard style={{ backgroundColor: tabThemes.accounts.tint }}><AppCardContent><div className="text-sm font-semibold" style={{ color: tabThemes.accounts.accent }}>Accounts Overview</div><div className="mt-1 text-sm text-slate-600">See balances, projected activity, and your running ledger in one cleaner view.</div></AppCardContent></AppCard>
            <TopListBar title="Projected Balance" value={currency(accountSummary.projectedBalance)} onAdd={() => setAccountDialog({ open: true, item: accounts[0] || null })} addLabel="Edit Account" />
            <AppCard>
              <AppCardHeader><div className="text-base font-semibold">Backup & Restore</div></AppCardHeader>
              <AppCardContent className="space-y-3">
                <div className="text-sm text-slate-500">Download a backup file of your current data or restore from one you saved earlier.</div>
                <div className="flex gap-2">
                  <AppButton onClick={exportBackup}><Download className="mr-1 h-4 w-4" /> Export</AppButton>
                  <AppButton variant="outline" onClick={() => importInputRef.current?.click()}><Upload className="mr-1 h-4 w-4" /> Import</AppButton>
                </div>
                <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={importBackup} />
              </AppCardContent>
            </AppCard>
            <AppCard>
              <AppCardHeader><div className="text-base font-semibold">Offline & Device Setup</div></AppCardHeader>
              <AppCardContent className="space-y-3 text-sm text-slate-600">
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Connection" value={isOnline ? 'Online' : 'Offline'} />
                  <Stat label="Home Screen" value={isStandalone ? 'Added' : 'Browser Only'} />
                  <Stat label="Storage" value={storageStatusLabel} />
                  <Stat label="Offline Cache" value={serviceWorkerStatusLabel} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <AppButton variant="outline" onClick={requestPersistentStorage}>Request Persistent Storage</AppButton>
                </div>
              </AppCardContent>
            </AppCard>
            <AppCard>
              <AppCardContent>
                <div className="flex items-start justify-between gap-3">
                  <div><div className="font-semibold">{accountSummary.name}</div><div className="mt-1 text-sm text-slate-500">{accountSummary.type}</div></div>
                  <div className="flex gap-2">
                    <AppButton size="icon" variant="outline" onClick={() => setAccountDialog({ open: true, item: accounts[0] || null })}><Pencil className="h-4 w-4" /></AppButton>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Account Balance" value={currency(accountSummary.openingBalance)} />
                  <Stat label="Deposits" value={currency(accountSummary.deposits)} />
                  <Stat label="Bills" value={currency(accountSummary.billTotal)} />
                  <Stat label="Debt" value={currency(accountSummary.debtTotal)} />
                  <Stat label="Expenses" value={currency(accountSummary.expenseTotal)} />
                  <Stat label="Extra Debt" value={currency(accountSummary.extraDebtTotal)} />
                  <div className="col-span-2"><Stat label="Projected" value={currency(accountSummary.projectedBalance)} /></div>
                </div>
                <div className="mt-3 rounded-2xl bg-slate-50 p-3"><div className="mb-2 text-sm text-slate-500">Linked Paycheck</div><div className="flex flex-wrap gap-2"><PaycheckPill /></div></div>
                <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm text-slate-600"><Wallet className="h-4 w-4" /> Projected Ledger</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between rounded-xl bg-white p-3"><div><div className="font-medium">Starting Balance</div><div className="text-xs text-slate-500">Day 1</div></div><div className="font-semibold">{currency(accountSummary.openingBalance)}</div></div>
                    {renderedLedgerEntries}
                  </div>
                </div>
              </AppCardContent>
            </AppCard>
          </div>
        ) : null}
      </div>

      <BillDialog state={billDialog} setState={setBillDialog} onSave={(item) => { if (billDialog.item) setBills((prev) => prev.map((bill) => (bill.id === item.id ? item : bill))); else setBills((prev) => [...prev, item]); }} />
      <DebtDialog state={debtDialog} setState={setDebtDialog} onSave={(item) => { if (debtDialog.item) setDebts((prev) => prev.map((debt) => (debt.id === item.id ? item : debt))); else setDebts((prev) => [...prev, item]); }} />
      <ExpenseDialog state={expenseDialog} setState={setExpenseDialog} onSave={(item) => { if (expenseDialog.item) setExpenses((prev) => prev.map((expense) => (expense.id === item.id ? item : expense))); else setExpenses((prev) => [...prev, item]); }} />
      <PaycheckDialog open={paycheckDialog} setOpen={setPaycheckDialog} settings={paycheckSettings[PAYCHECK_ID]} onSave={(values) => setPaycheckSettings((prev) => ({ ...prev, [PAYCHECK_ID]: values }))} />
      <AccountDialog state={accountDialog} setState={setAccountDialog} onSave={(item) => setAccounts([item])} />
    </div>
  );
}

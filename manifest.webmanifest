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
    accounts: [
      { id: ACCOUNT_ID, name: ACCOUNT_NAME, type: 'Checking', openingBalance: 0 },
    ],
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
      ? {
          [PAYCHECK_ID]: { ...fallback.paycheckSettings[PAYCHECK_ID], ...raw.paycheckSettings[PAYCHECK_ID] },
        }
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
  const sizes = {
    icon: 'h-9 w-9',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
  };
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
      <Check className="mr-1 h-3.5 w-3.5" />
      Mark Paid
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
      
      return ledgerEntries.map((entry) => {
                        runningBalance += entry.kind === 'deposit' ? entry.amount : -entry.amount;
                        return <div key={entry.id} className="rounded-xl bg-white p-3"><div className="flex items-start justify-between gap-3"><div><div className="font-medium">{entry.label}</div><div className="text-xs text-slate-500">Day {entry.day} • {entry.subtitle}</div>{entry.status ? <div className="mt-1 text-[11px] text-slate-500">{entry.status}</div> : null}</div><div className="text-right"><div className={`font-semibold ${entry.kind === 'deposit' ? 'text-emerald-700' : 'text-slate-900'}`}>{entry.kind === 'deposit' ? '+' : '-'}{currency(entry.amount)}</div><div className="mt-1 text-xs text-slate-500">Running: {currency(runningBalance)}</div></div></div></div>;
                      });
                    })()}
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

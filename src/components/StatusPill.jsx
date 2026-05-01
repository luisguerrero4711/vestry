export default function StatusPill({ status }) {
  const map = {
    paid:     { label: 'Paid',      cls: 'pill-paid'  },
    due:      { label: 'Due Soon',  cls: 'pill-due'   },
    overdue:  { label: 'Overdue',   cls: 'pill-late'  },
    active:   { label: 'Active',    cls: 'pill-paid'  },
    expired:  { label: 'Expired',   cls: 'pill-due'   },
    terminated:{ label: 'Terminated', cls: 'pill-late'},
    past:     { label: 'Past',      cls: 'pill-due'   },
    partial:  { label: 'Partial',   cls: 'pill-due'   },
  }

  const { label, cls } = map[status?.toLowerCase()] ?? { label: status, cls: 'pill-accent' }

  return <span className={`pill ${cls}`}>{label}</span>
}

const accounts = [
  { name: "Checking account", type: "•• 4820", amount: "$8,420.20", color: "blue" },
  { name: "Savings account", type: "•• 1904", amount: "$24,850.00", color: "purple" },
  { name: "Investment portfolio", type: "•• 7712", amount: "$18,210.45", color: "orange" },
];

const transactions = [
  { merchant: "Whole Foods Market", category: "Groceries", date: "Today, 10:42 AM", amount: "-$86.40", icon: "W", color: "green" },
  { merchant: "Spotify", category: "Entertainment", date: "Yesterday", amount: "-$10.99", icon: "S", color: "black" },
  { merchant: "Acme Inc.", category: "Income", date: "Oct 04, 2026", amount: "+$4,250.00", icon: "A", color: "blue" },
  { merchant: "Uber", category: "Transport", date: "Oct 03, 2026", amount: "-$24.80", icon: "U", color: "gray" },
];

function ArrowUp() {
  return <span aria-hidden="true">↗</span>;
}

export default function Home() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">W</span><span>wealth</span></div>
        <nav className="nav-list" aria-label="Main navigation">
          <a className="nav-item active" href="#"><span className="nav-icon">⌂</span>Overview</a>
          <a className="nav-item" href="#"><span className="nav-icon">◒</span>Accounts</a>
          <a className="nav-item" href="#"><span className="nav-icon">↗</span>Transactions</a>
          <a className="nav-item" href="#"><span className="nav-icon">▥</span>Budgets</a>
          <a className="nav-item" href="#"><span className="nav-icon">◎</span>Goals</a>
        </nav>
        <div className="sidebar-bottom">
          <a className="nav-item" href="#"><span className="nav-icon">⚙</span>Settings</a>
          <div className="profile">
            <div className="avatar">JD</div>
            <div><strong>Jordan Davis</strong><span>Personal account</span></div>
            <span className="profile-more">•••</span>
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">W</span> wealth</div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notifications">♧<i /></button>
            <button className="help-button">?</button>
            <button className="date-button">October 2026 <span>⌄</span></button>
          </div>
        </header>

        <div className="page-content">
          <div className="welcome-row">
            <div><p className="eyebrow">Wednesday, October 8, 2026</p><h1>Good morning, Jordan <span>✦</span></h1><p className="muted">Here&apos;s your financial snapshot.</p></div>
            <button className="primary-button">+ Add transaction</button>
          </div>

          <section className="stats-grid" aria-label="Financial summary">
            <article className="stat-card featured">
              <div className="stat-heading"><span>Total balance</span><button aria-label="More options">•••</button></div>
              <strong>$51,480.65</strong>
              <div className="stat-footer"><span className="positive"><ArrowUp /> 8.4%</span><span>vs. last month</span></div>
            </article>
            <article className="stat-card">
              <div className="stat-heading"><span>Income</span><span className="stat-icon income">↙</span></div>
              <strong>$7,820.00</strong>
              <div className="stat-footer"><span className="positive"><ArrowUp /> 12.6%</span><span>vs. last month</span></div>
            </article>
            <article className="stat-card">
              <div className="stat-heading"><span>Expenses</span><span className="stat-icon expense">↗</span></div>
              <strong>$3,245.70</strong>
              <div className="stat-footer"><span className="negative">↓ 3.2%</span><span>vs. last month</span></div>
            </article>
          </section>

          <div className="dashboard-grid">
            <section className="panel accounts-panel">
              <div className="panel-header"><div><h2>Your accounts</h2><p>All balances in one place</p></div><button className="text-button">View all <ArrowUp /></button></div>
              <div className="account-list">{accounts.map((account) => <div className="account-row" key={account.name}><span className={`account-icon ${account.color}`}>$</span><div className="account-info"><strong>{account.name}</strong><span>{account.type}</span></div><strong className="account-amount">{account.amount}</strong><span className="row-arrow">›</span></div>)}</div>
              <button className="add-account">+ Connect an account</button>
            </section>

            <section className="panel spending-panel">
              <div className="panel-header"><div><h2>Spending overview</h2><p>How your money is moving</p></div><button className="select-button">This month ⌄</button></div>
              <div className="chart-wrap"><div className="donut"><div><strong>$3,245</strong><span>total spent</span></div></div><div className="legend"><div><i className="dot housing" /><span>Housing</span><strong>$1,240</strong></div><div><i className="dot food" /><span>Food & dining</span><strong>$842</strong></div><div><i className="dot lifestyle" /><span>Lifestyle</span><strong>$664</strong></div><div><i className="dot other" /><span>Other</span><strong>$499</strong></div></div></div>
            </section>
          </div>

          <section className="panel transactions-panel">
            <div className="panel-header"><div><h2>Recent transactions</h2><p>Your latest financial activity</p></div><button className="text-button">View all <ArrowUp /></button></div>
            <div className="transactions-table"><div className="table-head"><span>DESCRIPTION</span><span>CATEGORY</span><span>DATE</span><span>AMOUNT</span></div>{transactions.map((transaction) => <div className="transaction-row" key={`${transaction.merchant}-${transaction.date}`}><div className="merchant"><span className={`merchant-icon ${transaction.color}`}>{transaction.icon}</span><strong>{transaction.merchant}</strong></div><span className="category">{transaction.category}</span><span className="transaction-date">{transaction.date}</span><strong className={transaction.amount.startsWith("+") ? "positive" : ""}>{transaction.amount}</strong></div>)}</div>
          </section>
        </div>
      </section>
    </main>
  );
}

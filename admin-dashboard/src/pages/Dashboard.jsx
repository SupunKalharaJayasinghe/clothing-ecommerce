import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../utils/http'
import Time from '../ui/Time'
import { DollarSign, Package, AlertTriangle, TrendingUp, ShoppingCart, Bell } from 'lucide-react'

function currency(n) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(n || 0) } catch { return `Rs. ${Number(n||0).toLocaleString()}` }
}

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className="kpi">
      <div className="kpi-icon"><Icon size={18} /></div>
      <div className="kpi-body">
        <div className="kpi-value">{value}</div>
        <div className="kpi-label">{label}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [period, setPeriod] = useState('7d') // '24h' | '7d' | '30d'
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function msFor(p) {
    if (p === '24h') return 24*3600*1000
    if (p === '7d') return 7*24*3600*1000
    return 30*24*3600*1000
  }

  useEffect(() => {
    let alive = true
    async function fetchAll(endpoint) {
      const perPage = 100
      let page = 1
      let out = []
      // cap total pages to avoid excessive load
      for (;;) {
        const { data } = await api.get(endpoint, { params: { page, limit: perPage } })
        out = out.concat(data.items || [])
        if (!data.hasMore || page >= 5) break
        page += 1
      }
      return out
    }
    ;(async () => {
      setLoading(true); setError('')
      try {
        const [o, p] = await Promise.all([
          fetchAll('/admin/orders'),
          fetchAll('/admin/products'),
        ])
        if (!alive) return
        setOrders(o)
        setProducts(p)
      } catch (e) {
        if (!alive) return
        setError(e.response?.data?.message || e.message)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const now = Date.now()
  const periodMs = msFor(period)
  const since = now - periodMs

  const ordersInPeriod = useMemo(() => orders.filter(o => new Date(o.createdAt).getTime() >= since), [orders, since])

  const sales = useMemo(() => {
    const paid = ordersInPeriod.filter(o => (o.payment?.status === 'paid') || o.status === 'completed')
    return paid.reduce((s, o) => s + (o.totals?.grandTotal || 0), 0)
  }, [ordersInPeriod])

  const orderCount = ordersInPeriod.length

  const pending = useMemo(() => {
    const awaitingPayment = orders.filter(o => (o.payment?.status === 'pending') || o.status === 'pending_payment').length
    const awaitingFulfillment = orders.filter(o => ['placed','packing'].includes(o.status)).length
    const awaitingDelivery = orders.filter(o => ['handed_over','out_for_delivery'].includes(o.status)).length
    return { awaitingPayment, awaitingFulfillment, awaitingDelivery, total: awaitingPayment + awaitingFulfillment + awaitingDelivery }
  }, [orders])

  const inv = useMemo(() => {
    const inStock = products.filter(p => (p.stock || 0) > 0)
    const low = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= (p.lowStockThreshold ?? 5))
    const out = products.filter(p => (p.stock || 0) <= 0)
    const topIssues = products
      .filter(p => (p.stock || 0) <= (p.lowStockThreshold ?? 5))
      .sort((a, b) => (a.stock || 0) - (b.stock || 0))
      .slice(0, 6)
    return { inStock: inStock.length, low: low.length, out: out.length, lowList: low.slice(0, 6), outList: out.slice(0, 6), topIssues }
  }, [products])

  const alerts = useMemo(() => {
    const last24h = now - 24*3600*1000
    const failedPayments = orders.filter(o => o.payment?.status === 'failed' && new Date(o.createdAt).getTime() >= last24h)
    const bankPending = orders.filter(o => o.payment?.method === 'BANK' && o.payment?.status !== 'paid')
    const messages = []
    if (failedPayments.length) messages.push({ type: 'critical', text: `${failedPayments.length} payment failures in last 24h` })
    if (inv.out > 0) messages.push({ type: 'critical', text: `${inv.out} products out of stock` })
    const tasks = []
    if (bankPending.length) tasks.push({ text: `${bankPending.length} bank transfers awaiting verification` })
    if (pending.total) tasks.push({ text: `${pending.total} orders need attention` })
    if (inv.low > 0) tasks.push({ text: `${inv.low} low stock products` })
    return { messages, tasks }
  }, [orders, inv, pending, now])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <div className="segmented">
          {['24h','7d','30d'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`segmented-item ${period===p ? 'is-active' : ''}`}>{p}</button>
          ))}
        </div>
      </div>

      {error && <div className="card card-body text-red-600 text-sm mb-3">{error}</div>}

      <div className="dashboard-grid">
        <Stat icon={DollarSign} label={`Total Sales (${period})`} value={currency(sales)} sub={`${orderCount} orders`} />
        <Stat icon={TrendingUp} label="Orders in period" value={orderCount} sub={`Since ${new Date(since).toLocaleDateString()}`} />
        <Stat icon={Package} label="Inventory in stock" value={inv.inStock} sub={`${inv.low} low, ${inv.out} out`} />
        <Stat icon={ShoppingCart} label="Pending orders" value={pending.total} sub={`${pending.awaitingPayment} pay, ${pending.awaitingFulfillment} pack, ${pending.awaitingDelivery} deliver`} />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
        <div className="card">
          <div className="card-header">Pending Orders</div>
          <div className="card-body">
            {orders.filter(o => ['pending_payment','placed','packing','handed_over','out_for_delivery'].includes(o.status)).slice(0,8).map(o => (
              <div key={o._id} className="list-row">
                <div>
                  <div className="font-medium">{o.items?.[0]?.name || o._id}</div>
                  <div className="text-xs text-[color:var(--ink-muted)]">#{o._id} • <Time value={o.createdAt} /></div>
                </div>
                <div className="text-right font-semibold">{currency(o.totals?.grandTotal)}</div>
              </div>
            ))}
            {!orders.length && <div className="text-sm text-[color:var(--ink-muted)]">No data</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">Low Stock Alerts</div>
          <div className="card-body">
            {inv.lowList.length ? inv.lowList.map(p => (
              <div key={p.id} className="list-row">
                <div className="font-medium line-clamp-1">{p.name}</div>
                <div className="badge badge-warn">{p.stock} left</div>
              </div>
            )) : <div className="text-sm text-[color:var(--ink-muted)]">No low stock items</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">Out-of-Stock Products</div>
          <div className="card-body">
            {inv.outList.length ? inv.outList.map(p => (
              <div key={p.id} className="list-row">
                <div className="font-medium line-clamp-1">{p.name}</div>
                <div className="badge badge-danger">Out</div>
              </div>
            )) : <div className="text-sm text-[color:var(--ink-muted)]">All good</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">Top Inventory Issues</div>
          <div className="card-body">
            {inv.topIssues.length ? inv.topIssues.map(p => (
              <div key={p.id} className="list-row">
                <div className="font-medium line-clamp-1">{p.name}</div>
                <div className="text-sm text-[color:var(--ink-muted)]">Stock: {p.stock} • Threshold: {p.lowStockThreshold ?? 5}</div>
              </div>
            )) : <div className="text-sm text-[color:var(--ink-muted)]">No critical inventory issues</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">System Alerts</div>
          <div className="card-body">
            {alerts.messages.length ? alerts.messages.map((a, i) => (
              <div key={i} className="list-row"><div className="text-red-600 font-medium flex items-center gap-2"><AlertTriangle size={16}/> {a.text}</div></div>
            )) : <div className="text-sm text-[color:var(--ink-muted)]">No critical alerts</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">Pending System Tasks</div>
          <div className="card-body">
            {alerts.tasks.length ? alerts.tasks.map((a, i) => (
              <div key={i} className="list-row"><div className="flex items-center gap-2"><Bell size={16}/> <span>{a.text}</span></div></div>
            )) : <div className="text-sm text-[color:var(--ink-muted)]">You're all caught up</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

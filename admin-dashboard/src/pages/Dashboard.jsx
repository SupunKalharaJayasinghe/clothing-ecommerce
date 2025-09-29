import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../utils/http'
import Time from '../ui/Time'
import { DollarSign, Package, AlertTriangle, TrendingUp, ShoppingCart, Bell } from 'lucide-react'

function currency(n) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(n || 0) } catch { return `Rs. ${Number(n||0).toLocaleString()}` }
}

function Stat({ icon: Icon, label, value, sub, trend = "+12%" }) {
  return (
    <div className="kpi">
      <div className="kpi-header">
        <div className="kpi-icon"><Icon size={24} /></div>
        <div className="kpi-trend">{trend}</div>
      </div>
      <div className="kpi-body">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [period, setPeriod] = useState('7d') // '24h' | '7d' | '30d'
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // State for "See More" functionality
  const [showAllPendingOrders, setShowAllPendingOrders] = useState(false)
  const [showAllLowStock, setShowAllLowStock] = useState(false)
  const [showAllTopIssues, setShowAllTopIssues] = useState(false)

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
        const [o, p, s] = await Promise.all([
          fetchAll('/admin/orders'),
          fetchAll('/admin/products'),
          api.get('/admin/stats').then(r => r.data)
        ])
        if (!alive) return
        setOrders(o)
        setProducts(p)
        setStats(s)
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
    return { 
      inStock: inStock.length, 
      low: low.length, 
      out: out.length, 
      lowList: low, 
      outList: out, 
      topIssues 
    }
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

      <div className="dashboard-grid animate-slide-up">
        <Stat 
          icon={DollarSign} 
          label="Total Sales" 
          value={currency(sales)} 
          sub={`${orderCount} orders this ${period}`}
          trend="+24.5%"
        />
        <Stat 
          icon={TrendingUp} 
          label="Orders" 
          value={orderCount} 
          sub={`Since ${new Date(since).toLocaleDateString()}`}
          trend="+18.2%"
        />
        <Stat 
          icon={Package} 
          label="Inventory" 
          value={inv.inStock} 
          sub={`${inv.low} low stock, ${inv.out} out of stock`}
          trend="-2.1%"
        />
        <Stat 
          icon={ShoppingCart} 
          label="Pending" 
          value={pending.total} 
          sub={`${pending.awaitingPayment} payment, ${pending.awaitingFulfillment} fulfillment`}
          trend="+8.7%"
        />
      </div>

      <div className="responsive-grid animate-fade-in">
        <div className="card">
          <div className="card-header">Pending Orders</div>
          <div className="card-body">
            {(() => {
              const pendingOrders = orders.filter(o => ['pending_payment','placed','packing','handed_over','out_for_delivery'].includes(o.status))
              const displayOrders = showAllPendingOrders ? pendingOrders : pendingOrders.slice(0, 4)
              
              return (
                <>
                  {displayOrders.map(o => (
                    <div key={o._id} className="list-row">
                      <div>
                        <div className="font-medium">{o.items?.[0]?.name || o._id}</div>
                        <div className="text-xs text-[color:var(--text-muted)]">#{o._id} • <Time value={o.createdAt} /></div>
                      </div>
                      <div className="text-right font-semibold">{currency(o.totals?.grandTotal)}</div>
                    </div>
                  ))}
                  {pendingOrders.length === 0 && <div className="text-sm text-[color:var(--text-muted)]">No pending orders</div>}
                  {pendingOrders.length > 4 && (
                    <div className="mt-3 pt-3 border-t border-[color:var(--surface-border)]">
                      <button 
                        onClick={() => setShowAllPendingOrders(!showAllPendingOrders)}
                        className="btn btn-ghost btn-sm w-full"
                      >
                        {showAllPendingOrders ? 'Show Less' : `See More (${pendingOrders.length - 4} more)`}
                      </button>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>

        <div className="card">
          <div className="card-header">Low Stock Alerts</div>
          <div className="card-body">
            {(() => {
              const displayLowStock = showAllLowStock ? inv.lowList : inv.lowList.slice(0, 4)
              
              return (
                <>
                  {displayLowStock.map(p => (
                    <div key={p.id} className="list-row">
                      <div className="font-medium line-clamp-1">{p.name}</div>
                      <div className="badge badge-warn">{p.stock} left</div>
                    </div>
                  ))}
                  {inv.lowList.length === 0 && <div className="text-sm text-[color:var(--text-muted)]">No low stock items</div>}
                  {inv.lowList.length > 4 && (
                    <div className="mt-3 pt-3 border-t border-[color:var(--surface-border)]">
                      <button 
                        onClick={() => setShowAllLowStock(!showAllLowStock)}
                        className="btn btn-ghost btn-sm w-full"
                      >
                        {showAllLowStock ? 'Show Less' : `See More (${inv.lowList.length - 4} more)`}
                      </button>
                    </div>
                  )}
                </>
              )
            })()}
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
            )) : <div className="text-sm text-[color:var(--text-muted)]">All good</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">Top Inventory Issues</div>
          <div className="card-body">
            {(() => {
              const displayTopIssues = showAllTopIssues ? inv.topIssues : inv.topIssues.slice(0, 4)
              
              return (
                <>
                  {displayTopIssues.map(p => (
                    <div key={p.id} className="list-row">
                      <div className="font-medium line-clamp-1">{p.name}</div>
                      <div className="text-sm text-[color:var(--text-muted)]">Stock: {p.stock} • Threshold: {p.lowStockThreshold ?? 5}</div>
                    </div>
                  ))}
                  {inv.topIssues.length === 0 && <div className="text-sm text-[color:var(--text-muted)]">No critical inventory issues</div>}
                  {inv.topIssues.length > 4 && (
                    <div className="mt-3 pt-3 border-t border-[color:var(--surface-border)]">
                      <button 
                        onClick={() => setShowAllTopIssues(!showAllTopIssues)}
                        className="btn btn-ghost btn-sm w-full"
                      >
                        {showAllTopIssues ? 'Show Less' : `See More (${inv.topIssues.length - 4} more)`}
                      </button>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>


        <div className="card">
          <div className="card-header">Pending System Tasks</div>
          <div className="card-body">
            {alerts.tasks.length ? alerts.tasks.map((a, i) => (
              <div key={i} className="list-row"><div className="flex items-center gap-2"><Bell size={16}/> <span>{a.text}</span></div></div>
            )) : <div className="text-sm text-[color:var(--text-muted)]">You're all caught up</div>}
          </div>
        </div>

        {stats && (
          <div className="card">
            <div className="card-header">System Statistics</div>
            <div className="card-body">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Orders Created</span>
                  <span className="font-medium">{stats.ordersByOrderState?.CREATED || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Orders Delivered</span>
                  <span className="font-medium">{stats.ordersByOrderState?.DELIVERED || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Payments Paid</span>
                  <span className="font-medium">{stats.paymentsByStatus?.PAID || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Payments Refunded</span>
                  <span className="font-medium">{stats.paymentsByStatus?.REFUNDED || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Returns Requested</span>
                  <span className="font-medium">{stats.returnsByStatus?.requested || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Refunds Processed</span>
                  <span className="font-medium">{stats.refundsByStatus?.PROCESSED || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

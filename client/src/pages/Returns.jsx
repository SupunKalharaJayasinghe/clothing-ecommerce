import { useEffect, useState } from 'react'
import { useAppSelector } from '../app/hooks'
import api from '../lib/axios'
import Price from '../components/ui/Price'
import Badge from '../components/ui/Badge'
import Loader from '../components/ui/Loader'
import { ArrowLeft, Package, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle } from '../lib/icons'
import { Link } from 'react-router-dom'

export default function Returns() {
  const { user } = useAppSelector(s => s.auth)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState([])
  const [refunds, setRefunds] = useState([])
  const [activeTab, setActiveTab] = useState('returns')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      // Load orders with return requests
      const ordersRes = await api.get('/orders/me')
      const ordersWithReturns = ordersRes.data.items.filter(order => order.returnRequest?.status)
      setOrders(ordersWithReturns)
      
      // Load refund information (if available)
      try {
        const refundsRes = await api.get('/refunds/me')
        setRefunds(refundsRes.data.items || [])
      } catch (e) {
        // Refunds endpoint might not exist for customers
        console.log('Refunds endpoint not available for customers')
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (iso) => {
    try { 
      return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch { 
      return '—' 
    }
  }

  const getReturnStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'requested': return 'blue'
      case 'approved': return 'green'
      case 'received': return 'blue'
      case 'rejected': return 'red'
      case 'closed': return 'green'
      default: return 'gray'
    }
  }

  const getReturnStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'requested': return <Clock size={16} />
      case 'approved': return <CheckCircle size={16} />
      case 'received': return <Package size={16} />
      case 'rejected': return <XCircle size={16} />
      case 'closed': return <CheckCircle size={16} />
      default: return <AlertTriangle size={16} />
    }
  }

  const getRefundStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'processed': return 'green'
      case 'approved': return 'blue'
      case 'requested': return 'yellow'
      case 'failed': return 'red'
      case 'cancelled': return 'red'
      default: return 'gray'
    }
  }

  if (loading) return <Loader />
  if (error) return <div className="container-app section text-red-600">{error}</div>

  return (
    <div className="container-app section">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/orders" className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} />
          Back to Orders
        </Link>
        <div>
          <h1 className="section-title">Returns & Refunds</h1>
          <p className="text-sm text-[--color-muted] mt-1">Track your return requests and refund status</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-[--color-border] mb-6">
        <button
          onClick={() => setActiveTab('returns')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'returns'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-[--color-muted] hover:text-[--color-primary]'
          }`}
        >
          <div className="flex items-center gap-2">
            <RefreshCw size={16} />
            Returns ({orders.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('refunds')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'refunds'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-[--color-muted] hover:text-[--color-primary]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Package size={16} />
            Refunds ({refunds.length})
          </div>
        </button>
      </div>

      {/* Returns Tab */}
      {activeTab === 'returns' && (
        <div className="space-y-6">
          {orders.length === 0 ? (
            <div className="card card-body text-center py-12">
              <RefreshCw size={48} className="mx-auto text-[--color-muted] mb-4" />
              <h3 className="text-lg font-medium text-[--color-primary] mb-2">No Return Requests</h3>
              <p className="text-[--color-muted] mb-4">You haven't requested any returns yet.</p>
              <Link to="/orders" className="btn btn-primary">
                View Orders
              </Link>
            </div>
          ) : (
            orders.map(order => (
              <div key={order._id} className="card">
                <div className="card-header">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Order #{order._id.slice(-8)}</h3>
                      <p className="text-sm text-[--color-muted]">
                        Placed on {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={getReturnStatusColor(order.returnRequest?.status)}>
                        <div className="flex items-center gap-1">
                          {getReturnStatusIcon(order.returnRequest?.status)}
                          {order.returnRequest?.status?.toUpperCase() || 'UNKNOWN'}
                        </div>
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Order Items</h4>
                      <div className="space-y-3">
                        {order.items.map(item => (
                          <div key={item.slug} className="flex items-center gap-3">
                            {item.image && (
                              <img 
                                src={item.image} 
                                alt={item.name}
                                className="w-12 h-12 object-cover rounded border"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.name}</p>
                              <p className="text-xs text-[--color-muted]">
                                {item.color} × {item.quantity}
                              </p>
                            </div>
                            <div className="text-sm font-medium">
                              <Price price={item.price * item.quantity} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Return Details</h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm text-[--color-muted]">Status:</span>
                          <div className="mt-1">
                            <Badge tone={getReturnStatusColor(order.returnRequest?.status)}>
                              <div className="flex items-center gap-1">
                                {getReturnStatusIcon(order.returnRequest?.status)}
                                {order.returnRequest?.status?.toUpperCase() || 'UNKNOWN'}
                              </div>
                            </Badge>
                          </div>
                        </div>
                        {order.returnRequest?.reason && (
                          <div>
                            <span className="text-sm text-[--color-muted]">Reason:</span>
                            <p className="text-sm mt-1">{order.returnRequest.reason}</p>
                          </div>
                        )}
                        {order.returnRequest?.requestedAt && (
                          <div>
                            <span className="text-sm text-[--color-muted]">Requested:</span>
                            <p className="text-sm mt-1">{formatDate(order.returnRequest.requestedAt)}</p>
                          </div>
                        )}
                        {order.returnRequest?.updatedAt && (
                          <div>
                            <span className="text-sm text-[--color-muted]">Last Updated:</span>
                            <p className="text-sm mt-1">{formatDate(order.returnRequest.updatedAt)}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-sm text-[--color-muted]">Order Total:</span>
                          <p className="text-lg font-semibold mt-1">
                            <Price price={order.totals?.grandTotal} />
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Refunds Tab */}
      {activeTab === 'refunds' && (
        <div className="space-y-6">
          {refunds.length === 0 ? (
            <div className="card card-body text-center py-12">
              <Package size={48} className="mx-auto text-[--color-muted] mb-4" />
              <h3 className="text-lg font-medium text-[--color-primary] mb-2">No Refunds</h3>
              <p className="text-[--color-muted] mb-4">You don't have any refund transactions yet.</p>
              <Link to="/orders" className="btn btn-primary">
                View Orders
              </Link>
            </div>
          ) : (
            refunds.map(refund => (
              <div key={refund._id} className="card">
                <div className="card-header">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Refund #{refund._id.slice(-8)}</h3>
                      <p className="text-sm text-[--color-muted]">
                        Order #{refund.order?.slice(-8)} • {formatDate(refund.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={getRefundStatusColor(refund.status)}>
                        {refund.status?.toUpperCase() || 'UNKNOWN'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Refund Information</h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm text-[--color-muted]">Amount:</span>
                          <p className="text-xl font-bold text-green-600 mt-1">
                            <Price price={refund.amount} />
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-[--color-muted]">Method:</span>
                          <p className="text-sm mt-1">{refund.method}</p>
                        </div>
                        <div>
                          <span className="text-sm text-[--color-muted]">Refund Method:</span>
                          <p className="text-sm mt-1">
                            {refund.refundMethod === 'ORIGINAL_PAYMENT' ? 'Original Payment Method' :
                             refund.refundMethod === 'BANK_TRANSFER' ? 'Bank Transfer' :
                             refund.refundMethod === 'STORE_CREDIT' ? 'Store Credit' :
                             refund.refundMethod || 'Original Payment Method'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Status Timeline</h4>
                      <div className="space-y-3">
                        {refund.requestedAt && (
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div>
                              <p className="text-sm font-medium">Requested</p>
                              <p className="text-xs text-[--color-muted]">{formatDate(refund.requestedAt)}</p>
                            </div>
                          </div>
                        )}
                        {refund.approvedAt && (
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div>
                              <p className="text-sm font-medium">Approved</p>
                              <p className="text-xs text-[--color-muted]">{formatDate(refund.approvedAt)}</p>
                            </div>
                          </div>
                        )}
                        {refund.processedAt && (
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                            <div>
                              <p className="text-sm font-medium">Processed</p>
                              <p className="text-xs text-[--color-muted]">{formatDate(refund.processedAt)}</p>
                            </div>
                          </div>
                        )}
                        {refund.reason && (
                          <div className="mt-4">
                            <span className="text-sm text-[--color-muted]">Reason:</span>
                            <p className="text-sm mt-1">{refund.reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

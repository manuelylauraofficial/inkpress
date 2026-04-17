import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import '../styles/Dashboard.css'

function formatCurrency(value) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    activeOrders: 0,
    customers: 0,
    products: 0,
    lowStock: 0,
    deliveredRevenue: 0,
    totalSalesValue: 0,
    manuelShare: 0,
    lauraShare: 0,
    recentOrders: [],
    lowStockProducts: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    setError('')

    const [ordersRes, customersRes, productsRes] = await Promise.all([
      supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total,
          order_date,
          customers (
            company_name,
            first_name,
            last_name
          )
        `)
        .neq('status', 'annullato')
        .order('created_at', { ascending: false }),

      supabase.from('customers').select('id', { count: 'exact', head: true }),

      supabase
        .from('products')
        .select('id, name, sku, stock_qty, min_stock', { count: 'exact' })
        .order('created_at', { ascending: false }),
    ])

    if (ordersRes.error || customersRes.error || productsRes.error) {
      setError(
        ordersRes.error?.message ||
          customersRes.error?.message ||
          productsRes.error?.message ||
          'Errore nel caricamento dashboard'
      )
      setLoading(false)
      return
    }

    const allOrders = ordersRes.data || []
    const allProducts = productsRes.data || []

    const deliveredOrders = allOrders.filter((order) => order.status === 'consegnato')
    const deliveredRevenue = deliveredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
    const totalSalesValue = allOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)

    const lowStockProducts = allProducts.filter(
      (product) => Number(product.stock_qty || 0) <= Number(product.min_stock || 0)
    )

    setStats({
      activeOrders: allOrders.length,
      customers: customersRes.count || 0,
      products: productsRes.count || 0,
      lowStock: lowStockProducts.length,
      deliveredRevenue,
      totalSalesValue,
      manuelShare: deliveredRevenue * 0.45,
      lauraShare: deliveredRevenue * 0.55,
      recentOrders: allOrders.slice(0, 6),
      lowStockProducts: lowStockProducts.slice(0, 6),
    })

    setLoading(false)
  }

  const topCards = useMemo(
    () => [
      {
        label: 'Vendite consegnate',
        value: loading ? '...' : formatCurrency(stats.deliveredRevenue),
        info: 'Ricavo calcolato sugli ordini consegnati',
        tone: 'primary',
      },
      {
        label: 'Quota Manuel 45%',
        value: loading ? '...' : formatCurrency(stats.manuelShare),
        info: 'Ripartizione automatica ricavi',
        tone: 'manuel',
      },
      {
        label: 'Quota Laura 55%',
        value: loading ? '...' : formatCurrency(stats.lauraShare),
        info: 'Ripartizione automatica ricavi',
        tone: 'laura',
      },
      {
        label: 'Valore ordini attivi',
        value: loading ? '...' : formatCurrency(stats.totalSalesValue),
        info: 'Totale ordini non annullati',
        tone: 'neutral',
      },
      {
        label: 'Clienti',
        value: loading ? '...' : stats.customers,
        info: 'Anagrafiche registrate',
        tone: 'neutral',
      },
      {
        label: 'Prodotti',
        value: loading ? '...' : stats.products,
        info: 'Articoli a magazzino',
        tone: 'neutral',
      },
      {
        label: 'Ordini aperti',
        value: loading ? '...' : stats.activeOrders,
        info: 'Ordini non annullati',
        tone: 'neutral',
      },
      {
        label: 'Scorte basse',
        value: loading ? '...' : stats.lowStock,
        info: 'Prodotti sotto soglia minima',
        tone: 'warning',
      },
    ],
    [loading, stats]
  )

  function getCustomerLabel(customer) {
    if (!customer) return '—'
    if (customer.company_name) return customer.company_name
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || '—'
  }

  return (
    <div className="pageWrap">
      {error ? <div className="errorBox">{error}</div> : null}

      <section className="dashboardHero card">
        <div>
          <p className="dashboardEyebrow">Panoramica vendite</p>
          <h2>Dashboard Inkpress</h2>
          <p className="dashboardHeroText">
            Controllo immediato di vendite, ricavi ripartiti e prodotti da riordinare.
          </p>
        </div>

        <div className="dashboardHeroTotals">
          <div className="heroTotalCard">
            <span>Totale consegnato</span>
            <strong>{loading ? '...' : formatCurrency(stats.deliveredRevenue)}</strong>
          </div>
          <div className="heroTotalCard light">
            <span>Ordini gestiti</span>
            <strong>{loading ? '...' : stats.activeOrders}</strong>
          </div>
        </div>
      </section>

      <div className="statsGrid enhancedStatsGrid">
        {topCards.map((card) => (
          <div key={card.label} className={`statCard tone-${card.tone}`}>
            <p className="statLabel">{card.label}</p>
            <h3 className="statValue">{card.value}</h3>
            <span className="statInfo">{card.info}</span>
          </div>
        ))}
      </div>

      <div className="dashboardContentGrid">
        <section className="card">
          <div className="cardHeader customerFormModal__header">
            <h3>Ordini recenti</h3>
          </div>

          {loading ? (
            <div className="emptyState">Caricamento ordini...</div>
          ) : stats.recentOrders.length === 0 ? (
            <div className="emptyState">Nessun ordine recente.</div>
          ) : (
            <div className="dashboardList">
              {stats.recentOrders.map((order) => (
                <div className="dashboardListItem" key={order.id}>
                  <div>
                    <div className="dashboardListTitle">{order.order_number}</div>
                    <div className="dashboardListSub">
                      {getCustomerLabel(order.customers)} • {order.order_date || '—'}
                    </div>
                  </div>

                  <div className="dashboardListRight">
                    <div className="dashboardListPrice">{formatCurrency(order.total)}</div>
                    <div className={`miniStatus ${order.status || 'neutral'}`}>{order.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="cardHeader customerFormModal__header">
            <h3>Prodotti con scorte basse</h3>
          </div>

          {loading ? (
            <div className="emptyState">Caricamento prodotti...</div>
          ) : stats.lowStockProducts.length === 0 ? (
            <div className="emptyState">Nessun prodotto sotto soglia.</div>
          ) : (
            <div className="dashboardList">
              {stats.lowStockProducts.map((product) => (
                <div className="dashboardListItem" key={product.id}>
                  <div>
                    <div className="dashboardListTitle">{product.name}</div>
                    <div className="dashboardListSub">{product.sku || 'SKU non impostato'}</div>
                  </div>

                  <div className="dashboardListRight">
                    <div className="dashboardListPrice">{product.stock_qty}</div>
                    <div className="dashboardListSub">Min: {product.min_stock}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

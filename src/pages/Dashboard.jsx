import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import '../styles/Dashboard.css'

export default function Dashboard() {
  const [stats, setStats] = useState({
    activeOrders: 0,
    customers: 0,
    products: 0,
    lowStock: 0,
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

      supabase
        .from('customers')
        .select('id', { count: 'exact', head: true }),

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

    const lowStockProducts = allProducts.filter(
      (product) => Number(product.stock_qty || 0) <= Number(product.min_stock || 0)
    )

    setStats({
      activeOrders: allOrders.length,
      customers: customersRes.count || 0,
      products: productsRes.count || 0,
      lowStock: lowStockProducts.length,
      recentOrders: allOrders.slice(0, 5),
      lowStockProducts: lowStockProducts.slice(0, 5),
    })

    setLoading(false)
  }

  function getCustomerLabel(customer) {
    if (!customer) return '—'
    if (customer.company_name) return customer.company_name
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || '—'
  }

  return (
    <div className="pageWrap">
      {error ? <div className="errorBox">{error}</div> : null}

      <div className="statsGrid">
        <div className="statCard">
          <p className="statLabel">Ordini attivi</p>
          <h3 className="statValue">{loading ? '...' : stats.activeOrders}</h3>
          <span className="statInfo">Ordini non annullati</span>
        </div>

        <div className="statCard">
          <p className="statLabel">Clienti</p>
          <h3 className="statValue">{loading ? '...' : stats.customers}</h3>
          <span className="statInfo">Anagrafiche registrate</span>
        </div>

        <div className="statCard">
          <p className="statLabel">Prodotti</p>
          <h3 className="statValue">{loading ? '...' : stats.products}</h3>
          <span className="statInfo">Articoli a magazzino</span>
        </div>

        <div className="statCard">
          <p className="statLabel">Scorte basse</p>
          <h3 className="statValue">{loading ? '...' : stats.lowStock}</h3>
          <span className="statInfo">Prodotti sotto soglia</span>
        </div>
      </div>

      <div className="dashboardContentGrid">
        <section className="card">
          <div className="cardHeader">
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
                    <div className="dashboardListPrice">
                      € {Number(order.total || 0).toFixed(2)}
                    </div>
                    <div className="dashboardListSub">{order.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="cardHeader">
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
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import '../styles/StockMovements.css'

export default function StockMovements() {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadMovements()
  }, [])

  async function loadMovements() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('stock_movements')
      .select(`
        *,
        products (
          name,
          sku,
          color,
          size
        ),
        orders (
          order_number
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setMovements(data || [])
    }

    setLoading(false)
  }

  const filteredMovements = useMemo(() => {
    const q = search.trim().toLowerCase()

    return movements.filter((movement) => {
      const productName = movement.products?.name?.toLowerCase() || ''
      const sku = movement.products?.sku?.toLowerCase() || ''
      const orderNumber = movement.orders?.order_number?.toLowerCase() || ''
      const reason = (movement.reason || '').toLowerCase()
      const notes = (movement.notes || '').toLowerCase()
      const typeMatch = !typeFilter || movement.movement_type === typeFilter
      const textMatch =
        !q ||
        productName.includes(q) ||
        sku.includes(q) ||
        orderNumber.includes(q) ||
        reason.includes(q) ||
        notes.includes(q)

      return typeMatch && textMatch
    })
  }, [movements, search, typeFilter])

  function getTypeClass(type) {
    switch (type) {
      case 'load':
        return 'movementBadge load'
      case 'unload':
        return 'movementBadge unload'
      default:
        return 'movementBadge adjustment'
    }
  }

  function getTypeLabel(type) {
    switch (type) {
      case 'load':
        return 'Carico'
      case 'unload':
        return 'Scarico'
      default:
        return 'Rettifica'
    }
  }

  return (
    <div className="pageWrap">
      <div className="sectionTop">
        <div>
          <h2 className="sectionTitle">Movimenti magazzino</h2>
          <p className="sectionText">
            Storico completo di carichi, scarichi e rettifiche.
          </p>
        </div>
      </div>

      <section className="card">
        <div className="movementsToolbar">
          <input
            className="searchInput"
            type="text"
            placeholder="Cerca per prodotto, SKU, ordine, causale o note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="movementFilter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Tutti i tipi</option>
            <option value="load">Carico</option>
            <option value="unload">Scarico</option>
            <option value="adjustment">Rettifica</option>
          </select>
        </div>

        {error ? <div className="errorBox movementMessage">{error}</div> : null}

        {loading ? (
          <div className="emptyState">Caricamento movimenti...</div>
        ) : filteredMovements.length === 0 ? (
          <div className="emptyState">Nessun movimento trovato.</div>
        ) : (
          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Prodotto</th>
                  <th>Tipo</th>
                  <th>Quantità</th>
                  <th>Causale</th>
                  <th>Ordine</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((movement) => (
                  <tr key={movement.id}>
                    <td>
                      <div className="tableMain">{movement.products?.name || '—'}</div>
                      <div className="tableSub">
                        {movement.products?.sku || 'SKU assente'}
                        {movement.products?.color ? ` • ${movement.products.color}` : ''}
                        {movement.products?.size ? ` • ${movement.products.size}` : ''}
                      </div>
                    </td>

                    <td>
                      <span className={getTypeClass(movement.movement_type)}>
                        {getTypeLabel(movement.movement_type)}
                      </span>
                    </td>

                    <td>
                      <div className="tableMain">{movement.quantity}</div>
                    </td>

                    <td>
                      <div className="tableMain">{movement.reason || '—'}</div>
                      <div className="tableSub">{movement.notes || '—'}</div>
                    </td>

                    <td>
                      <div className="tableMain">{movement.orders?.order_number || '—'}</div>
                    </td>

                    <td>
                      <div className="tableMain">
                        {new Date(movement.created_at).toLocaleDateString('it-IT')}
                      </div>
                      <div className="tableSub">
                        {new Date(movement.created_at).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
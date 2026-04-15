import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import '../styles/Orders.css'

const emptyRow = {
  product_id: '',
  quantity: 1,
  unit_price: '',
}

const orderStatuses = [
  { value: 'preventivo', label: 'Preventivo' },
  { value: 'confermato', label: 'Confermato' },
  { value: 'in_stampa', label: 'In stampa' },
  { value: 'pronto', label: 'Pronto' },
  { value: 'consegnato', label: 'Consegnato' },
  { value: 'annullato', label: 'Annullato' },
]

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [openModal, setOpenModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsItems, setDetailsItems] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    customer_id: '',
    status: 'confermato',
    order_date: new Date().toISOString().slice(0, 10),
    delivery_date: '',
    notes: '',
    discount_type: 'fixed',
    discount_value: '',
  })

  const [editingOrderId, setEditingOrderId] = useState(null)

  const [rows, setRows] = useState([{ ...emptyRow }])

  useEffect(() => {
    loadInitialData()
  }, [])

  async function loadInitialData() {
    setLoading(true)
    setError('')

    const [ordersRes, customersRes, productsRes] = await Promise.all([
      supabase
        .from('orders')
        .select(`
          *,
          customers (
            company_name,
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false }),

      supabase
        .from('customers')
        .select('id, company_name, first_name, last_name')
        .order('created_at', { ascending: false }),

      supabase
        .from('products')
        .select('id, name, sku, base_price, stock_qty, color, size, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true }),
    ])

    if (ordersRes.error) setError(ordersRes.error.message)
    if (customersRes.error) setError(customersRes.error.message)
    if (productsRes.error) setError(productsRes.error.message)

    setOrders(ordersRes.data || [])
    setCustomers(customersRes.data || [])
    setProducts(productsRes.data || [])
    setLoading(false)
  }

  function resetOrderForm() {
    setEditingOrderId(null)
    setForm({
      customer_id: '',
      status: 'confermato',
      order_date: new Date().toISOString().slice(0, 10),
      delivery_date: '',
      notes: '',
      discount_type: 'fixed',
      discount_value: '',
    })
    setRows([{ ...emptyRow }])
  }

  function handleOpenNew() {
    resetOrderForm()
    setError('')
    setSuccess('')
    setOpenModal(true)
  }

  async function handleOpenEdit(order) {
    setError('')
    setSuccess('')
    setEditingOrderId(order.id)
    setOpenModal(true)

    setForm({
      customer_id: order.customer_id || '',
      status: order.status || 'confermato',
      order_date: order.order_date || new Date().toISOString().slice(0, 10),
      delivery_date: order.delivery_date || '',
      notes: order.notes || '',
      discount_type: order.discount_type || 'fixed',
      discount_value: order.discount_value ?? '',
    })

    const { data, error } = await supabase
      .from('order_items')
      .select('product_id, quantity, unit_price')
      .eq('order_id', order.id)
      .order('created_at', { ascending: true })

    if (error) {
      setError(error.message)
      setRows([{ ...emptyRow }])
      return
    }

    setRows(
      data && data.length > 0
        ? data.map((item) => ({
          product_id: item.product_id || '',
          quantity: item.quantity || 1,
          unit_price: item.unit_price ?? '',
        }))
        : [{ ...emptyRow }]
    )
  }

  function handleFormChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleRowChange(index, field, value) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row
        const updated = { ...row, [field]: value }

        if (field === 'product_id') {
          const selectedProduct = products.find((p) => p.id === value)
          updated.unit_price = selectedProduct ? selectedProduct.base_price ?? 0 : ''
        }

        return updated
      })
    )
  }

  function addRow() {
    setRows((prev) => [...prev, { ...emptyRow }])
  }

  function removeRow(index) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  function getProductById(id) {
    return products.find((product) => product.id === id)
  }

  const computedRows = rows.map((row) => {
    const quantity = Number(row.quantity || 0)
    const unitPrice = Number(row.unit_price || 0)
    const lineTotal = quantity * unitPrice
    const product = getProductById(row.product_id)

    return { ...row, quantity, unit_price: unitPrice, lineTotal, product }
  })

  const subtotal = computedRows.reduce((sum, row) => sum + row.lineTotal, 0)

  const discountValue = Number(form.discount_value || 0)

  const rawDiscountAmount =
    form.discount_type === 'percent'
      ? subtotal * (discountValue / 100)
      : discountValue

  const discountAmount = Math.min(rawDiscountAmount, subtotal)
  const orderTotal = Math.max(subtotal - discountAmount, 0)

  async function handleCreateOrder(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    if (!form.customer_id) {
      setError('Seleziona un cliente.')
      setSaving(false)
      return
    }

    if (discountValue < 0) {
      setError('Lo sconto non può essere negativo.')
      setSaving(false)
      return
    }

    if (form.discount_type === 'percent' && discountValue > 100) {
      setError('Lo sconto percentuale non può superare il 100%.')
      setSaving(false)
      return
    }

    const cleanItems = computedRows.map((row) => ({
      product_id: row.product_id,
      quantity: Number(row.quantity || 0),
      unit_price: Number(row.unit_price || 0),
    }))

    if (cleanItems.some((item) => !item.product_id)) {
      setError('Seleziona un prodotto per ogni riga.')
      setSaving(false)
      return
    }

    if (cleanItems.some((item) => item.quantity <= 0)) {
      setError('La quantità deve essere maggiore di zero.')
      setSaving(false)
      return
    }

    const rpcName = editingOrderId ? 'update_order_with_items' : 'create_order_with_items'

    const rpcPayload = editingOrderId
      ? {
        p_order_id: editingOrderId,
        p_customer_id: form.customer_id,
        p_status: form.status,
        p_order_date: form.order_date || null,
        p_delivery_date: form.delivery_date || null,
        p_notes: form.notes || null,
        p_discount_type: form.discount_type,
        p_discount_value: discountValue,
        p_subtotal: subtotal,
        p_discount_amount: discountAmount,
        p_total: orderTotal,
        p_items: cleanItems,
      }
      : {
        p_customer_id: form.customer_id,
        p_status: form.status,
        p_order_date: form.order_date || null,
        p_delivery_date: form.delivery_date || null,
        p_notes: form.notes || null,
        p_discount_type: form.discount_type,
        p_discount_value: discountValue,
        p_subtotal: subtotal,
        p_discount_amount: discountAmount,
        p_total: orderTotal,
        p_items: cleanItems,
      }

    const { error } = await supabase.rpc(rpcName, rpcPayload)

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    setSuccess(editingOrderId ? 'Ordine aggiornato correttamente.' : 'Ordine creato correttamente.')
    setOpenModal(false)
    resetOrderForm()
    await loadInitialData()
    setSaving(false)
  }

  async function handleOpenDetails(order) {
    setSelectedOrder(order)
    setDetailsOpen(true)
    setDetailsLoading(true)
    setDetailsItems([])
    setError('')

    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id)
      .order('created_at', { ascending: true })

    if (error) setError(error.message)
    else setDetailsItems(data || [])

    setDetailsLoading(false)
  }

  async function handleCancelOrder(orderId) {
    const ok = window.confirm('Vuoi annullare questo ordine e ripristinare il magazzino?')
    if (!ok) return

    setError('')
    setSuccess('')

    const { error } = await supabase.rpc('cancel_order_and_restore_stock', {
      p_order_id: orderId,
    })

    if (error) {
      setError(error.message)
      return
    }

    setSuccess('Ordine annullato e magazzino ripristinato.')
    setDetailsOpen(false)
    await loadInitialData()
  }

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase()

    return orders.filter((order) => {
      const customer = order.customers
      const customerName = customer
        ? `${customer.company_name || ''} ${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase()
        : ''

      const statusMatch = !statusFilter || order.status === statusFilter
      const fromMatch = !dateFrom || order.order_date >= dateFrom
      const toMatch = !dateTo || order.order_date <= dateTo

      const textMatch =
        !q ||
        (order.order_number || '').toLowerCase().includes(q) ||
        (order.status || '').toLowerCase().includes(q) ||
        customerName.includes(q)

      return statusMatch && fromMatch && toMatch && textMatch
    })
  }, [orders, search, statusFilter, dateFrom, dateTo])

  function getCustomerLabel(customer) {
    if (!customer) return '—'
    if (customer.company_name) return customer.company_name
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || '—'
  }

  function getStatusClass(status) {
    switch (status) {
      case 'preventivo':
        return 'statusBadge quote'
      case 'confermato':
        return 'statusBadge confirmed'
      case 'in_stampa':
        return 'statusBadge printing'
      case 'pronto':
        return 'statusBadge ready'
      case 'consegnato':
        return 'statusBadge delivered'
      case 'annullato':
        return 'statusBadge inactive'
      default:
        return 'statusBadge neutral'
    }
  }

  const priorityStatuses = ['preventivo', 'confermato', 'in_stampa', 'pronto']
  const completedStatuses = ['consegnato', 'annullato']

  const priorityOrders = filteredOrders.filter((order) =>
    priorityStatuses.includes(order.status)
  )

  const completedOrders = filteredOrders.filter((order) =>
    completedStatuses.includes(order.status)
  )

  function getStatusLabel(status) {
    return (
      orderStatuses.find((item) => item.value === status)?.label || status || '—'
    )
  }

  function formatDate(date) {
    if (!date) return '—'
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return date
    return d.toLocaleDateString('it-IT')
  }

  function renderOrderCard(order) {
    return (
      <article className="orderMobileCard" key={order.id}>
        <div className="orderMobileCard__top">
          <div>
            <div className="orderMobileCard__code">{order.order_number}</div>
            <div className="orderMobileCard__customer">
              {getCustomerLabel(order.customers)}
            </div>
          </div>

          <span className={getStatusClass(order.status)}>
            {getStatusLabel(order.status)}
          </span>
        </div>

        <div className="orderMobileCard__grid">
          <div className="orderInfoBox">
            <span>Data ordine</span>
            <strong>{formatDate(order.order_date)}</strong>
          </div>

          <div className="orderInfoBox">
            <span>Consegna</span>
            <strong>{formatDate(order.delivery_date)}</strong>
          </div>

          <div className="orderInfoBox orderInfoBox--total">
            <span>Totale</span>
            <strong>€ {Number(order.total || 0).toFixed(2)}</strong>
          </div>
        </div>

        <div className="orderMobileCard__actions">
          <button
            className="secondaryBtn smallBtn"
            onClick={() => handleOpenDetails(order)}
          >
            Dettagli
          </button>

          {order.status !== 'annullato' ? (
            <button
              className="secondaryBtn smallBtn"
              onClick={() => handleOpenEdit(order)}
            >
              Modifica
            </button>
          ) : null}

          {order.status !== 'annullato' ? (
            <button
              className="dangerBtn smallBtn"
              onClick={() => handleCancelOrder(order.id)}
            >
              Annulla
            </button>
          ) : null}
        </div>
      </article>
    )
  }

  function renderOrdersTable(list) {
    return (
      <div className="tableWrap ordersDesktopView">
        <table className="dataTable">
          <thead>
            <tr>
              <th>Ordine</th>
              <th>Cliente</th>
              <th>Stato</th>
              <th>Date</th>
              <th>Totale</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {list.map((order) => (
              <tr key={order.id}>
                <td>
                  <div className="tableMain">{order.order_number}</div>
                </td>
                <td>
                  <div className="tableMain">{getCustomerLabel(order.customers)}</div>
                </td>
                <td>
                  <span className={getStatusClass(order.status)}>
                    {getStatusLabel(order.status)}
                  </span>
                </td>
                <td>
                  <div className="tableMain">{formatDate(order.order_date)}</div>
                  <div className="tableSub">
                    Consegna: {formatDate(order.delivery_date)}
                  </div>
                </td>
                <td>
                  <div className="tableMain">
                    € {Number(order.total || 0).toFixed(2)}
                  </div>
                </td>
                <td>
                  <div className="rowActions">
                    <button
                      className="secondaryBtn smallBtn"
                      onClick={() => handleOpenDetails(order)}
                    >
                      Dettagli
                    </button>

                    {order.status !== 'annullato' ? (
                      <button
                        className="secondaryBtn smallBtn"
                        onClick={() => handleOpenEdit(order)}
                      >
                        Modifica
                      </button>
                    ) : null}

                    {order.status !== 'annullato' ? (
                      <button
                        className="dangerBtn smallBtn"
                        onClick={() => handleCancelOrder(order.id)}
                      >
                        Annulla
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="pageWrap">
      <div className="sectionTop">
        <div>
          <h2 className="sectionTitle">Ordini</h2>
          <p className="sectionText">
            Gestione ordini cliente con scarico automatico del magazzino.
          </p>
        </div>

        <button className="primaryBtn" onClick={handleOpenNew}>
          + Nuovo ordine
        </button>
      </div>

      <section className="card">
        <div className="ordersFilters">
          <input
            className="searchInput"
            type="text"
            placeholder="Cerca per numero ordine, cliente o stato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tutti gli stati</option>
            {orderStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>

        {error ? <div className="errorBox ordersMessage">{error}</div> : null}
        {success ? <div className="successBox ordersMessage">{success}</div> : null}

        {loading ? (
          <div className="emptyState">Caricamento ordini...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="emptyState">Nessun ordine trovato.</div>
        ) : (
          <div className="ordersSections">
            <section className="ordersGroup ordersGroup--priority">
              <div className="ordersGroup__header">
                <div>
                  <h3>Ordini aperti e in lavorazione</h3>
                  <p>Preventivi, confermati e ordini attualmente in stampa.</p>
                </div>
                <div className="ordersGroup__count">{priorityOrders.length}</div>
              </div>

              {priorityOrders.length === 0 ? (
                <div className="emptyState">Nessun ordine aperto o in stampa.</div>
              ) : (
                <>
                  {renderOrdersTable(priorityOrders)}
                  <div className="ordersMobileList">
                    {priorityOrders.map((order) => renderOrderCard(order))}
                  </div>
                </>
              )}
            </section>

            <section className="ordersGroup">
              <div className="ordersGroup__header">
                <div>
                  <h3>Ordini completati e finiti</h3>
                  <p>Ordini pronti, consegnati o annullati.</p>
                </div>
                <div className="ordersGroup__count">{completedOrders.length}</div>
              </div>

              {completedOrders.length === 0 ? (
                <div className="emptyState">Nessun ordine completato.</div>
              ) : (
                <>
                  {renderOrdersTable(completedOrders)}
                  <div className="ordersMobileList">
                    {completedOrders.map((order) => renderOrderCard(order))}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </section>

      {openModal ? (
        <div className="modalOverlay" onMouseDown={() => setOpenModal(false)}>
          <div className="modalCard largeModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="cardHeader">
              <h3>{editingOrderId ? 'Modifica ordine' : 'Nuovo ordine'}</h3>
              <button className="secondaryBtn" onClick={() => setOpenModal(false)}>
                Chiudi
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="formGrid">
              <div className="field">
                <label>Cliente *</label>
                <select name="customer_id" value={form.customer_id} onChange={handleFormChange} required>
                  <option value="">Seleziona cliente</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {getCustomerLabel(customer)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Stato</label>
                <select name="status" value={form.status} onChange={handleFormChange}>
                  {orderStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Data ordine</label>
                <input type="date" name="order_date" value={form.order_date} onChange={handleFormChange} />
              </div>

              <div className="field">
                <label>Data consegna</label>
                <input type="date" name="delivery_date" value={form.delivery_date} onChange={handleFormChange} />
              </div>

              <div className="field fieldFull">
                <label>Note</label>
                <textarea name="notes" rows="3" value={form.notes} onChange={handleFormChange} />
              </div>

              <div className="field">
                <label>Tipo sconto</label>
                <select name="discount_type" value={form.discount_type} onChange={handleFormChange}>
                  <option value="fixed">Importo fisso (€)</option>
                  <option value="percent">Percentuale (%)</option>
                </select>
              </div>

              <div className="field">
                <label>{form.discount_type === 'percent' ? 'Sconto (%)' : 'Sconto (€)'}</label>
                <input
                  type="number"
                  name="discount_value"
                  min="0"
                  step="0.01"
                  value={form.discount_value}
                  onChange={handleFormChange}
                  placeholder={form.discount_type === 'percent' ? 'Es. 10' : 'Es. 5.00'}
                />
              </div>

              <div className="field fieldFull">
                <div className="orderItemsHeader">
                  <label>Righe ordine</label>
                  <button type="button" className="secondaryBtn" onClick={addRow}>
                    + Aggiungi riga
                  </button>
                </div>

                <div className="orderItemsWrap">
                  {computedRows.map((row, index) => {
                    const product = row.product
                    const availableStock = Number(product?.stock_qty || 0)
                    const lineOverStock = row.product_id && Number(row.quantity || 0) > availableStock

                    return (
                      <div className="orderRowCard" key={index}>
                        <div className="orderRowGrid">
                          <div className="field">
                            <label>Prodotto</label>
                            <select value={row.product_id} onChange={(e) => handleRowChange(index, 'product_id', e.target.value)}>
                              <option value="">Seleziona prodotto</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name} {product.size ? `- ${product.size}` : ''} {product.color ? `- ${product.color}` : ''} (stock: {product.stock_qty})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="field">
                            <label>Quantità</label>
                            <input type="number" min="1" value={row.quantity} onChange={(e) => handleRowChange(index, 'quantity', e.target.value)} />
                          </div>

                          <div className="field">
                            <label>Prezzo unitario</label>
                            <input type="number" step="0.01" value={row.unit_price} onChange={(e) => handleRowChange(index, 'unit_price', e.target.value)} />
                          </div>

                          <div className="field">
                            <label>Totale riga</label>
                            <div className="orderLineTotal">€ {Number(row.lineTotal || 0).toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="orderRowFooter">
                          <div className={lineOverStock ? 'stockWarning active' : 'stockWarning'}>
                            {product
                              ? lineOverStock
                                ? `Attenzione: stock disponibile ${availableStock}`
                                : `Stock disponibile: ${availableStock}`
                              : 'Seleziona un prodotto'}
                          </div>

                          <button type="button" className="dangerBtn smallBtn" onClick={() => removeRow(index)}>
                            Rimuovi
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="field fieldFull">
                <div className="orderSummaryBox">
                  <div className="summaryRow">
                    <span>Subtotale</span>
                    <strong>€ {subtotal.toFixed(2)}</strong>
                  </div>

                  <div className="summaryRow">
                    <span>Sconto</span>
                    <strong>- € {discountAmount.toFixed(2)}</strong>
                  </div>

                  <div className="summaryRow totalRow">
                    <span>Totale ordine</span>
                    <strong>€ {orderTotal.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              <div className="formActions fieldFull">
                <button type="button" className="secondaryBtn" onClick={() => setOpenModal(false)}>
                  Annulla
                </button>
                <button type="submit" className="primaryBtn" disabled={saving}>
                  {saving ? 'Salvataggio...' : editingOrderId ? 'Salva modifiche' : 'Crea ordine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {detailsOpen ? (
        <div className="modalOverlay" onMouseDown={() => setDetailsOpen(false)}>
          <div className="modalCard largeModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="cardHeader">
              <h3>Dettaglio ordine</h3>
              <button className="secondaryBtn" onClick={() => setDetailsOpen(false)}>
                Chiudi
              </button>
            </div>

            {selectedOrder ? (
              <div className="orderDetailsWrap">
                <div className="orderDetailsTop">
                  <div className="detailChip"><span>Ordine</span><strong>{selectedOrder.order_number}</strong></div>
                  <div className="detailChip"><span>Cliente</span><strong>{getCustomerLabel(selectedOrder.customers)}</strong></div>
                  <div className="detailChip"><span>Stato</span><strong>{selectedOrder.status}</strong></div>
                  <div className="detailChip">
                    <span>Subtotale</span>
                    <strong>€ {Number(selectedOrder.subtotal || selectedOrder.total || 0).toFixed(2)}</strong>
                  </div>

                  <div className="detailChip">
                    <span>Sconto</span>
                    <strong>- € {Number(selectedOrder.discount_amount || 0).toFixed(2)}</strong>
                  </div>

                  <div className="detailChip">
                    <span>Totale</span>
                    <strong>€ {Number(selectedOrder.total || 0).toFixed(2)}</strong>
                  </div>
                </div>

                {selectedOrder.notes ? (
                  <div className="orderNotesBox">
                    <strong>Note:</strong> {selectedOrder.notes}
                  </div>
                ) : null}

                {detailsLoading ? (
                  <div className="emptyState">Caricamento righe ordine...</div>
                ) : detailsItems.length === 0 ? (
                  <div className="emptyState">Nessuna riga ordine trovata.</div>
                ) : (
                  <div className="tableWrap">
                    <table className="dataTable">
                      <thead>
                        <tr>
                          <th>Prodotto</th>
                          <th>Variante</th>
                          <th>Quantità</th>
                          <th>Prezzo</th>
                          <th>Totale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailsItems.map((item) => (
                          <tr key={item.id}>
                            <td><div className="tableMain">{item.product_name}</div></td>
                            <td><div className="tableMain">{item.color || '—'}</div><div className="tableSub">{item.size || '—'}</div></td>
                            <td><div className="tableMain">{item.quantity}</div></td>
                            <td><div className="tableMain">€ {Number(item.unit_price || 0).toFixed(2)}</div></td>
                            <td><div className="tableMain">€ {Number(item.line_total || 0).toFixed(2)}</div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedOrder.status !== 'annullato' ? (
                  <div className="detailsActions">
                    <button
                      className="secondaryBtn"
                      onClick={() => {
                        setDetailsOpen(false)
                        handleOpenEdit(selectedOrder)
                      }}
                    >
                      Modifica ordine
                    </button>

                    <button className="dangerBtn" onClick={() => handleCancelOrder(selectedOrder.id)}>
                      Annulla ordine e ripristina stock
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import '../styles/Customers.css'

const emptyForm = {
  company_name: '',
  first_name: '',
  last_name: '',
  vat_number: '',
  tax_code: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  postal_code: '',
  province: '',
  notes: '',
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [openModal, setOpenModal] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerOrders, setCustomerOrders] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadCustomers()
  }, [])

  async function loadCustomers() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setCustomers(data || [])
    }

    setLoading(false)
  }

  function handleOpenNew() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setSuccess('')
    setOpenModal(true)
  }

  function handleOpenEdit(customer) {
    setEditingId(customer.id)
    setForm({
      company_name: customer.company_name || '',
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      vat_number: customer.vat_number || '',
      tax_code: customer.tax_code || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      postal_code: customer.postal_code || '',
      province: customer.province || '',
      notes: customer.notes || '',
    })
    setError('')
    setSuccess('')
    setOpenModal(true)
  }

  async function handleOpenDetails(customer) {
    setSelectedCustomer(customer)
    setDetailsOpen(true)
    setDetailsLoading(true)
    setCustomerOrders([])
    setError('')

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setCustomerOrders(data || [])
    }

    setDetailsLoading(false)
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const payload = {
      ...form,
      created_by: user?.id ?? null,
    }

    let result

    if (editingId) {
      result = await supabase
        .from('customers')
        .update(payload)
        .eq('id', editingId)
    } else {
      result = await supabase
        .from('customers')
        .insert(payload)
    }

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    setSuccess(editingId ? 'Cliente aggiornato correttamente.' : 'Cliente creato correttamente.')
    setOpenModal(false)
    setForm(emptyForm)
    setEditingId(null)
    await loadCustomers()
    setSaving(false)
  }

  async function handleDelete(id) {
    const ok = window.confirm('Vuoi eliminare questo cliente?')
    if (!ok) return

    setError('')
    setSuccess('')

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess('Cliente eliminato correttamente.')
    await loadCustomers()
  }

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers

    return customers.filter((customer) => {
      const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase()
      const company = (customer.company_name || '').toLowerCase()
      const email = (customer.email || '').toLowerCase()
      const phone = (customer.phone || '').toLowerCase()
      const city = (customer.city || '').toLowerCase()

      return (
        fullName.includes(q) ||
        company.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        city.includes(q)
      )
    })
  }, [customers, search])

  const ordersTotal = customerOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
  const activeOrdersCount = customerOrders.filter((order) => order.status !== 'annullato').length

  function getCustomerDisplayName(customer) {
    if (!customer) return '—'
    if (customer.company_name) return customer.company_name
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || '—'
  }

  function getStatusClass(status) {
    switch (status) {
      case 'confermato':
      case 'consegnato':
        return 'statusBadge active'
      case 'in_stampa':
      case 'pronto':
        return 'statusBadge pending'
      case 'annullato':
        return 'statusBadge inactive'
      default:
        return 'statusBadge neutral'
    }
  }

  return (
    <div className="pageWrap">
      <div className="sectionTop customersTop">
        <div>
          <h2 className="sectionTitle">Clienti</h2>
          <p className="sectionText">
            Gestione anagrafica completa dei clienti Inkpress.
          </p>
        </div>

        <button className="primaryBtn" onClick={handleOpenNew}>
          + Nuovo cliente
        </button>
      </div>

      <section className="card">
        <div className="toolbar">
          <input
            className="searchInput"
            type="text"
            placeholder="Cerca per nome, azienda, email, telefono, città..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error ? <div className="errorBox customerMessage">{error}</div> : null}
        {success ? <div className="successBox customerMessage">{success}</div> : null}

        {loading ? (
          <div className="emptyState">Caricamento clienti...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="emptyState">Nessun cliente trovato.</div>
        ) : (
          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Azienda</th>
                  <th>Contatti</th>
                  <th>Città</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="tableMain">
                        {customer.first_name || customer.last_name
                          ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                          : '—'}
                      </div>
                      <div className="tableSub">
                        {customer.tax_code || 'Nessun codice fiscale'}
                      </div>
                    </td>

                    <td>
                      <div className="tableMain">{customer.company_name || '—'}</div>
                      <div className="tableSub">{customer.vat_number || 'Nessuna P.IVA'}</div>
                    </td>

                    <td>
                      <div className="tableMain">{customer.email || '—'}</div>
                      <div className="tableSub">{customer.phone || '—'}</div>
                    </td>

                    <td>
                      <div className="tableMain">{customer.city || '—'}</div>
                      <div className="tableSub">{customer.province || '—'}</div>
                    </td>

                    <td>
                      <div className="rowActions">
                        <button
                          className="secondaryBtn smallBtn"
                          onClick={() => handleOpenDetails(customer)}
                        >
                          Dettaglio
                        </button>

                        <button
                          className="secondaryBtn smallBtn"
                          onClick={() => handleOpenEdit(customer)}
                        >
                          Modifica
                        </button>

                        <button
                          className="dangerBtn smallBtn"
                          onClick={() => handleDelete(customer.id)}
                        >
                          Elimina
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {openModal ? (
  <div className="modalOverlay" onMouseDown={() => setOpenModal(false)}>
    <div
      className="modalCard largeModal customerFormModal"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="cardHeader customerFormModal__header">
        <h3>{editingId ? 'Modifica cliente' : 'Nuovo cliente'}</h3>
        <button className="closeBtn" onClick={() => setOpenModal(false)}>
          Chiudi
        </button>
      </div>

      <form onSubmit={handleSubmit} className="formGrid customerFormGrid">
        <div className="field">
          <label>Ragione sociale</label>
          <input name="company_name" value={form.company_name} onChange={handleChange} />
        </div>

        <div className="field">
          <label>Nome</label>
          <input name="first_name" value={form.first_name} onChange={handleChange} />
        </div>

        <div className="field">
          <label>Cognome</label>
          <input name="last_name" value={form.last_name} onChange={handleChange} />
        </div>

        <div className="field">
          <label>Partita IVA</label>
          <input name="vat_number" value={form.vat_number} onChange={handleChange} />
        </div>

        <div className="field">
          <label>Codice fiscale</label>
          <input name="tax_code" value={form.tax_code} onChange={handleChange} />
        </div>

        <div className="field">
          <label>Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} />
        </div>

        <div className="field">
          <label>Telefono</label>
          <input name="phone" value={form.phone} onChange={handleChange} />
        </div>

        <div className="field">
          <label>Indirizzo</label>
          <input name="address" value={form.address} onChange={handleChange} />
        </div>

        <div className="field">
          <label>Città</label>
          <input name="city" value={form.city} onChange={handleChange} />
        </div>

        <div className="field">
          <label>CAP</label>
          <input name="postal_code" value={form.postal_code} onChange={handleChange} />
        </div>

        <div className="field">
          <label>Provincia</label>
          <input name="province" value={form.province} onChange={handleChange} />
        </div>

        <div className="field fieldFull">
          <label>Note</label>
          <textarea
            name="notes"
            rows="4"
            value={form.notes}
            onChange={handleChange}
          />
        </div>

        <div className="formActions fieldFull customerFormModal__actions">
          <button type="button" className="secondaryBtn" onClick={() => setOpenModal(false)}>
            Annulla
          </button>
          <button type="submit" className="primaryBtn" disabled={saving}>
            {saving ? 'Salvataggio...' : editingId ? 'Salva modifiche' : 'Crea cliente'}
          </button>
        </div>
      </form>
    </div>
  </div>
) : null}

      {detailsOpen && selectedCustomer ? (
        <div className="modalOverlay" onMouseDown={() => setDetailsOpen(false)}>
          <div className="modalCard customerDetailsModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="cardHeader customerFormModal__header">
              <h3>Dettaglio cliente</h3>
              <button className="closeBtn" onClick={() => setDetailsOpen(false)}>
                Chiudi
              </button>
            </div>

            <div className="customerDetailsWrap">
              <div className="customerStatsGrid">
                <div className="customerStatCard">
                  <span className="customerStatLabel">Cliente</span>
                  <strong>{getCustomerDisplayName(selectedCustomer)}</strong>
                </div>

                <div className="customerStatCard">
                  <span className="customerStatLabel">Ordini totali</span>
                  <strong>{customerOrders.length}</strong>
                </div>

                <div className="customerStatCard">
                  <span className="customerStatLabel">Ordini attivi</span>
                  <strong>{activeOrdersCount}</strong>
                </div>

                <div className="customerStatCard">
                  <span className="customerStatLabel">Valore ordini</span>
                  <strong>€ {ordersTotal.toFixed(2)}</strong>
                </div>
              </div>

              <div className="customerInfoGrid">
                <div className="customerInfoCard">
                  <h4>Anagrafica</h4>
                  <div className="customerInfoList">
                    <div><span>Ragione sociale:</span><strong>{selectedCustomer.company_name || '—'}</strong></div>
                    <div><span>Nome:</span><strong>{selectedCustomer.first_name || '—'}</strong></div>
                    <div><span>Cognome:</span><strong>{selectedCustomer.last_name || '—'}</strong></div>
                    <div><span>Partita IVA:</span><strong>{selectedCustomer.vat_number || '—'}</strong></div>
                    <div><span>Codice fiscale:</span><strong>{selectedCustomer.tax_code || '—'}</strong></div>
                  </div>
                </div>

                <div className="customerInfoCard">
                  <h4>Contatti</h4>
                  <div className="customerInfoList">
                    <div><span>Email:</span><strong>{selectedCustomer.email || '—'}</strong></div>
                    <div><span>Telefono:</span><strong>{selectedCustomer.phone || '—'}</strong></div>
                    <div><span>Indirizzo:</span><strong>{selectedCustomer.address || '—'}</strong></div>
                    <div><span>Città:</span><strong>{selectedCustomer.city || '—'}</strong></div>
                    <div><span>CAP / Provincia:</span><strong>{selectedCustomer.postal_code || '—'} {selectedCustomer.province || ''}</strong></div>
                  </div>
                </div>
              </div>

              <div className="customerInfoCard">
                <h4>Note</h4>
                <div className="customerNotesBox">
                  {selectedCustomer.notes || 'Nessuna nota inserita.'}
                </div>
              </div>

              <div className="customerInfoCard">
                <div className="cardHeader customerInnerHeader">
                  <h4>Storico ordini</h4>
                </div>

                {detailsLoading ? (
                  <div className="emptyState">Caricamento storico ordini...</div>
                ) : customerOrders.length === 0 ? (
                  <div className="emptyState">Questo cliente non ha ancora ordini.</div>
                ) : (
                  <div className="tableWrap">
                    <table className="dataTable">
                      <thead>
                        <tr>
                          <th>Ordine</th>
                          <th>Stato</th>
                          <th>Data ordine</th>
                          <th>Consegna</th>
                          <th>Totale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerOrders.map((order) => (
                          <tr key={order.id}>
                            <td>
                              <div className="tableMain">{order.order_number}</div>
                            </td>
                            <td>
                              <span className={getStatusClass(order.status)}>
                                {order.status}
                              </span>
                            </td>
                            <td>
                              <div className="tableMain">{order.order_date || '—'}</div>
                            </td>
                            <td>
                              <div className="tableMain">{order.delivery_date || '—'}</div>
                            </td>
                            <td>
                              <div className="tableMain">
                                € {Number(order.total || 0).toFixed(2)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
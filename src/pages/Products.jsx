import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { uploadProductImage } from '../lib/storage'
import { generateSku } from '../lib/sku'
import '../styles/Products.css'

const emptyForm = {
  sku: '',
  name: '',
  category: '',
  brand: '',
  color: '',
  size: '',
  description: '',
  purchase_price: '',
  base_price: '',
  stock_qty: '',
  min_stock: '',
  is_active: true,
  image_url: '',
}

const emptyStockForm = {
  movement_type: 'load',
  quantity: '',
  reason: '',
  notes: '',
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stockSaving, setStockSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [openModal, setOpenModal] = useState(false)
  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [stockForm, setStockForm] = useState(emptyStockForm)
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setProducts(data || [])
    }

    setLoading(false)
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
    setImageFile(null)
    setPreviewUrl('')
  }

  function handleOpenNew() {
    resetForm()
    setError('')
    setSuccess('')
    setOpenModal(true)
  }

  function handleOpenEdit(product) {
    setEditingId(product.id)
    setForm({
      sku: product.sku || '',
      name: product.name || '',
      category: product.category || '',
      brand: product.brand || '',
      color: product.color || '',
      size: product.size || '',
      description: product.description || '',
      purchase_price: product.purchase_price ?? '',
      base_price: product.base_price ?? '',
      stock_qty: product.stock_qty ?? '',
      min_stock: product.min_stock ?? '',
      is_active: product.is_active ?? true,
      image_url: product.image_url || '',
    })
    setPreviewUrl(product.image_url || '')
    setImageFile(null)
    setError('')
    setSuccess('')
    setOpenModal(true)
  }

  function handleOpenStockModal(product) {
    setSelectedProduct(product)
    setStockForm(emptyStockForm)
    setError('')
    setSuccess('')
    setStockModalOpen(true)
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleStockChange(e) {
    const { name, value } = e.target
    setStockForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setImageFile(file)
    const localPreview = URL.createObjectURL(file)
    setPreviewUrl(localPreview)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    let finalImageUrl = form.image_url || ''

    if (imageFile) {
      const { data, error: uploadError } = await uploadProductImage(imageFile)

      if (uploadError) {
        setError(uploadError.message)
        setSaving(false)
        return
      }

      finalImageUrl = data.publicUrl
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const payload = {
      sku: (form.sku || generateSku(form)).trim(),
      name: form.name.trim(),
      category: form.category || null,
      brand: form.brand || null,
      color: form.color || null,
      size: form.size || null,
      description: form.description || null,
      image_url: finalImageUrl || null,
      purchase_price: Number(form.purchase_price || 0),
      base_price: Number(form.base_price || 0),
      stock_qty: Number(form.stock_qty || 0),
      min_stock: Number(form.min_stock || 0),
      is_active: Boolean(form.is_active),
      created_by: user?.id ?? null,
    }

    if (!payload.name) {
      setError('Il nome prodotto è obbligatorio.')
      setSaving(false)
      return
    }

    let result

    if (editingId) {
      result = await supabase.from('products').update(payload).eq('id', editingId)
    } else {
      result = await supabase.from('products').insert(payload)
    }

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    setSuccess(editingId ? 'Prodotto aggiornato correttamente.' : 'Prodotto creato correttamente.')
    setOpenModal(false)
    resetForm()
    await loadProducts()
    setSaving(false)
  }

  async function handleStockSubmit(e) {
    e.preventDefault()
    if (!selectedProduct) return

    setStockSaving(true)
    setError('')
    setSuccess('')

    const quantity = Number(stockForm.quantity || 0)

    if (quantity <= 0) {
      setError('Inserisci una quantità valida.')
      setStockSaving(false)
      return
    }

    const { error } = await supabase.rpc('adjust_product_stock', {
      p_product_id: selectedProduct.id,
      p_movement_type: stockForm.movement_type,
      p_quantity: quantity,
      p_reason: stockForm.reason || null,
      p_notes: stockForm.notes || null,
    })

    if (error) {
      setError(error.message)
      setStockSaving(false)
      return
    }

    setSuccess('Movimento magazzino registrato correttamente.')
    setStockModalOpen(false)
    setSelectedProduct(null)
    await loadProducts()
    setStockSaving(false)
  }

  async function handleDelete(id) {
    const ok = window.confirm('Vuoi eliminare questo prodotto?')
    if (!ok) return

    setError('')
    setSuccess('')

    const { error } = await supabase.from('products').delete().eq('id', id)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess('Prodotto eliminato correttamente.')
    await loadProducts()
  }

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products

    return products.filter((product) =>
      [product.sku, product.name, product.category, product.brand, product.color, product.size]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q))
    )
  }, [products, search])

  return (
    <div className="pageWrap">
      <div className="sectionTop">
        <div>
          <h2 className="sectionTitle">Magazzino</h2>
          <p className="sectionText">
            Gestione capi disponibili con immagini, varianti e quantità.
          </p>
        </div>

        <button className="primaryBtn" onClick={handleOpenNew}>
          + Nuovo prodotto
        </button>
      </div>

      <section className="card">
        <div className="toolbar">
          <input
            className="searchInput"
            type="text"
            placeholder="Cerca per SKU, nome, categoria, brand, colore o taglia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error ? <div className="errorBox productsMessage">{error}</div> : null}
        {success ? <div className="successBox productsMessage">{success}</div> : null}

        {loading ? (
          <div className="emptyState">Caricamento prodotti...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="emptyState">Nessun prodotto trovato.</div>
        ) : (
          <div className="productsGrid">
            {filteredProducts.map((product) => {
              const lowStock = Number(product.stock_qty || 0) <= Number(product.min_stock || 0)

              return (
                <article className="productCard" key={product.id}>
                  <div className="productImageWrap">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="productImage" />
                    ) : (
                      <div className="productImagePlaceholder">Nessuna immagine</div>
                    )}
                  </div>

                  <div className="productBody">
                    <div className="productTop">
                      <div>
                        <h3 className="productTitle">{product.name}</h3>
                        <p className="productSku">{product.sku || 'SKU non impostato'}</p>
                      </div>

                      <div className="productBadges">
                        <span className={product.is_active ? 'statusBadge active' : 'statusBadge inactive'}>
                          {product.is_active ? 'Attivo' : 'Disattivo'}
                        </span>

                        {lowStock ? <span className="lowStockBadge">Scorte basse</span> : null}
                      </div>
                    </div>

                    <div className="productMeta">
                      <span>{product.category || '—'}</span>
                      <span>{product.brand || '—'}</span>
                      <span>{product.color || '—'}</span>
                      <span>{product.size || '—'}</span>
                    </div>

                    <div className="productStockRow">
                      <div>
                        <div className="productStockLabel">Disponibilità</div>
                        <div className={lowStock ? 'productStockValue low' : 'productStockValue'}>
                          {product.stock_qty ?? 0}
                        </div>
                      </div>

                      <div>
                        <div className="productStockLabel">Scorta minima</div>
                        <div className="productStockValue secondary">
                          {product.min_stock ?? 0}
                        </div>
                      </div>

                      <div>
                        <div className="productStockLabel">Prezzo base</div>
                        <div className="productStockValue secondary">
                          € {Number(product.base_price || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="rowActions">
                      <button className="secondaryBtn smallBtn" onClick={() => handleOpenEdit(product)}>
                        Modifica
                      </button>

                      <button className="secondaryBtn smallBtn" onClick={() => handleOpenStockModal(product)}>
                        Magazzino
                      </button>

                      <button className="dangerBtn smallBtn" onClick={() => handleDelete(product.id)}>
                        Elimina
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {openModal ? (
        <div className="modalOverlay" onMouseDown={() => setOpenModal(false)}>
          <div className="modalCard largeModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="cardHeader">
              <h3>{editingId ? 'Modifica prodotto' : 'Nuovo prodotto'}</h3>
              <button className="secondaryBtn" onClick={() => setOpenModal(false)}>
                Chiudi
              </button>
            </div>

            <form onSubmit={handleSubmit} className="formGrid">
              <div className="field">
                <label>SKU</label>
                <input name="sku" value={form.sku} onChange={handleChange} placeholder="Lascia vuoto per generazione automatica" />
              </div>

              <div className="field">
                <label>Nome prodotto *</label>
                <input name="name" value={form.name} onChange={handleChange} required />
              </div>

              <div className="field">
                <label>Categoria</label>
                <input name="category" value={form.category} onChange={handleChange} />
              </div>

              <div className="field">
                <label>Brand</label>
                <input name="brand" value={form.brand} onChange={handleChange} />
              </div>

              <div className="field">
                <label>Colore</label>
                <input name="color" value={form.color} onChange={handleChange} />
              </div>

              <div className="field">
                <label>Taglia</label>
                <input name="size" value={form.size} onChange={handleChange} />
              </div>

              <div className="field">
                <label>Prezzo acquisto</label>
                <input name="purchase_price" type="number" step="0.01" value={form.purchase_price} onChange={handleChange} />
              </div>

              <div className="field">
                <label>Prezzo base</label>
                <input name="base_price" type="number" step="0.01" value={form.base_price} onChange={handleChange} />
              </div>

              <div className="field">
                <label>Quantità disponibile</label>
                <input name="stock_qty" type="number" value={form.stock_qty} onChange={handleChange} />
              </div>

              <div className="field">
                <label>Scorta minima</label>
                <input name="min_stock" type="number" value={form.min_stock} onChange={handleChange} />
              </div>

              <div className="field fieldFull">
                <label>Descrizione</label>
                <textarea name="description" rows="4" value={form.description} onChange={handleChange} />
              </div>

              <div className="field fieldFull">
                <label>Immagine prodotto</label>
                <input type="file" accept="image/*" onChange={handleFileChange} />
              </div>

              {previewUrl ? (
                <div className="field fieldFull">
                  <div className="productPreviewWrap">
                    <img src={previewUrl} alt="Preview prodotto" className="productPreview" />
                  </div>
                </div>
              ) : null}

              <div className="field fieldFull checkboxField">
                <label className="checkboxLabel">
                  <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
                  <span>Prodotto attivo</span>
                </label>
              </div>

              <div className="formActions fieldFull">
                <button type="button" className="secondaryBtn" onClick={() => setOpenModal(false)}>
                  Annulla
                </button>
                <button type="submit" className="primaryBtn" disabled={saving}>
                  {saving ? 'Salvataggio...' : editingId ? 'Salva modifiche' : 'Crea prodotto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {stockModalOpen && selectedProduct ? (
        <div className="modalOverlay" onMouseDown={() => setStockModalOpen(false)}>
          <div className="modalCard stockModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="cardHeader">
              <h3>Gestione magazzino</h3>
              <button className="secondaryBtn" onClick={() => setStockModalOpen(false)}>
                Chiudi
              </button>
            </div>

            <div className="stockModalInfo">
              <div><strong>Prodotto:</strong> {selectedProduct.name}</div>
              <div><strong>SKU:</strong> {selectedProduct.sku || '—'}</div>
              <div><strong>Stock attuale:</strong> {selectedProduct.stock_qty}</div>
            </div>

            <form onSubmit={handleStockSubmit} className="formGrid">
              <div className="field">
                <label>Tipo movimento</label>
                <select name="movement_type" value={stockForm.movement_type} onChange={handleStockChange}>
                  <option value="load">Carico</option>
                  <option value="adjustment">Rettifica stock assoluta</option>
                </select>
              </div>

              <div className="field">
                <label>{stockForm.movement_type === 'load' ? 'Quantità da aggiungere' : 'Nuovo stock totale'}</label>
                <input name="quantity" type="number" value={stockForm.quantity} onChange={handleStockChange} />
              </div>

              <div className="field fieldFull">
                <label>Causale</label>
                <input name="reason" value={stockForm.reason} onChange={handleStockChange} placeholder="Es. carico fornitore, rettifica inventario..." />
              </div>

              <div className="field fieldFull">
                <label>Note</label>
                <textarea name="notes" rows="3" value={stockForm.notes} onChange={handleStockChange} />
              </div>

              <div className="formActions fieldFull">
                <button type="button" className="secondaryBtn" onClick={() => setStockModalOpen(false)}>
                  Annulla
                </button>
                <button type="submit" className="primaryBtn" disabled={stockSaving}>
                  {stockSaving ? 'Salvataggio...' : 'Salva movimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
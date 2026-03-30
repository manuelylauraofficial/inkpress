import { supabase } from './supabase'

export async function uploadProductImage(file) {
  if (!file) return { data: null, error: new Error('Nessun file selezionato') }

  const ext = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const filePath = `products/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    return { data: null, error: uploadError }
  }

  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath)

  return {
    data: {
      path: filePath,
      publicUrl: data.publicUrl,
    },
    error: null,
  }
}
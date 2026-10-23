import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'mojo-system-v1'

// Format JSON du fichier : { version, exportedAt, universes: { illirea: {...}, teotl: {...} } }
// Chaque univers : { bestiaire: [], combats: [], lootTables: [], rencontres: [] }
const DEFAULT_STORE = {
  version: 3,
  exportedAt: null,
  universes: {
    illirea: { bestiaire: [], combats: [], lootTables: [], rencontres: [] },
    teotl: { bestiaire: [], combats: [], lootTables: [], rencontres: [] }
  }
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STORE
    const parsed = JSON.parse(raw)
    // merge défensif pour rester compatible si tu ajoutes des champs plus tard
    return {
      ...DEFAULT_STORE,
      ...parsed,
      universes: {
        illirea: { ...DEFAULT_STORE.universes.illirea, ...(parsed.universes?.illirea || {}) },
        teotl: { ...DEFAULT_STORE.universes.teotl, ...(parsed.universes?.teotl || {}) }
      }
    }
  } catch {
    return DEFAULT_STORE
  }
}

export function useMojoStore() {
  const [store, setStore] = useState(loadInitial)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    } catch (e) {
      console.warn('[Mojo] localStorage plein ou indisponible', e)
    }
  }, [store])

  // Export JSON téléchargeable
  const exportJSON = useCallback(() => {
    const payload = { ...store, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mojo-system-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [store])

  // Import JSON (remplace le store après validation minimale + migration douce)
  const importJSON = useCallback(async (file) => {
    const text = await file.text()
    const parsed = JSON.parse(text)
    if (!parsed.universes || !parsed.universes.illirea || !parsed.universes.teotl) {
      throw new Error('Fichier invalide : clés universes.illirea / universes.teotl manquantes.')
    }
    setStore({
      ...DEFAULT_STORE,
      ...parsed,
      universes: {
        illirea: { ...DEFAULT_STORE.universes.illirea, ...(parsed.universes.illirea || {}) },
        teotl: { ...DEFAULT_STORE.universes.teotl, ...(parsed.universes.teotl || {}) }
      }
    })
  }, [])

  const reset = useCallback(() => setStore(DEFAULT_STORE), [])

  return { store, setStore, exportJSON, importJSON, reset }
}

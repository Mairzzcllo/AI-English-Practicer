type Doc = Record<string, unknown>

class InMemoryCollection {
  private docs = new Map<string, Doc>()
  private idCounter = 0

  async findById(id: string) {
    return this.docs.get(id) ?? null
  }

  async find(filter?: Partial<Doc>) {
    let results = Array.from(this.docs.values())
    if (filter) {
      for (const [key, val] of Object.entries(filter)) {
        results = results.filter((d) => d[key] === val)
      }
    }
    return results
  }

  async create(data: Doc) {
    this.idCounter++
    const _id = `mem_${Date.now()}_${this.idCounter}`
    const doc = { _id, ...data }
    this.docs.set(_id, doc)
    return doc
  }

  save(doc: Doc) {
    const _id = doc._id as string
    this.docs.set(_id, doc)
  }

  async delete(id: string) {
    this.docs.delete(id)
  }
}

export class InMemoryStore {
  sessions = new InMemoryCollection()
}

export function getMemStore(): InMemoryStore {
  if (!globalThis.__ai_english_memstore) {
    globalThis.__ai_english_memstore = new InMemoryStore()
  }
  return globalThis.__ai_english_memstore
}

export function resetMemStore() {
  delete globalThis.__ai_english_memstore
}

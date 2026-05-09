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
}

class InMemoryStore {
  sessions = new InMemoryCollection()
}

let store: InMemoryStore | null = null

export function getMemStore() {
  if (!store) store = new InMemoryStore()
  return store
}

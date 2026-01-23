import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'

import schema from './schema'
import KnowledgeCard from './KnowledgeCard'

const adapter = new SQLiteAdapter({
  schema,
  jsi: false, 
  onSetUpError: error => { console.error(error) }
})

export const database = new Database({
  adapter,
  modelClasses: [
    KnowledgeCard,
  ],
})
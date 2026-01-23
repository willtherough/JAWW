import { appSchema, tableSchema } from '@nozbe/watermelondb'

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'knowledge_cards',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'domain', type: 'string' },
        { name: 'payload_json', type: 'string' },
        { name: 'author_id', type: 'string' },
        { name: 'is_verified', type: 'boolean' },
        { name: 'verification_count', type: 'number' },
        { name: 'local_vector_blob', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ]
    }),
  ]
})
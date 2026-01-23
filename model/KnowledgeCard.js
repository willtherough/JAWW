import { Model } from '@nozbe/watermelondb'
import { field, date, text } from '@nozbe/watermelondb/decorators'

export default class KnowledgeCard extends Model {
  static table = 'knowledge_cards'

  @text('title') title
  @text('domain') domain
  @text('payload_json') payloadJson
  @text('author_id') authorId
  @field('is_verified') isVerified
  @field('verification_count') verificationCount
  @date('created_at') createdAt
  @text('local_vector_blob') localVectorBlob
}
import { Page } from './page'

export interface Database {
  results: Page[]
  has_more: boolean
}

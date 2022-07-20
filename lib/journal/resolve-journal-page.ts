import { ExtendedRecordMap } from 'notion-types'

// import * as acl from '../acl'
import { site } from '../config'
import { getJournalPages, getPage } from './journal'
import * as acl from '../acl'

export async function resolveJournalPages() {
  const pages = await getJournalPages()
  return {
    pages
  }
}

export async function resolveJournalPage(domain: string, rawPageId?: string) {
  let recordMap: ExtendedRecordMap
  const pageId = rawPageId

  console.log(site)
  recordMap = await getPage(pageId)

  const props = { site, recordMap, pageId }
  return { ...props, ...(await acl.pageAcl(props)) }
}

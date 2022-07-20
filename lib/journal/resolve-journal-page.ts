import { ExtendedRecordMap } from 'notion-types'

// import * as acl from '../acl'
import { site } from '../config'
import { getJournalPages, getPage } from './journal'

export async function resolveJournalPages() {
  const pages = await getJournalPages()
  return {
    pages
  }
}

export async function resolveJournalPage(domain: string, pageId: string) {
  console.log(site)
  const recordMap: ExtendedRecordMap = await getPage(pageId)

  const props = { site, recordMap, pageId }
  // return { ...props, ...(await acl.pageAcl(props)) }
  return props
}

import pMemoize from 'p-memoize'
import { ExtendedRecordMap } from 'notion-types'
import { api } from '../config'
import { Database } from '../interfaces/database'

export const getJournalPages = pMemoize(getJournalPagesImpl)

async function getJournalPagesImpl(): Promise<Database> {
  return fetch(api.getPages, {
    method: 'GET',
    headers: {
      'content-type': 'application/json'
    }
  })
    .then((res) => {
      if (res.ok) {
        return res
      }

      const error: any = new Error(res.statusText)
      error.response = res
      return Promise.reject(error)
    })
    .then((res) => res.json())
}

export const getJournalPage = pMemoize(getJournalPageImpl)

async function getJournalPageImpl(id: string): Promise<any> {
  return fetch(api.getBlockChildren(id), {
    method: 'GET',
    headers: {
      'content-type': 'application/json'
    }
  })
    .then((res) => {
      if (res.ok) {
        return res
      }

      const error: any = new Error(res.statusText)
      error.response = res
      return Promise.reject(error)
    })
    .then((res) => res.json())
}

export async function getPage(pageId: string): Promise<ExtendedRecordMap> {
  const blocks = await getJournalPage(pageId)
  return blocks.results
}

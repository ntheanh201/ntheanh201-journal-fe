import pMap from 'p-map'
import pMemoize from 'p-memoize'
import { ExtendedRecordMap } from 'notion-types'
import { mergeRecordMaps } from 'notion-utils'
import { navigationLinks, navigationStyle } from 'lib/config'
// import * as types from '../types'
import { api } from '../config'
import ExpiryMap from 'expiry-map'

export const getJournalPages = pMemoize(getJournalPagesImpl)

async function getJournalPagesImpl(): Promise<any> {
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

export const getJournalPage = pMemoize(getJournalPageImpl, {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  cacheKey: (args) => args[0]?.id,
  cache: new ExpiryMap(10000)
})

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

const getNavigationLinkPages = pMemoize(
  async (): Promise<ExtendedRecordMap[]> => {
    const navigationLinkPageIds = (navigationLinks || [])
      .map((link) => link.pageId)
      .filter(Boolean)

    if (navigationStyle !== 'default' && navigationLinkPageIds.length) {
      return pMap(
        navigationLinkPageIds,
        async (navigationLinkPageId) => getJournalPage(navigationLinkPageId),
        {
          concurrency: 4
        }
      )
    }

    return []
  }
)

export async function getPage(pageId: string): Promise<ExtendedRecordMap> {
  let recordMap = await getJournalPage(pageId)

  if (navigationStyle !== 'default') {
    // ensure that any pages linked to in the custom navigation header have
    // their block info fully resolved in the page record map so we know
    // the page title, slug, etc.
    const navigationLinkRecordMaps = await getNavigationLinkPages()

    if (navigationLinkRecordMaps?.length) {
      recordMap = navigationLinkRecordMaps.reduce(
        (map, navigationLinkRecordMap) =>
          mergeRecordMaps(map, navigationLinkRecordMap),
        recordMap
      )
    }
  }

  // if (isPreviewImageSupportEnabled) {
  //   const previewImageMap = await getPreviewImageMap(recordMap)
  //   ;(recordMap as any).preview_images = previewImageMap
  // }

  return recordMap
}

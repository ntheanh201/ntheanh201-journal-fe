import pMemoize from 'p-memoize'
import { ExtendedRecordMap } from 'notion-types'
import { api, navigationLinks, navigationStyle } from '../config'
import { Database } from '../interfaces/database'
import { mergeRecordMaps } from 'notion-utils'
import pMap from 'p-map'
import { getJournalPage } from './get-page'

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


const getNavigationLinkPages = pMemoize(
  async (): Promise<ExtendedRecordMap[]> => {
    const navigationLinkPageIds = (navigationLinks || [])
      .map((link) => link.pageId)
      .filter(Boolean)

    if (navigationStyle !== 'default' && navigationLinkPageIds.length) {
      return pMap(
        navigationLinkPageIds,
        async (navigationLinkPageId) =>
          getJournalPage(navigationLinkPageId, {
            chunkLimit: 1,
            fetchMissingBlocks: false,
            fetchCollections: false,
            signFileUrls: false
          }),
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

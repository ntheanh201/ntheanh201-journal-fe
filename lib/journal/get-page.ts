import { OptionsOfJSONResponseBody } from 'got/dist/source/types'
import { ExtendedRecordMap } from 'notion-types'
import { getBlockCollectionId, getPageContentBlockIds, uuidToId } from 'notion-utils'
import pMap from 'p-map'
import { api } from '../config'
import { SignedUrlRequest } from 'notion-client'
import { getCollectionData } from './get-collection-data'

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

export const getJournalPage = async (
  pageId: string,
  {
    concurrency = 3,
    fetchMissingBlocks = true,
    fetchCollections = true,
    signFileUrls = true,
    gotOptions
  }: {
    concurrency?: number
    fetchMissingBlocks?: boolean
    fetchCollections?: boolean
    signFileUrls?: boolean
    chunkLimit?: number
    chunkNumber?: number
    gotOptions?: OptionsOfJSONResponseBody
  } = {}
): Promise<ExtendedRecordMap> => {
  const page = await getJournalPageImpl(pageId
    // {
    //   chunkLimit,
    //   chunkNumber,
    //   gotOptions
    // }
  )
  const recordMap = page?.recordMap as ExtendedRecordMap

  if (!recordMap?.block) {
    throw new Error(`Notion page not found "${uuidToId(pageId)}"`)
  }

// ensure that all top-level maps exist
  recordMap.collection = recordMap.collection ?? {}
  recordMap.collection_view = recordMap.collection_view ?? {}
  recordMap.notion_user = recordMap.notion_user ?? {}

// additional mappings added for convenience
// note: these are not native notion objects
  recordMap.collection_query = {}
  recordMap.signed_urls = {}

  if (fetchMissingBlocks) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // fetch any missing content blocks
      const pendingBlockIds = getPageContentBlockIds(recordMap).filter(
        (id) => !recordMap.block[id]
      )

      if (!pendingBlockIds.length) {
        break
      }

      const newBlocks = await getBlocks(
        pendingBlockIds,
        gotOptions
      ).then((res) => res.recordMap.block)

      recordMap.block = { ...recordMap.block, ...newBlocks }
    }
  }

  const contentBlockIds = getPageContentBlockIds(recordMap)

// Optionally fetch all data for embedded collections and their associated views.
// NOTE: We're eagerly fetching *all* data for each collection and all of its views.
// This is really convenient in order to ensure that all data needed for a given
// Notion page is readily available for use cases involving server-side rendering
// and edge caching.
  if (fetchCollections) {
    const allCollectionInstances: Array<{
      collectionId: string
      collectionViewId: string
    }> = contentBlockIds.flatMap((blockId) => {
      const block = recordMap.block[blockId].value
      const collectionId =
        block &&
        (block.type === 'collection_view' ||
          block.type === 'collection_view_page') &&
        getBlockCollectionId(block, recordMap)

      if (collectionId) {
        return block.view_ids?.map((collectionViewId) => ({
          collectionId,
          collectionViewId
        }))
      } else {
        return []
      }
    })

    // fetch data for all collection view instances
    await pMap(
      allCollectionInstances,
      async (collectionInstance) => {
        const { collectionId, collectionViewId } = collectionInstance
        const collectionView =
          recordMap.collection_view[collectionViewId]?.value

        try {
          const collectionData = await getCollectionData(
            collectionId,
            collectionViewId,
            collectionView,
            {
              gotOptions
            }
          )

          // await fs.writeFile(
          //   `${collectionId}-${collectionViewId}.json`,
          //   JSON.stringify(collectionData.result, null, 2)
          // )

          recordMap.block = {
            ...recordMap.block,
            ...collectionData.recordMap.block
          }

          recordMap.collection = {
            ...recordMap.collection,
            ...collectionData.recordMap.collection
          }

          recordMap.collection_view = {
            ...recordMap.collection_view,
            ...collectionData.recordMap.collection_view
          }

          recordMap.notion_user = {
            ...recordMap.notion_user,
            ...collectionData.recordMap.notion_user
          }

          recordMap.collection_query![collectionId] = {
            ...recordMap.collection_query![collectionId],
            [collectionViewId]: (collectionData.result as any)?.reducerResults
          }
        } catch (err) {
          // It's possible for public pages to link to private collections, in which case
          // Notion returns a 400 error
          console.warn('NotionAPI collectionQuery error', pageId, err.message)
          console.error(err)
        }
      },
      {
        concurrency
      }
    )
  }

// Optionally fetch signed URLs for any embedded files.
// NOTE: Similar to collection data, we default to eagerly fetching signed URL info
// because it is preferable for many use cases as opposed to making these API calls
// lazily from the client-side.
  if (signFileUrls) {
    await addSignedUrls({ recordMap, contentBlockIds, gotOptions })
  }

  return recordMap
}

const addSignedUrls = async ({
                               recordMap,
                               contentBlockIds,
                               gotOptions = {}
                             }: {
  recordMap: ExtendedRecordMap
  contentBlockIds?: string[]
  gotOptions?: OptionsOfJSONResponseBody
}) => {
  recordMap.signed_urls = {}

  if (!contentBlockIds) {
    contentBlockIds = getPageContentBlockIds(recordMap)
  }

  const allFileInstances = contentBlockIds.flatMap((blockId) => {
    const block = recordMap.block[blockId]?.value

    if (
      block &&
      (block.type === 'pdf' ||
        block.type === 'audio' ||
        (block.type === 'image' && block.file_ids?.length) ||
        block.type === 'video' ||
        block.type === 'file' ||
        block.type === 'page')
    ) {
      const source =
        block.type === 'page'
          ? block.format?.page_cover
          : block.properties?.source?.[0]?.[0]
      // console.log(block, source)

      if (source) {
        if (source.indexOf('youtube') >= 0 || source.indexOf('vimeo') >= 0) {
          return []
        }

        return {
          permissionRecord: {
            table: 'block',
            id: block.id
          },
          url: source
        }
      }
    }

    return []
  })

  if (allFileInstances.length > 0) {
    try {
      const { signedUrls } = await getSignedFileUrls(
        allFileInstances,
        gotOptions
      )

      if (signedUrls.length === allFileInstances.length) {
        for (let i = 0; i < allFileInstances.length; ++i) {
          const file = allFileInstances[i]
          const signedUrl = signedUrls[i]

          recordMap.signed_urls[file.permissionRecord.id] = signedUrl
        }
      }
    } catch (err) {
      console.warn('NotionAPI getSignedfileUrls error', err)
    }
  }
}

const getBlocks = async (
  blockIds: string[],
  gotOptions?: OptionsOfJSONResponseBody
) => {
  // TODO: add Backend api
  return fetch(api.getBlocks, {
    method: 'GET',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      requests: blockIds.map((blockId) => ({
        // TODO: when to use table 'space' vs 'block'?
        table: 'block',
        id: blockId,
        version: -1
      }))
    })
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

const getSignedFileUrls = async (
  urls: SignedUrlRequest[],
  gotOptions?: OptionsOfJSONResponseBody
) => {
  // TODO: add Backend api
  return fetch(api.getSignedFileUrls, {
    method: 'GET',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      urls
    })
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

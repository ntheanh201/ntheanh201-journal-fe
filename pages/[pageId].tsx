import * as React from 'react'
import { GetStaticProps } from 'next'
import { isDev, domain } from 'lib/config'
import { PageProps, Params } from 'lib/types'
import { NotionPage } from 'components'
import { resolveJournalPage } from '../lib/journal/resolve-journal-page'

export const getStaticProps: GetStaticProps<PageProps, Params> = async (
  context
) => {
  const rawPageId = context.params.pageId as string

  try {
    const props = await resolveJournalPage(domain, rawPageId)

    if (!props) {
      return {
        notFound: true
      }
    }

    return { props }
  } catch (err) {
    console.error('page error', domain, rawPageId, err)

    // we don't want to publish the error version of this page, so
    // let next.js know explicitly that incremental SSG failed
    throw err
  }
}

export async function getStaticPaths() {
  if (isDev) {
    return {
      paths: [],
      fallback: true
    }
  }

  return {
    paths: [],
    fallback: true
  }
  // const siteMap = await getSiteMap()
  //
  // const staticPaths = {
  //   paths: Object.keys(siteMap.canonicalPageMap).map((pageId) => ({
  //     params: {
  //       pageId
  //     }
  //   })),
  //   // paths: [],
  //   fallback: true
  // }
  //
  // console.log(staticPaths.paths)
  // return staticPaths
}

export default function NotionDomainDynamicPage(props) {
  // return <NotionPage {...props} />
  console.log(props)
  return <div>Post</div>
}

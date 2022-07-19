import * as React from 'react'
import { domain } from 'lib/config'
import { resolveJournalPage } from 'lib/journal/resolve-journal-page'

export const getStaticProps = async () => {
  try {
    const props = await resolveJournalPage(domain)

    return { props, revalidate: 10 }
  } catch (err) {
    console.error('page error', domain, err)

    // we don't want to publish the error version of this page, so
    // let next.js know explicitly that incremental SSG failed
    throw err
  }
}

export default function NotionDomainPage(props) {
  console.log('props: ', props)
  return (
    <div id='content'>
      <p>Nguyen The Anh</p>
      <ul>
        <li>Why VSCode</li>
      </ul>
    </div>
  )
}

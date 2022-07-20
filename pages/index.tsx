import * as React from 'react'
import { domain } from 'lib/config'
import { resolveJournalPages } from 'lib/journal/resolve-journal-page'

export const getStaticProps = async () => {
  try {
    const props = await resolveJournalPages()

    return { props }
  } catch (err) {
    console.error('page error', domain, err)
    throw err
  }
}

export default function NotionDomainPage(props) {
  return (
    <div id='content'>
      <p>
        This is the site of <b>The Anh Nguyen</b>, software engineer, passionate
        about devops/cloud.
      </p>
      <p className='name-header'>
        <a href='https://github.com/ntheanh201'>Github</a> -{' '}
        <a href='https://facebook.com/ntheanh201'>Facebook</a>
      </p>
      <ul className='index'>
        {props?.pages?.results?.map(({ id, properties }) => (
          <li key={id}>
            <span className='index-date'>
              {properties.type.select?.name === 'Page'
                ? '∞'
                : properties.date.date?.start}
            </span>
            <a href={properties.slug.rich_text[0]?.plain_text}>
              {properties.title.title[0]?.plain_text}
            </a>
          </li>
        ))}
      </ul>
      <p>
        Inspired by{' '}
        <a className='twitter-footer-link' href='https://markmcgranaghan.com/'>
          @mmcgrana
        </a>
        .
      </p>
    </div>
  )
}

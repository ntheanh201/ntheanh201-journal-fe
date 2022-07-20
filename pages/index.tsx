import * as React from 'react'
import { domain } from 'lib/config'
import Link from 'next/link'
import { resolveJournalPages } from 'lib/journal/resolve-journal-page'
import * as config from '../lib/config'
import { PageHead } from '../components/PageHead'

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
    <>
      <PageHead title={config.author} />
      <div id='content'>
        <p>
          This is the site of <b>The Anh Nguyen</b>, software engineer, passionate
          about devops/cloud.
        </p>
        <p className=''>
          <a
            href={`https://github.com/${config.github}`}
            title={`GitHub @${config.github}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            GitHub
          </a>
          {' '}-{' '}
          <a
            href={`https://facebook.com/${config.facebook}`}
            title={`Facebook @${config.facebook}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            Facebook
          </a>
          {' '}-{' '}
          <a
            href={`https://linkedin.com/in/${config.linkedin}`}
            title={`LinkedIn @${config.linkedin}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            LinkedIn
          </a>
        </p>
        <ul className='index'>
          {props?.pages?.results?.map(({ id, properties }) => (
            <li key={id}>
            <span className='index-date'>
              {properties.type.select?.name === 'Page'
                ? '∞'
                : properties.date.date?.start}
            </span>
              <Link href={properties.slug.rich_text[0]?.plain_text}>
                {properties.title.title[0]?.plain_text}
              </Link>
            </li>
          ))}
        </ul>
        <p>
          Inspired by{' '}
          <a className='twitter-footer-link'
             href='https://markmcgranaghan.com/'
             target='_blank'
             rel='noopener noreferrer'>
            @mmcgrana
          </a>
          .
        </p>
      </div>
    </>
  )
}

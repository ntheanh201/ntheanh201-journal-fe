import { OptionsOfJSONResponseBody } from 'got/dist/source/types'
import { CollectionViewType } from 'notion-types'
import { api } from '../config'

const _userTimeZone = 'Asia/Ho_Chi_Minh'

export const getCollectionData = (
  collectionId: string,
  collectionViewId: string,
  collectionView: any,
  {
    limit = 9999,
    searchQuery = '',
    userTimeZone = _userTimeZone,
    loadContentCover = true,
    gotOptions
  }: {
    type?: CollectionViewType
    limit?: number
    searchQuery?: string
    userTimeZone?: string
    userLocale?: string
    loadContentCover?: boolean
    gotOptions?: OptionsOfJSONResponseBody
  } = {}
) => {
  const type = collectionView?.type
  const isBoardType = type === 'board'
  const groupBy =
    collectionView?.format?.board_columns_by ||
    collectionView?.format?.collection_group_by

  let loader: any = {
    type: 'reducer',
    reducers: {
      collection_group_results: {
        type: 'results',
        limit,
        loadContentCover
      }
    },
    sort: [],
    ...collectionView?.query2,
    searchQuery,
    userTimeZone
  }

  if (groupBy) {
    const groups =
      collectionView?.format?.board_columns ||
      collectionView?.format?.collection_groups ||
      []
    const iterators = [isBoardType ? 'board' : 'group_aggregation', 'results']
    const operators = {
      checkbox: 'checkbox_is',
      url: 'string_starts_with',
      text: 'string_starts_with',
      select: 'enum_is',
      multi_select: 'enum_contains',
      created_time: 'date_is_within',
      ['undefined']: 'is_empty'
    }

    const reducersQuery = {}
    for (const group of groups) {
      const {
        property,
        value: { value, type }
      } = group

      for (const iterator of iterators) {
        const iteratorProps =
          iterator === 'results'
            ? {
              type: iterator,
              limit
            }
            : {
              type: 'aggregation',
              aggregation: {
                aggregator: 'count'
              }
            }

        const isUncategorizedValue = typeof value === 'undefined'
        const isDateValue = value?.range
        // TODO: review dates reducers
        const queryLabel = isUncategorizedValue
          ? 'uncategorized'
          : isDateValue
            ? value.range?.start_date || value.range?.end_date
            : value?.value || value

        const queryValue =
          !isUncategorizedValue && (isDateValue || value?.value || value)

        reducersQuery[`${iterator}:${type}:${queryLabel}`] = {
          ...iteratorProps,
          filter: {
            operator: 'and',
            filters: [
              {
                property,
                filter: {
                  operator: !isUncategorizedValue
                    ? operators[type]
                    : 'is_empty',
                  ...(!isUncategorizedValue && {
                    value: {
                      type: 'exact',
                      value: queryValue
                    }
                  })
                }
              }
            ]
          }
        }
      }
    }

    //TODO: started working on the filters. This doens't seem to quite work yet.
    // let filters = collectionView.format?.property_filters.map(filterObj => {
    //   console.log('map filter', filterObj)
    //   //get the inner filter
    //   return {
    //     filter: filterObj.filter.filter,
    //     property: filterObj.filter.property
    //   }
    // })

    const reducerLabel = isBoardType ? 'board_columns' : `${type}_groups`
    loader = {
      type: 'reducer',
      reducers: {
        [reducerLabel]: {
          type: 'groups',
          groupBy,
          ...(collectionView?.query2?.filter && {
            filter: collectionView?.query2?.filter
          }),
          groupSortPreference: groups.map((group) => group?.value),
          limit
        },
        ...reducersQuery
      },
      ...collectionView?.query2,
      searchQuery,
      userTimeZone
      //TODO: add filters here
      // filter: {
      //   filters: filters,
      //   operator: 'and'
      // }
    }
  }

  // if (isBoardType) {
  //   console.log(
  //     JSON.stringify(
  //       {
  //         collectionId,
  //         collectionViewId,
  //         loader,
  //         groupBy: groupBy || 'NONE',
  //         collectionViewQuery: collectionView.query2 || 'NONE'
  //       },
  //       null,
  //       2
  //     )
  //   )
  // }

  // TODO: add Backend api
  return fetch(api.queryCollection, {
    method: 'GET',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      collection: {
        id: collectionId
      },
      collectionView: {
        id: collectionViewId
      },
      loader
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

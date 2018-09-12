import { propertyIsDefined } from '@sourcegraph/codeintellify/lib/helpers'
import { Observable, of } from 'rxjs'
import { filter, map, switchMap } from 'rxjs/operators'

import { CodeHost, ResolvedCodeView } from './code_intelligence'

export const findCodeViews = () => (codeHosts: Observable<CodeHost>): Observable<ResolvedCodeView> => {
    const codeViewsFromList: Observable<ResolvedCodeView> = codeHosts.pipe(
        filter(propertyIsDefined('codeViews')),
        switchMap(({ codeViews }) =>
            of(...codeViews).pipe(
                map(({ selector, ...info }) => ({
                    info,
                    matches: document.querySelectorAll<HTMLElement>(selector),
                }))
            )
        ),
        switchMap(({ info, matches }) =>
            of(...matches).pipe(
                map(codeView => ({
                    ...info,
                    codeView,
                }))
            )
        )
    )

    const codeViewsFromResolver: Observable<ResolvedCodeView> = codeHosts.pipe(
        filter(propertyIsDefined('codeViewResolver')),
        map(({ codeViewResolver: { selector, resolveCodeView } }) => ({
            resolveCodeView,
            matches: document.querySelectorAll<HTMLElement>(selector),
        })),
        switchMap(({ resolveCodeView, matches }) =>
            of(...matches).pipe(
                map(codeView => ({
                    ...resolveCodeView(codeView),
                    codeView,
                }))
            )
        )
    )

    // const codeViewsFromResolver = new Observable<ResolvedCodeView>(observer => {
    // if (!codeHost.codeViewResolver) {
    // return
    // }
    //
    // const elements = document.querySelectorAll<HTMLElement>(codeHost.codeViewResolver.selector)
    // for (const elem of elements) {
    // const info = codeHost.codeViewResolver.resolveCodeView(elem)
    //
    // observer.next({ ...info, codeView: elem })
    // }
    // })
    //
    // const possibleLazyLoadedCodeViews = new Subject<HTMLElement>()
    //
    // const mutationObserver = new MutationObserver(mutations => {
    // for (const mutation of mutations) {
    // console.log('mut', mutation)
    // for (const node of mutation.addedNodes) {
    // if (!naiveCheckIsHTMLElement(node)) {
    // return
    // }
    //
    // possibleLazyLoadedCodeViews.next(node)
    // }
    // }
    // })
    //
    // mutationObserver.observe(document.body, {
    // // childList: true,
    // subtree: true,
    // attributes: false,
    // characterData: false,
    // })
    //
    // const lazilyLoadedCodeViewsFromCodeViewsList: Observable<ResolvedCodeView> = possibleLazyLoadedCodeViews.pipe(
    // filter(() => !!codeHost.codeViews),
    // map(elem => ({ codeView: elem, info: codeHost.codeViews!.find(({ selector }) => elem.matches(selector)) })),
    // filter(propertyIsDefined('info')),
    // map(({ codeView, info }) => ({ ...info, codeView }))
    // )
    //
    // const lazilyLoadedCodeViewsFromResolver: Observable<ResolvedCodeView> = possibleLazyLoadedCodeViews.pipe(
    // filter(() => !!codeHost.codeViewResolver),
    // map(elem => ({ codeView: elem, info: codeHost.codeViews!.find(({ selector }) => elem.matches(selector)) })),
    // filter(propertyIsDefined('info')),
    // map(({ codeView, info }) => ({ ...info, codeView }))
    // )
    //
    // const lazilyLoadedCodeViews = merge(lazilyLoadedCodeViewsFromCodeViewsList, lazilyLoadedCodeViewsFromResolver).pipe(
    // switchMap(
    // ({ codeView, ...rest }) =>
    // new Observable<ResolvedCodeView>(observer => {
    // const intersectionObserver = new IntersectionObserver(
    // entries => {
    // for (const entry of entries) {
    // // `entry` is an `IntersectionObserverEntry`,
    // // which has
    // // [isIntersecting](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserverEntry/isIntersecting#Browser_compatibility)
    // // as a prop, but TS complains that it does not
    // // exist.
    // console.log('hello', entry)
    // if ((entry as any).isIntersecting) {
    // observer.next({ codeView, ...rest })
    // }
    // }
    // },
    // {
    // rootMargin: '200px',
    // threshold: 0,
    // }
    // )
    // intersectionObserver.observe(codeView)
    // })
    // )
    // )

    // return merge(codeViewsFromList, codeViewsFromResolver, lazilyLoadedCodeViews).pipe(
    // filter(({ codeView }) => !codeView.classList.contains('sg-mounted'))
    // )
    //
    return merge(codeViewsFromList, codeViewsFromResolver).pipe(
        filter(({ codeView }) => !codeView.classList.contains('sg-mounted'))
    )
}

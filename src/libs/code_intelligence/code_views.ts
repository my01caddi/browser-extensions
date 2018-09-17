import { propertyIsDefined } from '@sourcegraph/codeintellify/lib/helpers'
import { from, merge, Observable, of, Subject } from 'rxjs'
import { filter, map, mergeMap } from 'rxjs/operators'

import { CodeHost, ResolvedCodeView } from './code_intelligence'

/**
 * Cast a Node to an HTMLElement if it has a classList. This should not be used
 * if you need 100% confidence the Node is an HTMLElement.
 */
function naiveCheckIsHTMLElement(node: Node): node is HTMLElement {
    return !!(node as any).classList
}

export const findCodeViews = (codeHost: CodeHost) => {
    const codeViewsFromList: Observable<ResolvedCodeView> = of(codeHost).pipe(
        filter(propertyIsDefined('codeViews')),
        mergeMap(({ codeViews }) =>
            of(...codeViews).pipe(
                map(({ selector, ...info }) => ({
                    info,
                    matches: document.querySelectorAll<HTMLElement>(selector),
                }))
            )
        ),
        mergeMap(({ info, matches }) =>
            of(...matches).pipe(
                map(codeView => ({
                    ...info,
                    codeView,
                }))
            )
        )
    )

    const codeViewsFromResolver: Observable<ResolvedCodeView> = of(codeHost).pipe(
        filter(propertyIsDefined('codeViewResolver')),
        map(({ codeViewResolver: { selector, resolveCodeView } }) => ({
            resolveCodeView,
            matches: document.querySelectorAll<HTMLElement>(selector),
        })),
        mergeMap(({ resolveCodeView, matches }) =>
            of(...matches).pipe(
                map(codeView => ({
                    ...resolveCodeView(codeView),
                    codeView,
                }))
            )
        )
    )

    const possibleLazilyLoadedContainers = new Subject<HTMLElement>()

    const mutationObserver = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && naiveCheckIsHTMLElement(mutation.target)) {
                const { target } = mutation

                possibleLazilyLoadedContainers.next(target)
            }
        }
    })

    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
    })

    const lazilyLoadedCodeViewsFromCodeViewsList: Observable<ResolvedCodeView> = possibleLazilyLoadedContainers.pipe(
        filter(() => !!codeHost.codeViews),
        map(container =>
            codeHost.codeViews!.map(({ selector, ...info }) => ({
                info,
                matches: container.querySelectorAll<HTMLElement>(selector),
            }))
        ),
        mergeMap(codeViews => from(codeViews)),
        mergeMap(({ matches, info }) => from(matches).pipe(map(codeView => ({ codeView, ...info }))))
    )

    const lazilyLoadedCodeViewsFromResolver: Observable<ResolvedCodeView> = possibleLazilyLoadedContainers.pipe(
        filter(() => !!codeHost.codeViewResolver),
        map(container => container.querySelectorAll<HTMLElement>(codeHost.codeViewResolver!.selector)),
        mergeMap(matches =>
            of(...matches).pipe(
                map(codeView => ({ codeView, info: codeHost.codeViewResolver!.resolveCodeView(codeView) }))
            )
        ),
        filter(propertyIsDefined('info')),
        map(({ codeView, info }) => ({ ...info, codeView }))
    )

    const lazilyLoadedCodeViews = merge(lazilyLoadedCodeViewsFromCodeViewsList, lazilyLoadedCodeViewsFromResolver).pipe(
        mergeMap(
            ({ codeView, ...rest }) =>
                new Observable<ResolvedCodeView>(observer => {
                    const intersectionObserver = new IntersectionObserver(
                        entries => {
                            for (const entry of entries) {
                                // `entry` is an `IntersectionObserverEntry`,
                                // which has
                                // [isIntersecting](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserverEntry/isIntersecting#Browser_compatibility)
                                // as a prop, but TS complains that it does not
                                // exist.
                                if ((entry as any).isIntersecting) {
                                    observer.next({ codeView, ...rest })
                                }
                            }
                        },
                        {
                            rootMargin: '200px',
                            threshold: 0,
                        }
                    )
                    intersectionObserver.observe(codeView)
                })
        )
    )

    return merge(codeViewsFromList, codeViewsFromResolver, lazilyLoadedCodeViews).pipe(
        filter(({ codeView }) => !codeView.classList.contains('sg-mounted'))
    )
}

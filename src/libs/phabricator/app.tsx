import { featureFlags } from '../../shared/util/featureFlags'
import { injectCodeIntelligence } from '../code_intelligence'
import { phabCodeViews } from './code_views'
import { injectPhabricatorBlobAnnotators } from './inject_old'
import { expanderListen, javelinPierce, metaClickOverride, setupPageLoadListener } from './util'

// This is injection for the chrome extension.
export function injectPhabricatorApplication(): void {
    // make sure this is called before javelinPierce
    const inject = () => {
        javelinPierce(expanderListen, 'body')
        javelinPierce(metaClickOverride, 'body')

        injectModules()
    }

    if (document.readyState === 'complete') {
        injectModules()
    } else {
        document.addEventListener('phabPageLoaded', inject)
        javelinPierce(setupPageLoadListener, 'body')
    }
}

function injectModules(): void {
    featureFlags
        .isEnabled('newTooltips')
        .then(enabled => {
            if (enabled) {
                injectCodeIntelligence({ codeViews: phabCodeViews, name: 'phabricator' })
                return
            }

            injectPhabricatorBlobAnnotators().catch(e => console.error(e))
        })
        .catch(err => console.error('could not get feature flag', err))
}

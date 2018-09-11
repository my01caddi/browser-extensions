import { CodeHost, CodeViewResolver, CodeViewWithOutSelector } from '../code_intelligence'
import { diffDomFunctions } from './dom_functions'
import { resolveDiffFileInfo } from './file_info'
import { createCodeViewToolbarMount, parseURL } from './util'

const toolbarButtonProps = {
    className: 'btn btn-sm tooltipped tooltipped-n',
    style: { marginRight: '5px', textDecoration: 'none', color: 'inherit' },
}

const diffCodeView: CodeViewWithOutSelector = {
    dom: diffDomFunctions,
    getToolbarMount: createCodeViewToolbarMount,
    resolveFileInfo: resolveDiffFileInfo,
    toolbarButtonProps,
}

const resolveCodeView = (elem: HTMLElement) => {
    const files = document.getElementsByClassName('file')
    const { filePath } = parseURL()
    const isSingleCodeFile = files.length === 1 && filePath && document.getElementsByClassName('diff-view').length === 0

    return isSingleCodeFile ? diffCodeView : diffCodeView
}

const codeViewResolver: CodeViewResolver = {
    selector: '.file',
    resolveCodeView,
}

function checkIsGithub(): boolean {
    const href = window.location.href

    const isGithub = /^https?:\/\/(www.)?github.com/.test(href)
    const ogSiteName = document.head.querySelector(`meta[property='og:site_name']`) as HTMLMetaElement
    const isGitHubEnterprise = ogSiteName ? ogSiteName.content === 'GitHub Enterprise' : false

    return isGithub || isGitHubEnterprise
}

export const githubCodeHost: CodeHost = {
    name: 'github',
    codeViewResolver,
    check: checkIsGithub,
}

import { Observable, of, zip } from 'rxjs'
import { map, switchMap } from 'rxjs/operators'
import { resolveRev, retryWhenCloneInProgressError } from '../../shared/repo/backend'
import { FileInfo } from '../code_intelligence'
import { getDeltaFileName, getDiffResolvedRev, parseURL } from './util'

export const resolveDiffFileInfo = (codeView: HTMLElement): Observable<FileInfo> =>
    of(codeView).pipe(
        map(codeView => {
            const { repoPath } = parseURL()

            return { codeView, repoPath }
        }),
        map(({ codeView, ...rest }) => {
            const { headFilePath, baseFilePath } = getDeltaFileName(codeView)
            if (!headFilePath) {
                throw new Error('cannot determine file path')
            }

            return { ...rest, codeView, headFilePath, baseFilePath }
        }),
        map(({ codeView, ...rest }) => {
            const diffResolvedRev = getDiffResolvedRev()
            if (!diffResolvedRev) {
                throw new Error('cannot determine delta info')
            }

            return {
                codeView,
                headRev: diffResolvedRev.headCommitID,
                baseRev: diffResolvedRev.baseCommitID,
                ...rest,
            }
        }),
        switchMap(({ repoPath, headRev, baseRev, ...rest }) => {
            const resolvingHeadRev = resolveRev({ repoPath, rev: headRev }).pipe(retryWhenCloneInProgressError())
            const resolvingBaseRev = resolveRev({ repoPath, rev: baseRev }).pipe(retryWhenCloneInProgressError())

            return zip(resolvingHeadRev, resolvingBaseRev).pipe(
                map(([headCommitID, baseCommitID]) => ({
                    repoPath,
                    headRev,
                    baseRev,
                    headCommitID,
                    baseCommitID,
                    ...rest,
                }))
            )
        }),
        map(info => {
            console.log('TODO: determine if files have contents', info)

            return {
                repoPath: info.repoPath,
                filePath: info.headFilePath,
                commitID: info.headCommitID,
                rev: info.headRev,

                baseRepoPath: info.repoPath,
                baseFilePath: info.baseFilePath || info.headFilePath,
                baseCommitID: info.baseCommitID,
                baseRev: info.baseRev,

                headHasFileContents: true,
                baseHasFileContents: true,
            }
        })
    )

const core = require('@actions/core')
const fs = require('fs')
const semver = require('semver')
const git = require('./helpers/git')

const { GITHUB_REF } = process.env
const currentBranch = GITHUB_REF.replace('refs/heads/', '')

async function run() {
  try {
    const versionFile = core.getInput('version-file')
    const inputBranch = core.getInput('branch')
    const inputDefaultVersion = core.getInput('default-version')
    const bump = core.getInput('bump')
    const isPreBump = /pre(major|minor|patch|release)/.test(bump)
    const prereleaseText = core.getInput('prerelease-text')
    const buildNumber = core.getInput('build-number')

    let useBranch = inputBranch
    if (!useBranch) {
      useBranch = currentBranch
    }
    const branch = useBranch

    core.info(`Using '${versionFile}' as the version file`)
    core.info(`Using '${branch}' as the branch`)

    let useDefaultVersion = semver.clean(inputDefaultVersion)
    if (!useDefaultVersion) {
      core.setFailed(`Provided default version is not in a valid format: ${inputDefaultVersion}`)
    }
    const defaultVersion = useDefaultVersion
    core.info(`Using '${defaultVersion}' as the default version`)

    if (isPreBump && prereleaseText) {
      core.info(`Using '${prereleaseText}' as the pre-release text`)
    }
    if (buildNumber) {
      core.info(`Using '${buildNumber}' as the build number`)
    }

    core.info('===================')

    core.info('Fetching all tags from the repo...')
    await git.fetchTags()

    core.info('Getting release version from tags...')
    let releasedVersion = ''

    try {
      let latestTag = await git.describeTags(branch)
      releasedVersion = semver.clean(latestTag)
    } catch (e) {
      core.warning('Unable to get the released version from tags!')
    }

    core.info(`Getting current version from '${versionFile}'...`)
    let noCurrentVersion = true
    let noCurrentVersionReason = ''

    let currentVersion = ''

    if (fs.existsSync(versionFile)) {
      let dirtyVersion = fs.readFileSync(versionFile, 'utf8')

      let currentVersionObj = semver.parse(dirtyVersion)

      if (currentVersionObj) {
        core.info(`Found the current version '${currentVersionObj.raw}'`)

        let buildString = currentVersionObj.build.join('.')

        if (buildString) {
          buildString = '+' + buildString
        }

        currentVersion = currentVersionObj.version + buildString
        noCurrentVersion = false
      } else {
        noCurrentVersionReason = 'Unable to obtain valid semver version from version file.'
      }
    } else {
      noCurrentVersionReason = `Unable to find file '${versionFile}.'`
    }

    if (noCurrentVersion) {
      core.warning(`${noCurrentVersionReason} Using the default version '${defaultVersion}'`)

      currentVersion = defaultVersion
    }

    // If currentVersion <= releasedVersion
    // Bump version using semver package: bump, prereleaseText (if applicable)
    // Append buildNumber
    let newVersion = `v${currentVersion}`
    let hasNewVersion = true

    core.info(`Comparing current version '${currentVersion}' to released version '${releasedVersion}'...`)
    if (!releasedVersion) {
      if (semver.gt(currentVersion, defaultVersion)) {
        hasNewVersion = false
      }
    } else {
      if (semver.lte(currentVersion, releasedVersion)) {
        newVersion = 'v' + semver.inc(releasedVersion, bump, prereleaseText)

        if (buildNumber) {
          newVersion += `+${buildNumber}`
        }
      } else {
        if (buildNumber) {
          let semverObj = semver.parse(currentVersion)

          if (semverObj.build.join('.') !== buildNumber) {
            core.info('Updating build number...')

            newVersion = 'v' + semverObj.version + `+${buildNumber}`
          } else {
            hasNewVersion = false
          }
        } else {
          hasNewVersion = false
        }
      }
    }

    if (hasNewVersion) {
      core.info(`New Version: ${newVersion}`)
    } else {
      core.info('There is no new version')
    }

    // Output new version number 
    core.setOutput('version', newVersion)
    core.setOutput('new-version', hasNewVersion)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
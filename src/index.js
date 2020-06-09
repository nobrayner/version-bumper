const core = require('@actions/core')
const exec = require('@actions/exec')
const fs = require('fs')
const semver = require('semver')

const { GITHUB_REPOSITORY, GITHUB_REF } = process.env
const currentBranch = GITHUB_REF.replace('refs/heads/', '')

async function run() {
  try {
    const githubToken = core.getInput('github-token', { required: true })
    core.setSecret(githubToken)

    const versionFile = core.getInput('version-file')
    const branch = core.getInput('branch')
    const defaultVersion = core.getInput('default-version')
    const bump = core.getInput('bump')
    const isPreBump = /pre(major|minor|patch|release)/.test(bump)
    const prereleaseText = core.getInput('prerelease-text')
    const buildNumber = core.getInput('build-number')

    
    core.info(`Using "${versionFile}" as the version file`)
    core.info(`Using "${branch}" as the production branch`)
    core.info(`Using "${defaultVersion}" as the default version`)
    core.info(`Using "${bump}" as bump`)

    if (isPreBump && prereleaseText) {
      core.info(`Using "${prereleaseText}" as the pre-release text`)
    }
    if (buildNumber) {
      core.info(`Using "${buildNumber}" as the build number`)
    }

    // Set up git config
    await gitConfig('user.name', 'Version Bumper')
    await gitConfig('user.email', 'version.bumper@github.com')

    // Set origin
    await git(`remote set-url origin https://x-access-token:${githubToken}@github.com/${GITHUB_REPOSITORY}.git`)

    // Get all tags
    await git(`checkout ${currentBranch}`)
    await git('fetch --all --tags')

    // Get latest version tag from prodBranch as 'releasedVersion'
    let latestTag = await git(`describe --tags --abbrev=0 ${branch}`)
    let releasedVersion = semver.clean(latestTag)

    if (!releasedVersion) {
      core.warning('Unable to find the latest release version. Using the default version')
      releasedVersion = defaultVersion
    }

    // Read version file, and semver.clean it as 'currentVersion'
    // If it doesn't exist, use defaultVersion
    let noCurrentVersion = true

    let currentVersion = ''

    if (fs.existsSync(versionFile)) {
      let dirtyVersion = fs.readFileSync(versionFile, 'utf8')

      let cleanVersion = semver.clean(dirtyVersion)

      if (cleanVersion) {
        currentVersion = cleanVersion
        noCurrentVersion = false
      }
    }

    if (noCurrentVersion) {
      core.warning('Unable to find the current version. Using the default version')
      currentVersion = defaultVersion
    }

    // If currentVersion <= releasedVersion
    // Bump version using semver package: bump, prereleaseText (if applicable)
    // Append buildNumber
    let newVersion = 'v'

    if (semver.lte(currentVersion, releasedVersion)) {
      newVersion += semver.inc(currentVersion, bump, prereleaseText)
      
      if (buildNumber) {
        newVersion += `+${buildNumber}`
      }

      core.info(`New Version: ${newVersion}`)

      // Write new version back to the version file
      fs.writeFileSync(versionFile, newVersion)

      // Commit the new version file back to 
      await git('add .')
      await git(`commit -m "Bump version to ${newVersion}"`)
      await git(`tag -a ${newVersion} -m "${newVersion}"`)
      await git(`push origin ${currentBranch} --follow-tags`)
    } else {
      core.info('The current version has already been manually bumped. There is no new version')
      newVersion = `v${currentVersion}`
    }

    // Output new version number 
    core.setOutput('version', newVersion)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()

function git(command) {
  return new Promise(async (resolve, reject) => {
    let output = ''
    let error = ''

    const options = {
      listeners: {
        stdout: (data) => {
          output += data.toString()
        },
        stderr: (data) => {
          error += data.toString()
        }
      }
    }

    try {
      await exec.exec(`git ${command}`, undefined, options)

      resolve(output)
    } catch (e) {
      reject(e)
    }
  })
}

function gitConfig(prop, value) {
  return git(`config ${prop} "${value}"`)
}
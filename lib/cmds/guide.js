import { join } from 'path'

import commandExists from 'command-exists'
import inquirer from 'inquirer'
import selectDirectory from 'inquirer-select-directory'
import bfj from 'bfj'

import { log, wrappedLog } from '../utils/log'
import { asciiText } from '../utils/text'
import { handleAsyncError as handle } from '../utils/async'

import loginStep from '../guide/step-login'
import seedStep from '../guide/step-seed'
import createSpaceStep from '../guide/step-create-space'
import setupStep from '../guide/step-setup'
import devServerStep from '../guide/step-dev-server'
import finishStep from '../guide/step-finish'

import { AbortedError, GUIDE_MAX_WIDTH } from '../guide/helpers'
import { errorStyle, pathStyle } from '../utils/styles'

inquirer.registerPrompt('directory', selectDirectory)

const guides = {
  'starter-nuxt-blog': {
    name: 'Nuxt Starter Blog',
    directoryName: 'contentful-nuxt-blog',
    repository: 'contentful/blog-in-5-minutes',
    seed: 'blog',
    setupConfig: async ({managementToken, deliveryToken, spaceId, installationDirectory}) => {
      const config = await bfj.read(join(installationDirectory, '.contentful.sample.json'))
      config.CTF_CDA_ACCESS_TOKEN = deliveryToken
      config.CTF_CMA_ACCESS_TOKEN = managementToken
      config.CTF_SPACE_ID = spaceId
      return bfj.write(join(installationDirectory, '.contentful.json'), config, {
        space: 2
      })
    },
    devExecutable: 'npm',
    devParameters: ['run', 'dev'],
    devURI: 'http://127.0.0.1:3000',
    devBrowserOpenRegex: /DONE/
  },
  'starter-gatsby-blog': {
    name: 'Gatsby Starter Blog',
    directoryName: 'contentful-gatsby-blog',
    repository: 'contentful/starter-gatsby-blog',
    seed: 'blog',
    setupConfig: async ({deliveryToken, spaceId, installationDirectory}) => {
      const config = await bfj.read(join(installationDirectory, '.contentful.json.sample'))
      config.spaceId = spaceId
      config.accessToken = deliveryToken
      return bfj.write(join(installationDirectory, '.contentful.json'), config, {
        space: 2
      })
    },
    devExecutable: 'npm',
    devParameters: ['run', 'dev'],
    devURI: 'http://127.0.0.1:8000',
    devBrowserOpenRegex: /You can now view .* in the browser./
  }
}

export const command = 'guide'

export const desc = 'A guide introducing basic concepts of working with Contentful'

export async function guide () {
  const guideContext = {
    stepCount: 0,
    activeGuide: guides['starter-gatsby-blog']
  }

  if (!commandExists.sync('node') || !commandExists.sync('npm')) {
    wrappedLog(`${errorStyle('Missing required tool:')} Please install nodejs.\n\nSee ${pathStyle('https://github.com/creationix/nvm')} or ${pathStyle('https://nodejs.org/en/download/')}`, GUIDE_MAX_WIDTH)
    process.exit(1)
  }

  log()
  log(asciiText('Contentful Guide'))

  // Enforce first steps to be executed
  try {
    // Step 1 - Login
    await loginStep(guideContext)

    // Step 2 - Create space
    await createSpaceStep(guideContext)

    // Step 3 - Seed Content
    await seedStep(guideContext)

    // Step 4 - Set up custom app
    await setupStep(guideContext)
  } catch (error) {
    if (error instanceof AbortedError) {
      log('The guide was aborted by the user')
      return
    }
    throw error
  }

  // Dev server step is optional
  try {
    // Step 5 - Run dev server
    await devServerStep(guideContext)
  } catch (error) {
    if (!(error instanceof AbortedError)) {
      throw error
    }
  }

  // Finished
  await finishStep(guideContext)
}

export const handler = handle(guide)

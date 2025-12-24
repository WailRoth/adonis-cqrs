/*
|--------------------------------------------------------------------------
| Configure hook
|--------------------------------------------------------------------------
|
| The configure hook is called when someone runs "node ace configure @wailroth/cqrs"
| command. You are free to perform any operations inside this function to
| configure the package.
|
| To make things easier, you have access to the underlying "ConfigureCommand"
| instance and you can use codemods to modify the source files.
|
*/

import ConfigureCommand from '@adonisjs/core/commands/configure'

export async function configure(command: ConfigureCommand) {
  const codemods = await command.createCodemods()

  // Register the CQRS provider and commands
  try {
    await codemods.updateRcFile((rcFile) => {
      rcFile.addProvider('@wailroth/cqrs').addCommand('@wailroth/cqrs/commands')
    })
  } catch (error) {
    command.logger.warning('Unable to update adonisrc.ts file')
    command.logger.fatal(error)
  }

  // Create the application directory structure for CQRS
  const { mkdir } = await import('node:fs/promises')
  const { join } = await import('node:path')
  const { fileURLToPath } = await import('node:url')

  const appRoot = fileURLToPath(command.app.appRoot)

  try {
    await mkdir(join(appRoot, 'app/application/commands'), { recursive: true })
    await mkdir(join(appRoot, 'app/application/queries'), { recursive: true })
    await mkdir(join(appRoot, 'app/application/handlers'), { recursive: true })
    command.logger.success('Created CQRS directory structure')
  } catch (error) {
    command.logger.warning('Unable to create CQRS directory structure')
    command.logger.fatal(error)
  }
}

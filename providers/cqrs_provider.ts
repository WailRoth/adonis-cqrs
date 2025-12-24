/**
 * CQRS provider for AdonisJS
 *
 * Exports the CQRSProvider which registers CommandBus and QueryBus
 * with the AdonisJS IoC container and auto-discovers handlers.
 */

export {
  default,
  registerCommandHandler,
  registerQueryHandler,
} from '../src/services/cqrs_provider.js'
export type { ApplicationService } from '@adonisjs/core/types'

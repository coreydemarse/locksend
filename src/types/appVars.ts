import { Application } from "express"
import { Logger } from "pino"

export default interface appVars {
	readonly app: Application
	readonly pino: Logger
}

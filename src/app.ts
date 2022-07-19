/* ****************************************************************************
 * app.ts
 *
 * written by Corey DeMarse
 * https://github.com/coreydemarse
 * ****************************************************************************/

/* ****************************************************************************
 * import modules
 * ****************************************************************************/

import dotenv from "dotenv"
import express, { Application } from "express"
import rateLimit from "express-rate-limit"
import helmet from "helmet"
import pino, { Logger } from "pino"
import { exit } from "process"
import requiredVars from "./requiredVars"
import fs from "fs"

/* ****************************************************************************
 * import API
 * ****************************************************************************/

import Contact from "./api/contact"

/* ****************************************************************************
 * App class
 * ****************************************************************************/

class App {
	// class properties
	readonly #app: Application = express()

	// app-wide default rate limit middleware
	readonly #rateLimit = rateLimit({
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: 150 // limit each IP to 150 requests per windowMs
	})

	// logging middleware
	readonly #pino: Logger = pino(
		pino.transport({
			targets: [
				{
					level: "info",
					target: "pino-pretty",
					options: { sync: false }
				},
				{
					level: "error",
					target: "pino/file",
					options: { destination: "./logs/error.log", sync: false }
				}
			]
		})
	)

	constructor() {
		// create empty log file if it doesn't exist
		try {
			fs.mkdirSync("./logs")
			fs.writeFileSync("./logs/error.log", "")
		} catch (e) {} // eslint-disable-line no-empty

		this.#pino.info({
			code: "SERVER_INIT_AWAIT",
			message: "INITIALIZING SERVER"
		})

		// dotenv
		dotenv.config()
		this.#checkEnvVars()

		// apply middleware
		this.#app.use(helmet())
		this.#app.use(express.json())
		this.#app.use(express.urlencoded({ extended: true }))

		this.#app.use(this.#rateLimit)

		/*
		this.#app.use(logger({
			logger: this.#pino,
			quietReqLogger: true
		}))
	*/

		// create appVars object
		const appVars = {
			app: this.#app,
			pino: this.#pino
		}

		// initialize APIs
		new Contact(appVars)

		try {
			this.#pino.info({
				code: "SERVER_START_AWAIT",
				message: `ATTEMPTING TO LISTEN ON PORT ${process.env.API_PORT}`
			})

			// start server
			this.#app.listen(parseInt(process.env.API_PORT))

			this.#pino.info({
				code: "SERVER_START_SUCCESS",
				message: `SERVER IS SUCCESSFULLY LISTENING ON PORT ${process.env.API_PORT}`
			})
		} catch (e) {
			this.#pino.fatal({
				code: "SERVER_FATAL_EXIT",
				message: "SERVER EXITED",
				error: e
			})

			exit()
		}

		this.#pino.info({
			code: "SERVER_INIT_SUCCESS",
			message: `SERVER INITIALIZATION SUCCESSFUL`,
			port: process.env.API_PORT
		})
	}

	// check for environment variables listed in requiredVars
	readonly #checkEnvVars = function () {
		for (let i = 0; i < requiredVars.length; i++) {
			if (!process.env[requiredVars[i]]) {
				this.#pino.error({
					code: "MISSING_ENV",
					message: `.env: Missing required environment variable: ${requiredVars[i]}`
				})

				this.#pino.fatal({
					code: "SERVER_FATAL_EXIT",
					message: "SERVER EXITED"
				})

				exit()
			}
		}

		// check optional environment variables
		if (process.env.CAPTCHA_ENABLED === "true" && !process.env.CAPTCHA_SECRET) {
			this.#pino.error({
				code: "MISSING_ENV",
				message: `.env: Missing required environment variable: CAPTCHA_SECRET`
			})

			this.#pino.fatal({
				code: "SERVER_FATAL_EXIT",
				message: "SERVER EXITED"
			})

			exit()
		}
	}
}

/*
 * 2 THE MOON 🚀 🚀
 */

new App()

/* ****************************************************************************
 * contact.ts
 *
 * written by Corey DeMarse
 * https://github.com/coreydemarse
 * ****************************************************************************/

/* ****************************************************************************
 * import modules
 * ****************************************************************************/
import { Application, Response } from "express"
import rateLimit, { RateLimitRequestHandler } from "express-rate-limit"
import { Logger } from "pino"
import * as validations from "../validations/contact"
import nodeMailer from "nodemailer"
import * as openpgp from "openpgp"
import fs from "fs"
import { exit } from "process"
import { verify } from "hcaptcha"
import { validationResult } from "express-validator"

interface TypedRequestBody<T> extends Express.Request {
	body: T
}

export default class Contact {
	#appVars: {
		app: Application
		pino: Logger
	}

	#publicKey: openpgp.Key
	readonly #transporter: nodeMailer.Transporter

	constructor(appVars: { app: Application; pino: Logger }) {
		this.#appVars = appVars

		// create nodemailer transporter
		try {
			this.#transporter = nodeMailer.createTransport({
				host: process.env.SMTP_HOST,
				port: parseFloat(process.env.SMTP_PORT),
				secure: true,
				auth: {
					user: process.env.SMTP_USER,
					pass: process.env.SMTP_PASS
				}
			})

			this.#transporter.verify(function (error) {
				if (error) {
					throw new Error(error.toString())
				}

				appVars.pino.info({
					code: "SERVER_SMTP_CONNECTED",
					message: "SMTP server connected"
				})
			})
		} catch (e) {
			this.#appVars.pino.error({
				code: "SERVER_NO_TRANSPORTER",
				message: "Failed to initialize SMTP transporter",
				error: e
			})
			this.#appVars.pino.fatal({
				code: "SERVER_FATAL_EXIT",
				message: "SERVER EXITED"
			})

			exit()
		}

		// load PGP public key
		try {
			const key = fs.readFileSync("./keys/publickey.asc", "utf8")

			openpgp.readKey({ armoredKey: key }).then((key) => {
				this.#publicKey = key
			})
		} catch (e) {
			this.#appVars.pino.error({
				code: "SERVER_NO_PUBLICKEY",
				message: "Error reading public key ('./publickey.asc')",
				error: e
			})
			this.#appVars.pino.fatal({
				code: "SERVER_FATAL_EXIT",
				message: "SERVER EXITED"
			})

			exit()
		}

		// initialize routes
		this.#routes()
	}

	// rate limit
	readonly #limit: RateLimitRequestHandler = rateLimit({
		windowMs: 5 * 60 * 1000, // 5 minutes
		max: 100
	})

	/* ****************************************************************************
	 * API routes
	 * ****************************************************************************/

	readonly #routes = () => {
		// apply rate limit
		this.#appVars.app.use("/send", this.#limit)

		// register routes
		this.#appVars.app.post("/send", validations.postSend, this.#postSend)
	}

	/* ****************************************************************************
	 * POST '/send'
	 * params:
	 * 	name:string,
	 * 	email:string,
	 * 	message:string
	 *   captcha:string (optional - only if hcaptcha is enabled)
	 * description: sends an email with an openpgp encrypted message to SMTP_RECIEVER in .env
	 * ****************************************************************************/

	readonly #postSend = async (
		req: TypedRequestBody<{
			name: string
			email: string
			message: string
			captcha?: string
		}>,
		res: Response
	) => {

		const myValidationResult = validationResult.withDefaults({
			formatter: error => {
			  return {
				msg: error.msg,
				param: error.param,
				location: error.location
			  };
			},
		  })

		const errors = validationResult(req)

		// catch all validation errors
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: myValidationResult(req).array() })
		}

		const name = req.body.name
		const email = req.body.email
		const message = req.body.message

		if (
			process.env.CAPTCHA_ENABLED === "true" &&
			process.env.CAPTCHA_SECRET.length > 0
		) {
			// verify captcha param if enabled
			if (req.body.captcha.length === 0) {
				res.status(400).json({ error: "validation error" })
				return
			}

			if (typeof req.body.captcha !== "string") {
				res.status(400).json({ error: "validation error" })
				return
			}

			let captchaSuccess = false

			this.#appVars.pino.info({
				code: "POST_VERIFY_CAPTCHA_AWAIT",
				message: "Attempting to verify Captcha..."
			})

			// verify captcha
			await verify(process.env.CAPTCHA_SECRET, req.body.captcha).then(
				(data) => {
					if (data.success === true) {
						captchaSuccess = true
					}
				}
			)

			this.#appVars.pino.info({
				code: "POST_VERIFY_CAPTCHA_FINISH",
				message: "Captcha Result: " + captchaSuccess
			})

			if (captchaSuccess === false) {
				res.status(400).json({ error: "failed to verify captcha" })
				return
			}
		}

		let encryptedMessage: string

		this.#appVars.pino.info({
			code: "POST_CONTACT_ENCRYPT_AWAIT",
			message: "Attempting to encrypt message"
		})

		try {
			// encrypt message
			encryptedMessage = (await openpgp.encrypt({
				message: await openpgp.createMessage({
					text:
						"FROM: " +
						name +
						"\n\nEMAIL ADDRESS: '" +
						email +
						"'\n\nMESSAGE:\n\n" +
						message
				}), // input as Message object
				encryptionKeys: this.#publicKey
			})) as string

			this.#appVars.pino.info({
				code: "POST_CONTACT_ENCRYPT_SUCCESS",
				message: "Successfully encrypted message"
			})
		} catch (e) {
			this.#appVars.pino.warn(e, {
				code: "POST_CONTACT_ENCRYPT_ERROR",
				message: "Error encrypting message"
			})

			res.status(418)
			return
		}

		this.#appVars.pino.info({
			code: "POST_CONTACT_EMAIL_AWAIT",
			message: "Attempting to send email..."
		})

		// send email
		try {
			await this.#transporter.sendMail({
				from: `${process.env.SITE_NAME} <${process.env.SMTP_SENDER}>`, // sender address
				to: process.env.SMTP_RECEIVERS, // list of receivers - comma separated string ("example@example1.com, example@example2.com")
				subject: `MESSAGE FROM ${process.env.SITE_NAME}`, // Subject line
				text: encryptedMessage // plain text body
			})

			this.#appVars.pino.info({
				code: "POST_CONTACT_EMAIL_SUCCESS",
				message: "Success sending email"
			})
		} catch (e) {
			this.#appVars.pino.warn(e, {
				code: "POST_CONTACT_EMAIL_ERROR",
				message: "Error sending email"
			})

			res.sendStatus(418)
			return
		}

		res.sendStatus(200)
	}
}

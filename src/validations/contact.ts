import { check, ValidationChain } from "express-validator"

export const postSend: ValidationChain[] = [
	//check existence
	check("name").not().isEmpty(),
	check("email").not().isEmpty(),
	check("message").not().isEmpty(),

	//check types
	check("name").isString(),
	check("email").isString(),
	check("message").isString(),

	// name
	check("name").isLength({ min: 1, max: 60 }),

	// email
	check("email").isEmail().normalizeEmail(),

	// message
	check("message").isLength({ min: 1, max: 1000 })
]

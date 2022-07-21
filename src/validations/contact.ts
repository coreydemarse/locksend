import { check, ValidationChain } from "express-validator"

export const postSend: ValidationChain[] = [
	//check existence
	check("name").not().isEmpty().withMessage("name is required"),
	check("email").not().isEmpty().withMessage("email is required"),
	check("message").not().isEmpty().withMessage("message is required"),

	//check types
	check("name").isString().withMessage("name must be a string"),
	check("email").isString().withMessage("email must be a string"),
	check("message").isString().withMessage("message must be a string"),

	// name
	check("name").isLength({ min: 1, max: 60 }).withMessage("name must be between 1 and 60 characters"),

	// email
	check("email").isEmail().normalizeEmail().withMessage("email must be a valid email address"),

	// message
	check("message").isLength({ min: 1, max: 1000 }).withMessage("message must be between 1 and 1000 characters"),
]

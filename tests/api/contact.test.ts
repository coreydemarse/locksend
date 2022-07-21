import request from "supertest" 
import { expect, describe, it } from "vitest"
import dotenv from "dotenv"
import * as testkeys from "../../testkeys.json"

dotenv.config()

const port = process.env.API_PORT as string

const supertest = request('http://localhost:' + port)

//todo: test for when captcha is enabled

describe("POST /send", () => {

    it ("should return a validation error with no data", async () => {
        const response = await supertest.post('/send')
        expect(response.status).toEqual(400)
        expect(response.body.error).toEqual('validation error')
    })

    it ("should return a validation error with missing name", async () => {
        const response = await supertest.post('/send').send({
            email: "example@example.com",
            message: "This is a test message"
        })

        expect(response.status).toEqual(400)
        expect(response.body.error).toEqual('validation error')
    })

    it("should return a validation error with missing email", async () => {
        const response = await supertest.post('/send').send({
            name: "John Doe",
            message: "This is a test message"
        })

        expect(response.status).toEqual(400)
        expect(response.body.error).toEqual('validation error')
    })

    it("should return a validation error with missing message", async () => {
        const response = await supertest.post('/send').send({
            name: "John Doe",
            email: "example@example.com"
        })

        expect(response.status).toEqual(400)
        expect(response.body.error).toEqual('validation error')
    })

    it("should return a validation error with a name too long", async () => {
        const response = await supertest.post('/send').send({
            name: "x".repeat(100), 
            email: "example@example.com",
            message: "This is a test message"
        })

        expect(response.status).toEqual(400)
        expect(response.body.error).toEqual('validation error')
    })

    it("should return a validation error with invalid email", async () => {
        const response = await supertest.post('/send').send({
            name: "example",
            email: "example",
            message: "This is a test message"
        })

        expect(response.status).toEqual(400)
        expect(response.body.error).toEqual('validation error')
    })

    it("should return a validation error with a message too long", async () => {
        const response = await supertest.post('/send').send({
            name: "example",
            email: "example@example.com",
            message: "x".repeat(1001)
        })

        expect(response.status).toEqual(400)
        expect(response.body.error).toEqual('validation error')
    })

    it("it should return a 200 if an email is successfully sent", async () => {
        const response = await supertest.post('/send').send({
            name: "example",
            email: "example@example.com",
            message: "This is a test message"
        })

        expect(response.status).toEqual(200)
    }, 20000)
})


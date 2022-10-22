import openpgp from 'openpgp'
import fs from 'fs'
import { GPG as gpg } from 'gpg-ts/dist/gpg'

export default class gpgUtils {

    #publicKey: any
    #publicKeys: Array<any>

    constructor() {
        this.#loadPublicKey()
        
        // for later: use multiple public keys
        //this.#loadPublicKeys()
    }

    // public encrypt function that uses gpgEncrypt or openpgpEncrypt based on environment variable USE_SYS_GPG
    async encrypt(text: string) {
        let msg: string = ""

        if (process.env.USE_SYS_GPG === 'true') {
            // use gpg from system
            msg = await this.#gpgEncrypt(text)
        } else {
            // use openpgp
            msg = await this.#openpgpEncrypt(text, this.#publicKey)
        }

        if (msg === "") {
            throw new Error('failed to encrypt message')
        }

        return msg
    }

    // loop through all public keys and encrypt message and return array of encrypted messages for each key and email address
    async encryptForAll(text: string) {
        let encryptedMessages = []

        for (const key of this.#publicKeys) {
            const msg = await this.encrypt(text)
            encryptedMessages.push({
                email: key.email,
                message: msg
            })
        }

        return encryptedMessages
    }

    // load public keys for gpg library or openpgp library based on environment variable USE_SYS_GPG from /keys folder. Each key is a seperate file named after the receivers email address
    async #loadPublicKeys() {
        let publicKeys = []

        if (process.env.USE_SYS_GPG !== 'true') {
            const keys = fs.readdirSync('./keys')

            for (const key of keys) {
                const keyFile = fs.readFileSync('./keys/' + key, 'utf8')
                publicKeys.push({
                    email: key,
                    key: await openpgp.readKey({ armoredKey: keyFile })
                })
            }
        }

        this.#publicKeys = publicKeys
    }

    // load public key for gpg library or openpgp library based on environment variable USE_SYS_GPG
    async #loadPublicKey() {
        if (process.env.USE_SYS_GPG !== 'true') {
            const key = fs.readFileSync('./keys/publickey.asc', 'utf8')
            this.#publicKey = await openpgp.readKey({ armoredKey: key })
        }
    }

    // encryption using gpg from system (better performance than openpgp)
    async #gpgEncrypt(text: string) {
            let encryptedMsg = ""
            let encryptError = false
            let encryptErrorMessage = ""

            gpg.encrypt(text, [], (err, msg, errorMessage) => {
                if (err) {
                    encryptError = true
                    encryptErrorMessage = errorMessage

                    return false
                }

                encryptedMsg = msg.toString()
            })

            if (encryptError) {
                // do pino logging
                return
            }

            return encryptedMsg
    }
    
    // encryption using openpgp (javascript pgp - works without system gpg installed)
    async #openpgpEncrypt(text: string, key: any) {
        const msg = await openpgp.encrypt({
            message: await openpgp.createMessage({
                text: text
            }), // input as Message object
            encryptionKeys: key
        })
        return msg
    }
}
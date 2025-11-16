import { customAlphabet } from 'nanoid'

const alphabet = '1234567890abcdefghijklmnopqrstuvwxyz'
const nanoid = customAlphabet(alphabet, 12)

export function createId(): string {
  return nanoid()
}

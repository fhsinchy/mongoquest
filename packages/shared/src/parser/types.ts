export type TokenType =
	| "IDENTIFIER"
	| "DOT"
	| "LPAREN"
	| "RPAREN"
	| "LBRACE"
	| "RBRACE"
	| "LBRACKET"
	| "RBRACKET"
	| "COLON"
	| "COMMA"
	| "STRING"
	| "NUMBER"
	| "BOOLEAN"
	| "NULL"
	| "EOF"

export interface Token {
	type: TokenType
	value: string
	position: number
}

export interface MongoshAST {
	collection: string
	method: string
	args: unknown[]
	chain: ChainedCall[]
}

export interface ChainedCall {
	method: string
	args: unknown[]
}

export class ParseError extends Error {
	constructor(
		message: string,
		public position: number,
		public input: string,
	) {
		super(message)
		this.name = "ParseError"
	}

	toUserMessage(): string {
		const line = this.input
		const pointer = " ".repeat(this.position) + "^"
		return `${this.message}\n\n  ${line}\n  ${pointer}`
	}
}
